import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_PREFIXES = ['image/', 'application/pdf', 'application/zip']

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
				if (blob.size > MAX_SIZE) {
					return NextResponse.json(
						{ error: 'Файл слишком большой (до 10MB)' },
						{ status: 413 }
					)
				}
				const allowed = ALLOWED_PREFIXES.some(p =>
					(blob.type || '').startsWith(p)
				)
				if (!allowed) {
					return NextResponse.json(
						{ error: 'Недопустимый тип файла' },
						{ status: 415 }
					)
				}

				const buf = Buffer.from(await blob.arrayBuffer())

				// сохраняем файл в таблицу File
				const created = await prisma.file.create({
					data: {
						filename: (blob as any).name || 'file',
						mimetype: blob.type || 'application/octet-stream',
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

		const msg = await prisma.privateMessage.create({
			data: {
				senderId: me.id,
				recipientId,
				content,
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

		// Создаем уведомление в базе данных
		const notificationMessage = `${msg.sender.fullName || msg.sender.email}: ${
			content || (fileName ? `Файл: ${fileName}` : 'Новое сообщение')
		}`
		await createNotification({
			userId: recipientId,
			message: notificationMessage,
			link: `/chats?open=${me.id}`,
			type: 'message',
		})

		// Отправляем уведомление получателю в реальном времени
		sendNotificationToUser(recipientId, {
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
		})

		console.log('📨 Сообщение отправлено и уведомление разослано:', {
			senderId: me.id,
			recipientId,
			messageId: msg.id,
		})

		return NextResponse.json(result, { status: 201 })
	} catch (err) {
		console.error('🔥 Ошибка при отправке сообщения:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
