// src/app/api/tasks/[id]/messages/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateFile } from '@/lib/fileValidation'
import { normalizeFileName, isValidFileName } from '@/lib/security'

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
					sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
					file: { select: { id: true, filename: true, mimetype: true } },
					replyTo: {
						include: {
							sender: { select: { id: true, fullName: true, email: true } },
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
			console.error('❌ Ошибка Prisma при получении сообщений:', prismaError)
			// Если ошибка связана с отсутствующими полями, делаем базовый запрос
			if (prismaError.message?.includes('replyTo') || prismaError.message?.includes('reactions') || prismaError.code === 'P2021') {
				console.warn('⚠️ Поля replyTo/reactions недоступны, используем базовый запрос')
				messages = await prisma.message.findMany({
					where: { taskId },
					include: {
						sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
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

		console.log('📨 Сообщения задачи найдены:', result.length)
		if (result.length > 0) {
			console.log('📝 Первое сообщение:', JSON.stringify(result[0], null, 2))
			// Проверяем, есть ли сообщения с ответами
			const messagesWithReplies = result.filter(m => m.replyTo !== null)
			if (messagesWithReplies.length > 0) {
				console.log('💬 Сообщений с ответами:', messagesWithReplies.length)
				console.log('📎 Пример ответа:', JSON.stringify(messagesWithReplies[0].replyTo, null, 2))
			}
		} else {
			console.log('📝 Сообщений нет, возвращаем пустой массив')
		}

		return NextResponse.json({ messages: result }, { status: 200 })
	} catch (error: any) {
		console.error('❌ Ошибка получения сообщений задачи:', error)
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
		const contentType = req.headers.get('content-type') || ''
		
		let content = ''
		let file: File | null = null
		let fileId: string | null = null
		let replyToId: string | null = null
		
		if (contentType.includes('application/json')) {
			// JSON запрос с fileId (файл уже загружен)
			const body = await req.json().catch(() => null)
			content = body?.content || ''
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
				console.error('❌ Ошибка валидации replyToId:', validationError)
				return NextResponse.json(
					{ error: 'Ошибка проверки сообщения для ответа', details: validationError.message },
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
				console.error('❌ Ошибка сохранения файла:', fileError)
				return NextResponse.json(
					{ error: 'Ошибка сохранения файла', details: fileError.message },
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
				fileId: savedFile ? savedFile.id : null,
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
						sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
						file: { select: { id: true, filename: true, mimetype: true } },
						replyTo: {
							include: {
								sender: { select: { id: true, fullName: true, email: true } },
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
					console.warn('⚠️ Prisma Client не поддерживает replyToId, используем SQL обновление')
					
					// Создаем сообщение без replyToId
					const messageDataWithoutReply = { ...messageData }
					delete messageDataWithoutReply.replyToId
					
					message = await prisma.message.create({
						data: messageDataWithoutReply as any,
						include: {
							sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
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
								sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
								file: { select: { id: true, filename: true, mimetype: true } },
								replyTo: {
									include: {
										sender: { select: { id: true, fullName: true, email: true } },
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
			console.error('❌ Ошибка создания сообщения:', createError)
			
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

	// Отправляем уведомление получателю в реальном времени
	if (recipientId) {
		console.log('🔔 Подготовка уведомления для получателя:', recipientId)
		
		// Создаем уведомление в базе данных
		const notificationMessage = `${
			message.sender.fullName || message.sender.email
		} написал в задаче "${message.task.title}": ${
			content || (savedFile ? `Файл: ${savedFile.filename}` : 'Новое сообщение')
		}`
		
		console.log('💾 Сохраняю уведомление в БД...')
		const dbNotification = await createNotification({
			userId: recipientId,
			message: notificationMessage,
			link: `/tasks/${taskId}`,
			type: 'message',
		})
		console.log('✅ Уведомление сохранено в БД, ID:', dbNotification.id)

		const sseNotification = {
			id: dbNotification.id, // Включаем ID из БД для дедупликации
			type: 'message',
			title: 'Новое сообщение в задаче',
			message:
				content ||
				(savedFile ? `Файл: ${savedFile.filename}` : 'Новое сообщение'),
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
		
		console.log('📡 Отправка SSE уведомления:', sseNotification)
		const sent = sendNotificationToUser(recipientId, sseNotification)
		console.log('📨 Результат отправки SSE:', sent ? 'успешно' : 'ошибка')

		console.log('📨 Сообщение в задаче отправлено и уведомление разослано:', {
			senderId: user.id,
			recipientId,
			taskId,
			messageId: message.id,
			sseSent: sent,
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
		console.error('❌ Ошибка создания сообщения задачи:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера', details: error.message },
			{ status: 500 }
		)
	}
}
