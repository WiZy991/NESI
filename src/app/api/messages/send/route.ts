import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getChatKey, updateChatActivity } from '@/lib/chatActivity'
import { getUserFromRequest } from '@/lib/auth'
import { createNotificationWithSettings } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { validateFile } from '@/lib/fileValidation'
import { normalizeFileName, isValidFileName, sanitizeText, validateStringLength } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

// Функция для проверки, является ли сообщение голосовым
function isVoiceMessage(content: string | null | undefined): boolean {
	if (!content || typeof content !== 'string') return false
	try {
		// Пробуем распарсить как JSON
		let parsed
		try {
			parsed = JSON.parse(content)
		} catch {
			// Если не получилось, пробуем заменить экранированные кавычки
			const unescaped = content.replace(/&quot;/g, '"')
			parsed = JSON.parse(unescaped)
		}
		return (
			parsed &&
			parsed.type === 'voice' &&
			typeof parsed.duration === 'number' &&
			Array.isArray(parsed.waveform)
		)
	} catch {
		return false
	}
}

// Функция для декодирования HTML entities (серверная версия)
function decodeHtmlEntities(text: string): string {
	if (!text) return text
	return text
		.replace(/&quot;/g, '"')
		.replace(/&#x2F;/g, '/')
		.replace(/&#x2f;/g, '/')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&#x27;/g, "'")
}

// Функция для форматирования текста уведомления
function formatNotificationMessage(
	content: string | null | undefined,
	fileName: string | null | undefined
): string {
	if (!content && !fileName) return 'Новое сообщение'
	if (fileName) return `Файл: ${fileName}`
	if (!content) return 'Новое сообщение'
	
	// Проверяем, является ли сообщение голосовым
	if (isVoiceMessage(content)) {
		return '🎤 Голосовое сообщение'
	}
	
	// Декодируем HTML entities
	return decodeHtmlEntities(content)
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
	try {
		const me = await getUserFromRequest(req)
		if (!me) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Rate limiting для отправки сообщений
		const messageRateLimit = createUserRateLimit(rateLimitConfigs.messages)
		const rateLimitResult = await messageRateLimit(req)

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ error: 'Слишком много сообщений. Подождите немного.' },
				{
					status: 429,
					headers: {
						'Retry-After': Math.ceil(
							(rateLimitResult.resetTime - Date.now()) / 1000
						).toString(),
						'X-RateLimit-Limit': '10',
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
					},
				}
			)
		}

		const ct = req.headers.get('content-type') || ''
		let recipientId: string | undefined
		let content = ''

		let fileId: string | null = null
		let fileUrl: string | null = null
		let fileName: string | null = null
		let mimeType: string | null = null
		let size: number | null = null

		let replyToId: string | null = null

		if (ct.includes('multipart/form-data')) {
			const form = await req.formData()
			recipientId = form.get('recipientId')?.toString()
			content = form.get('content')?.toString() || ''
			replyToId = form.get('replyToId')?.toString() || null

			const blob = form.get('file') as File | null
			if (blob && blob.size > 0) {
				// Защита от path traversal
				const fileName = (blob as any).name || 'file'
				if (!isValidFileName(fileName)) {
					return NextResponse.json(
						{ error: 'Недопустимое имя файла' },
						{ status: 400 }
					)
				}

				// Нормализация имени файла
				const safeFileName = normalizeFileName(fileName)

				// Полная валидация файла (magic bytes, размер, тип)
				const validation = await validateFile(blob, true)
				if (!validation.valid) {
					return NextResponse.json(
						{ error: validation.error },
						{ status: 400 }
					)
				}

				const buf = Buffer.from(await blob.arrayBuffer())

				// Используем определенный MIME тип из сигнатуры
				const detectedMimeType = validation.detectedMimeType || blob.type

				// сохраняем файл в таблицу File
				const created = await prisma.file.create({
					data: {
						filename: safeFileName,
						mimetype: detectedMimeType,
						size: buf.length,
						data: buf,
					},
				})

				fileId = created.id // Сохраняем fileId для связи с сообщением
				fileUrl = `/api/files/${created.id}`
				fileName = created.filename
				mimeType = created.mimetype
				size = created.size
			}
		} else if (ct.includes('application/json')) {
			const body = await req.json().catch(() => null)
			recipientId = body?.recipientId
			// Убеждаемся, что content - это строка
			content = typeof body?.content === 'string' ? body.content : (body?.content ? String(body.content) : '')
			replyToId = body?.replyToId || null
			
			// Поддержка fileId для уже загруженных файлов
			if (body?.fileId) {
				const existingFile = await prisma.file.findUnique({
					where: { id: body.fileId },
				})
				if (existingFile) {
					fileId = existingFile.id // Сохраняем fileId для связи с сообщением
					fileUrl = `/api/files/${existingFile.id}`
					fileName = existingFile.filename
					mimeType = existingFile.mimetype
					size = existingFile.size
				}
			}
		} else {
			const body = await req.json().catch(() => null)
			if (body) {
				recipientId = body.recipientId
				content = body.content ?? ''
			} else {
				return NextResponse.json(
					{ error: 'Unsupported body or invalid format' },
					{ status: 400 }
				)
			}
		}

		if (!recipientId) {
			return NextResponse.json(
				{ error: 'recipientId обязателен' },
				{ status: 400 }
			)
		}

		// Валидация и санитизация контента
		// Если есть файл, content может быть пустой строкой - это нормально
		const maxContentLength = 10000 // 10KB
		
		// Проверяем только если content не пустой и не является строкой
		if (content && typeof content !== 'string') {
			return NextResponse.json(
				{ error: 'Сообщение должен быть строкой' },
				{ status: 400 }
			)
		}
		
		// Валидируем длину только если content не пустой (для файлов content может быть пустым)
		if (content && content.trim().length > 0) {
		const contentValidation = validateStringLength(content, maxContentLength, 'Сообщение')
		if (!contentValidation.valid) {
			return NextResponse.json(
				{ error: contentValidation.error },
				{ status: 400 }
			)
			}
		}

		// Санитизация контента (удаление потенциально опасного HTML)
		// Если content пустой (для файлов без подписи), просто используем пустую строку
		const sanitizedContent = content && content.trim().length > 0 ? sanitizeText(content) : ''

		// Валидация replyToId - если указан, проверяем что сообщение существует и принадлежит тому же диалогу
		if (replyToId) {
			try {
				const replyToMessage = await prisma.privateMessage.findUnique({
					where: { id: replyToId },
					select: { id: true, senderId: true, recipientId: true },
				})

				if (!replyToMessage) {
					return NextResponse.json(
						{ error: 'Сообщение для ответа не найдено' },
						{ status: 404 }
					)
				}

				// Проверяем, что сообщение принадлежит этому диалогу
				const isInDialog = 
					(replyToMessage.senderId === me.id && replyToMessage.recipientId === recipientId) ||
					(replyToMessage.senderId === recipientId && replyToMessage.recipientId === me.id)

				if (!isInDialog) {
					return NextResponse.json(
						{ error: 'Сообщение для ответа не принадлежит этому диалогу' },
						{ status: 400 }
					)
				}
			} catch (validationError: any) {
				console.error('❌ Ошибка валидации replyToId:', validationError)
				return NextResponse.json(
					{ error: 'Ошибка проверки сообщения для ответа', details: validationError.message },
					{ status: 500 }
				)
			}
		}

		// Создаем сообщение с безопасной обработкой replyToId
		let msg
		try {
			const messageData: any = {
				senderId: me.id,
				recipientId,
				content: sanitizedContent,
				fileUrl,
				fileName,
				mimeType,
				size,
			}

			// Добавляем fileId если файл был загружен
			if (fileId) {
				messageData.fileId = fileId
			}

			// Добавляем replyToId только если он валиден
			if (replyToId) {
				messageData.replyToId = replyToId
			}

			// Если Prisma Client не поддерживает replyToId, создаем без него и обновляем через SQL
			let messageCreated = false
			try {
				msg = await prisma.privateMessage.create({
					data: messageData as any,
			include: {
				sender: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarUrl: true,
					},
				},
				recipient: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarUrl: true,
					},
				},
				file: {
					select: {
						id: true,
						filename: true,
						mimetype: true,
					},
				},
				replyTo: {
					include: {
						sender: {
							select: {
								id: true,
								fullName: true,
								email: true,
							},
						},
					},
					},
				},
			})
			messageCreated = true
		} catch (prismaError: any) {
			// Если ошибка из-за Unknown argument replyToId, создаем без него и обновляем через SQL
			if (prismaError.message?.includes('Unknown argument') && prismaError.message?.includes('replyToId')) {
				console.warn('⚠️ Prisma Client не поддерживает replyToId, используем SQL обновление')
				
				// Создаем сообщение без replyToId
				const messageDataWithoutReply = { ...messageData }
				delete messageDataWithoutReply.replyToId
				
				msg = await prisma.privateMessage.create({
					data: messageDataWithoutReply as any,
					include: {
						sender: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
							},
						},
						recipient: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
							},
						},
						file: {
							select: {
								id: true,
								filename: true,
								mimetype: true,
							},
						},
					},
				})

				// Обновляем replyToId через SQL
				if (replyToId) {
					await prisma.$executeRawUnsafe(
						'UPDATE "PrivateMessage" SET "replyToId" = $1 WHERE id = $2',
						replyToId,
						msg.id
					)
					
					// Перезагружаем сообщение с replyTo
					msg = await prisma.privateMessage.findUnique({
						where: { id: msg.id },
						include: {
							sender: {
								select: {
									id: true,
									fullName: true,
									email: true,
									avatarUrl: true,
								},
							},
							recipient: {
								select: {
									id: true,
									fullName: true,
									email: true,
									avatarUrl: true,
								},
							},
							file: {
								select: {
									id: true,
									filename: true,
									mimetype: true,
								},
							},
							replyTo: {
								include: {
									sender: {
										select: {
											id: true,
											fullName: true,
											email: true,
										},
									},
								},
							},
						},
					}) as any
				}
				messageCreated = true
			} else {
				throw prismaError
			}
		}

		if (!messageCreated) {
			throw new Error('Не удалось создать сообщение')
		}
		} catch (createError: any) {
			console.error('❌ Ошибка создания приватного сообщения:', createError)
			
			// Если это ошибка Prisma о foreign key, даем более понятное сообщение
			if (createError.code === 'P2003' || createError.message?.includes('Foreign key constraint')) {
				return NextResponse.json(
					{ error: 'Ошибка при создании сообщения: неверная ссылка на сообщение для ответа' },
					{ status: 400 }
				)
			}

			return NextResponse.json(
				{ error: 'Ошибка создания сообщения', details: createError.message },
				{ status: 500 }
			)
		}

		// Преобразуем данные в нужный формат
		const result = {
			id: msg.id,
			content: msg.content,
			createdAt: msg.createdAt,
			editedAt: msg.editedAt,
			sender: msg.sender,
			fileId: msg.file?.id || null, // Добавляем fileId для корректного отображения
			fileUrl: msg.fileUrl || (msg.file ? `/api/files/${msg.file.id}` : null),
			fileName: msg.fileName || msg.file?.filename || null,
			fileMimetype: msg.mimeType || msg.file?.mimetype || null,
			replyTo: msg.replyTo ? {
				id: msg.replyTo.id,
				content: msg.replyTo.content,
				sender: msg.replyTo.sender,
			} : null,
			reactions: [],
		}

		const presenceNow = new Date()
		if (recipientId) {
			const normalizedChatId = getChatKey('private', {
				chatType: 'private',
				userA: me.id,
				userB: recipientId,
			})

			await updateChatActivity({
				chatType: 'private',
				chatId: normalizedChatId,
				userId: me.id,
				lastActivityAt: presenceNow,
				lastReadAt: presenceNow,
			})

			sendNotificationToUser(recipientId, {
				type: 'chatPresence',
				event: 'activity',
				userId: me.id,
				chatType: 'private',
				chatId: `private_${me.id}`,
				lastActivityAt: presenceNow.toISOString(),
				lastReadAt: presenceNow.toISOString(),
			})
		}

	console.log('🔔 Подготовка уведомления для получателя:', recipientId)
	
	// Создаем уведомление в базе данных
	const formattedContent = formatNotificationMessage(content, fileName || null)
	const notificationMessage = `${msg.sender.fullName || msg.sender.email}: ${formattedContent}`
	
	console.log('💾 Сохраняю уведомление в БД...')
	const dbNotification = await createNotificationWithSettings({
		userId: recipientId,
		message: notificationMessage,
		link: `/chats?open=${me.id}`,
		type: 'message',
	})
	
	// Если уведомление отключено в настройках, не отправляем SSE
	if (!dbNotification) {
		console.log('🔕 Уведомление отключено в настройках пользователя')
		return NextResponse.json(result, { status: 201 })
	}
	
	console.log('✅ Уведомление сохранено в БД, ID:', dbNotification.id)

	// Отправляем уведомление получателю в реальном времени
	const sseNotification = {
		id: dbNotification.id, // Включаем ID из БД для дедупликации
		type: 'message',
		title: 'Новое сообщение',
		message: formattedContent,
		sender: msg.sender.fullName || msg.sender.email,
		senderId: msg.sender.id,
		chatType: 'private',
		chatId: `private_${me.id}`,
		messageId: msg.id,
		hasFile: !!fileUrl,
		fileName: fileName,
		playSound: true, // Указываем, что нужно воспроизвести звук
		link: `/chats?open=${me.id}`,
	}
	
	console.log('📡 Отправка SSE уведомления:', sseNotification)
	const sent = sendNotificationToUser(recipientId, sseNotification)
	console.log('📨 Результат отправки SSE:', sent ? 'успешно' : 'ошибка')

	console.log('📨 Сообщение отправлено и уведомление разослано:', {
		senderId: me.id,
		recipientId,
		messageId: msg.id,
		sseSent: sent,
	})

		return NextResponse.json(result, { status: 201 })
	} catch (err) {
		console.error('🔥 Ошибка при отправке сообщения:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
