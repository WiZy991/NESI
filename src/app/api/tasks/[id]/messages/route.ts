// src/app/api/tasks/[id]/messages/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getChatKey, updateChatActivity } from '@/lib/chatActivity'
import { getUserFromRequest } from '@/lib/auth'
import { createNotificationWithSettings } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { validateFile } from '@/lib/fileValidation'
import { normalizeFileName, isValidFileName } from '@/lib/security'

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
		.replace(/&#x2F;/g, '/')
}

// Функция для форматирования текста уведомления
function formatNotificationMessage(
	content: string | null | undefined,
	fileName: string | null | undefined,
	isServerSide: boolean = true
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

// GET /api/tasks/[id]/messages
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: taskId } = await params

		if (!taskId) {
			return NextResponse.json({ error: 'taskId не передан' }, { status: 400 })
		}

		// Безопасный запрос с обработкой ошибок
		let messages
		try {
			messages = await prisma.message.findMany({
				where: { taskId },
				include: {
					sender: { select: { id: true, fullName: true, email: true, avatarUrl: true, xp: true } },
					file: { select: { id: true, filename: true, mimetype: true } },
					replyTo: {
						include: {
							sender: { select: { id: true, fullName: true, email: true, xp: true } },
						},
					},
					reactions: {
						include: {
							user: { select: { id: true, fullName: true, email: true } },
						},
					},
				},
				orderBy: { createdAt: 'asc' },
			})
		} catch (prismaError: any) {
			logger.error('Ошибка Prisma при получении сообщений', prismaError, { taskId })
			// Если ошибка связана с отсутствующими полями, делаем базовый запрос
			if (prismaError.message?.includes('replyTo') || prismaError.message?.includes('reactions') || prismaError.code === 'P2021') {
				logger.warn('Поля replyTo/reactions недоступны, используем базовый запрос', { taskId })
				messages = await prisma.message.findMany({
					where: { taskId },
					include: {
						sender: { select: { id: true, fullName: true, email: true, avatarUrl: true, xp: true } },
						file: { select: { id: true, filename: true, mimetype: true } },
					},
					orderBy: { createdAt: 'asc' },
				})
			} else {
				throw prismaError
			}
		}

	const result = messages.map((m: any) => {
		// Безопасная обработка replyTo - если сообщение удалено или не найдено, возвращаем null
		let replyToData = null
		if (m.replyTo && !m.replyTo.deletedAt) {
			replyToData = {
				id: m.replyTo.id,
				content: m.replyTo.content || '[Сообщение удалено]',
				sender: m.replyTo.sender,
			}
		}

		return {
			id: m.id,
			content: m.content,
			createdAt: m.createdAt,
			editedAt: m.editedAt,
			sender: m.sender,
			fileId: m.file?.id || null,
			fileName: m.file?.filename || null,
			fileMimetype: m.file?.mimetype || null,
			fileUrl: m.file ? `/api/files/${m.file.id}` : null, // 🔥 всегда отдаём url
			replyTo: replyToData,
			reactions: (m.reactions || []).map((r: any) => ({
				emoji: r.emoji,
				userId: r.userId,
				user: r.user,
			})),
		}
	})

	logger.debug('Сообщения задачи найдены', { taskId, count: result.length })
	if (result.length > 0) {
		const messagesWithReplies = result.filter(m => m.replyTo !== null)
		if (messagesWithReplies.length > 0) {
			logger.debug('Сообщений с ответами', { taskId, count: messagesWithReplies.length })
		}
	}

	return NextResponse.json({ messages: result }, { status: 200 })
	} catch (error: any) {
		logger.error('Ошибка получения сообщений задачи', error, { taskId })
		return NextResponse.json(
			{ error: 'Ошибка сервера', details: error.message },
			{ status: 500 }
		)
	}
}

