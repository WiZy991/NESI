import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { validateFile } from '@/lib/fileValidation'
import { normalizeFileName, isValidFileName, sanitizeText, validateStringLength } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

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

		let fileUrl: string | null = null
		let fileName: string | null = null
		let mimeType: string | null = null
		let size: number | null = null

		if (ct.includes('multipart/form-data')) {
			const form = await req.formData()
			recipientId = form.get('recipientId')?.toString()
			content = form.get('content')?.toString() || ''

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

				fileUrl = `/api/files/${created.id}`
				fileName = created.filename
				mimeType = created.mimetype
				size = created.size
			}
		} else if (ct.includes('application/json')) {
			const body = await req.json().catch(() => null)
			recipientId = body?.recipientId
			content = body?.content ?? ''
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
		const maxContentLength = 10000 // 10KB
		const contentValidation = validateStringLength(content, maxContentLength, 'Сообщение')
		if (!contentValidation.valid) {
			return NextResponse.json(
				{ error: contentValidation.error },
				{ status: 400 }
			)
		}

		// Санитизация контента (удаление потенциально опасного HTML)
		const sanitizedContent = sanitizeText(content)

		const msg = await prisma.privateMessage.create({
			data: {
				senderId: me.id,
				recipientId,
				content: sanitizedContent,
				fileUrl,
				fileName,
				mimeType,
				size,
			},
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

		// Преобразуем данные в нужный формат
		const result = {
			id: msg.id,
			content: msg.content,
			createdAt: msg.createdAt,
			sender: msg.sender,
			fileUrl: msg.fileUrl || (msg.file ? `/api/files/${msg.file.id}` : null),
			fileName: msg.fileName || msg.file?.filename || null,
			fileMimetype: msg.mimeType || msg.file?.mimetype || null,
		}

	console.log('🔔 Подготовка уведомления для получателя:', recipientId)
	
	// Создаем уведомление в базе данных
	const notificationMessage = `${msg.sender.fullName || msg.sender.email}: ${
		content || (fileName ? `Файл: ${fileName}` : 'Новое сообщение')
	}`
	
	console.log('💾 Сохраняю уведомление в БД...')
	await createNotification({
		userId: recipientId,
		message: notificationMessage,
		link: `/chats?open=${me.id}`,
		type: 'message',
	})
	console.log('✅ Уведомление сохранено в БД')

	// Отправляем уведомление получателю в реальном времени
	const sseNotification = {
		type: 'message',
		title: 'Новое сообщение',
		message: content || (fileName ? `Файл: ${fileName}` : 'Новое сообщение'),
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