// POST /api/tasks/[id]/messages
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { id: taskId } = await params
		
		// Проверяем, есть ли решенный спор по этой задаче
		const resolvedDispute = await prisma.dispute.findFirst({
			where: {
				taskId: taskId,
				status: 'resolved',
			},
			select: {
				adminDecision: true,
			},
		})

		if (resolvedDispute) {
			return NextResponse.json(
				{ 
					error: resolvedDispute.adminDecision === 'executor' 
						? 'Спор решен в пользу исполнителя. Чат закрыт.' 
						: 'Спор решен в пользу заказчика. Чат закрыт.' 
				},
				{ status: 403 }
			)
		}
		
		const contentType = req.headers.get('content-type') || ''
		
		let content = ''
		let file: File | null = null
		let fileId: string | null = null
		let replyToId: string | null = null
		
		if (contentType.includes('application/json')) {
			// JSON запрос с fileId (файл уже загружен)
			const body = await req.json().catch(() => null)
			// Убеждаемся, что content - это строка
			content = typeof body?.content === 'string' ? body.content : (body?.content ? String(body.content) : '')
			fileId = body?.fileId || null
			replyToId = body?.replyToId || null
		} else {
			// Multipart запрос с файлом
			const formData = await req.formData()
			content = formData.get('content')?.toString() || ''
			file = formData.get('file') as File | null
			replyToId = formData.get('replyToId')?.toString() || null
		}

		// Валидация replyToId - если указан, проверяем что сообщение существует и принадлежит той же задаче
		if (replyToId) {
			try {
				const replyToMessage = await prisma.message.findUnique({
					where: { id: replyToId },
					select: { id: true, taskId: true },
				})

				if (!replyToMessage) {
					return NextResponse.json(
						{ error: 'Сообщение для ответа не найдено' },
						{ status: 404 }
					)
				}

				if (replyToMessage.taskId !== taskId) {
					return NextResponse.json(
						{ error: 'Сообщение для ответа не принадлежит этой задаче' },
						{ status: 400 }
					)
				}
			} catch (validationError: any) {
				logger.error('Ошибка валидации replyToId', validationError, { replyToId, taskId, userId: user.id })
				return NextResponse.json(
					{ error: 'Ошибка проверки сообщения для ответа' },
					{ status: 500 }
				)
			}
		}

		let savedFile = null
		
		// Если файл уже загружен (fileId), используем его
		if (fileId) {
			savedFile = await prisma.file.findUnique({
				where: { id: fileId },
			})
			if (!savedFile) {
				return NextResponse.json(
					{ error: 'Файл не найден' },
					{ status: 404 }
				)
			}
		} else if (file && file.size > 0) {
			try {
				// Защита от path traversal
				const fileName = file.name || 'file'
				if (!isValidFileName(fileName)) {
					return NextResponse.json(
						{ error: 'Недопустимое имя файла' },
						{ status: 400 }
					)
				}

				// Нормализация имени файла
				const safeFileName = normalizeFileName(fileName)

				// Полная валидация файла (magic bytes, размер, тип)
				const validation = await validateFile(file, true)
				if (!validation.valid) {
					return NextResponse.json(
						{ error: validation.error },
						{ status: 400 }
					)
				}

				const buffer = Buffer.from(await file.arrayBuffer())

				// Используем определенный MIME тип из валидации
				const detectedMimeType = validation.detectedMimeType || file.type

				savedFile = await prisma.file.create({
					data: {
						filename: safeFileName,
						mimetype: detectedMimeType,
						size: file.size,
						data: buffer,
					},
				})
			} catch (fileError: any) {
				logger.error('Ошибка сохранения файла', fileError, { taskId, userId: user.id })
				return NextResponse.json(
					{ error: 'Ошибка сохранения файла' },
					{ status: 500 }
				)
			}
		}

		// Создаем сообщение с безопасной обработкой replyToId
		let message
		try {
			// Собираем данные для создания сообщения
			const messageData: any = {
				content,
				taskId,
				senderId: user.id,
				fileId: savedFile ? savedFile.id : (fileId || null), // Используем savedFile.id или переданный fileId
			}

			// Добавляем replyToId напрямую в объект (Prisma Client должен поддерживать после перегенерации)
			if (replyToId) {
				messageData.replyToId = replyToId
			}

			// Используем $queryRawUnsafe для обхода проблемы с типами Prisma Client
			// Если Prisma Client не поддерживает replyToId, создаем без него и обновляем через SQL
			let messageCreated = false
			try {
				message = await prisma.message.create({
					data: messageData as any,
					include: {
						sender: { select: { id: true, fullName: true, email: true, avatarUrl: true, xp: true } },
						file: { select: { id: true, filename: true, mimetype: true } },
						replyTo: {
							include: {
								sender: { select: { id: true, fullName: true, email: true, xp: true } },
							},
						},
						task: {
							select: {
								id: true,
								title: true,
								customerId: true,
								executorId: true,
								customer: { select: { id: true, fullName: true, email: true } },
								executor: { select: { id: true, fullName: true, email: true } },
							},
						},
					},
				})
				messageCreated = true
			} catch (prismaError: any) {
				// Если ошибка из-за Unknown argument replyToId, создаем без него и обновляем через SQL
				if (prismaError.message?.includes('Unknown argument') && prismaError.message?.includes('replyToId')) {
					logger.warn('Prisma Client не поддерживает replyToId, используем SQL обновление', { taskId })
					
					// Создаем сообщение без replyToId
					const messageDataWithoutReply = { ...messageData }
					delete messageDataWithoutReply.replyToId
					
					message = await prisma.message.create({
						data: messageDataWithoutReply as any,
						include: {
							sender: { select: { id: true, fullName: true, email: true, avatarUrl: true, xp: true } },
							file: { select: { id: true, filename: true, mimetype: true } },
							task: {
								select: {
									id: true,
									title: true,
									customerId: true,
									executorId: true,
									customer: { select: { id: true, fullName: true, email: true } },
									executor: { select: { id: true, fullName: true, email: true } },
								},
							},
						},
					})

					// Обновляем replyToId через SQL
					if (replyToId) {
						await prisma.$executeRawUnsafe(
							'UPDATE "Message" SET "replyToId" = $1 WHERE id = $2',
							replyToId,
							message.id
						)
						
						// Перезагружаем сообщение с replyTo
						message = await prisma.message.findUnique({
							where: { id: message.id },
							include: {
								sender: { select: { id: true, fullName: true, email: true, avatarUrl: true, xp: true } },
								file: { select: { id: true, filename: true, mimetype: true } },
								replyTo: {
									include: {
										sender: { select: { id: true, fullName: true, email: true, xp: true } },
									},
								},
								task: {
									select: {
										id: true,
										title: true,
										customerId: true,
										executorId: true,
										customer: { select: { id: true, fullName: true, email: true } },
										executor: { select: { id: true, fullName: true, email: true } },
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
			logger.error('Ошибка создания сообщения', createError, { taskId, userId: user.id })
			
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

	// Определяем получателя уведомления (другой участник задачи)
	const recipientId =
		message.task.customerId === user.id
			? message.task.executorId
			: message.task.customerId

	const presenceNow = new Date()

	await updateChatActivity({
		chatType: 'task',
		chatId: getChatKey('task', { chatType: 'task', taskId }),
		userId: user.id,
		lastActivityAt: presenceNow,
		lastReadAt: presenceNow,
	})

	if (recipientId) {
		sendNotificationToUser(recipientId, {
			type: 'chatPresence',
			event: 'activity',
			userId: user.id,
			chatType: 'task',
			chatId: `task_${taskId}`,
			lastActivityAt: presenceNow.toISOString(),
			lastReadAt: presenceNow.toISOString(),
		})
	}

	// Отправляем уведомление получателю в реальном времени
	if (recipientId) {
		logger.debug('Подготовка уведомления для получателя', { recipientId, taskId, senderId: user.id })
		
		// Создаем уведомление в базе данных
		const formattedContent = formatNotificationMessage(
			content,
			savedFile?.filename || null,
			true
		)
		const notificationMessage = `${
			message.sender.fullName || message.sender.email
		} написал в задаче "${message.task.title}": ${formattedContent}`
		
		const dbNotification = await createNotificationWithSettings({
			userId: recipientId,
			message: notificationMessage,
			link: `/tasks/${taskId}`,
			type: 'message',
		})
		
		// Если уведомление отключено в настройках, не отправляем SSE
		if (!dbNotification) {
			logger.debug('Уведомление отключено в настройках пользователя', { recipientId })
			return NextResponse.json({ message }, { status: 201 })
		}
		
		logger.debug('Уведомление сохранено в БД', { notificationId: dbNotification.id, recipientId })

		const sseNotification = {
			id: dbNotification.id, // Включаем ID из БД для дедупликации
			type: 'message',
			title: 'Новое сообщение в задаче',
			message: formattedContent,
			sender: message.sender.fullName || message.sender.email,
			senderId: message.sender.id,
			chatType: 'task',
			chatId: `task_${taskId}`,
			messageId: message.id,
			taskTitle: message.task.title,
			hasFile: !!savedFile,
			fileName: savedFile?.filename,
			playSound: true, // Указываем, что нужно воспроизвести звук
			link: `/tasks/${taskId}`,
		}
		
		const sent = sendNotificationToUser(recipientId, sseNotification)
		
		// 🔄 Синхронизация между устройствами: отправляем сообщение и отправителю
		// Это позволяет видеть отправленные сообщения на всех устройствах в реальном времени
		// Используем уже вычисленный formattedContent из строки 453
		sendNotificationToUser(user.id, {
			type: 'messageSent',
			title: 'Сообщение отправлено',
			message: formattedContent,
			sender: message.sender.fullName || message.sender.email,
			senderId: message.sender.id,
			chatType: 'task',
			chatId: `task_${taskId}`,
			messageId: message.id,
			messageData: {
				id: message.id,
				content: message.content,
				createdAt: message.createdAt,
				editedAt: message.editedAt,
				sender: message.sender,
				fileId: message.file?.id || null,
				fileName: message.file?.filename || null,
				fileMimetype: message.file?.mimetype || null,
				fileUrl: message.file ? `/api/files/${message.file.id}` : null,
				replyTo: message.replyTo ? {
					id: message.replyTo.id,
					content: message.replyTo.content,
					sender: message.replyTo.sender,
				} : null,
			},
			taskTitle: message.task.title,
			hasFile: !!savedFile,
			fileName: savedFile?.filename,
			link: `/tasks/${taskId}`,
			playSound: false, // Не воспроизводим звук для собственных сообщений
		})
		
		logger.debug('Сообщение в задаче отправлено и уведомление разослано', {
			senderId: user.id,
			recipientId,
			taskId,
			messageId: message.id,
			sseSent: sent,
			syncedToSender: true,
		})
	}

		return NextResponse.json({
			message: {
				id: message.id,
				content: message.content,
				createdAt: message.createdAt,
				editedAt: message.editedAt,
				sender: message.sender,
				fileId: message.file?.id || null,
				fileName: message.file?.filename || null,
				fileMimetype: message.file?.mimetype || null,
				fileUrl: message.file ? `/api/files/${message.file.id}` : null, // 🔥 сразу готовая ссылка
				replyTo: message.replyTo ? {
					id: message.replyTo.id,
					content: message.replyTo.content,
					sender: message.replyTo.sender,
				} : null,
				reactions: [],
			},
		})
	} catch (error: any) {
		logger.error('Ошибка создания сообщения задачи', error, { taskId, userId: user?.id })
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}
