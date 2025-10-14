// src/app/api/tasks/[id]/messages/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/tasks/[id]/messages
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: taskId } = await params

	const messages = await prisma.message.findMany({
		where: { taskId },
		include: {
			sender: { select: { id: true, fullName: true, email: true } },
			file: { select: { id: true, filename: true, mimetype: true } },
		},
		orderBy: { createdAt: 'asc' },
	})

	const result = messages.map(m => ({
		id: m.id,
		content: m.content,
		createdAt: m.createdAt,
		sender: m.sender,
		fileId: m.file?.id || null,
		fileName: m.file?.filename || null,
		fileMimetype: m.file?.mimetype || null,
		fileUrl: m.file ? `/api/files/${m.file.id}` : null, // 🔥 всегда отдаём url
	}))

	return NextResponse.json({ messages: result })
}

// POST /api/tasks/[id]/messages
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	const { id: taskId } = await params
	const formData = await req.formData()

	const content = formData.get('content')?.toString() || ''
	const file = formData.get('file') as File | null

	let savedFile = null
	if (file) {
		const buffer = Buffer.from(await file.arrayBuffer())

		savedFile = await prisma.file.create({
			data: {
				filename: file.name,
				mimetype: file.type,
				size: file.size,
				data: buffer,
			},
		})
	}

	const message = await prisma.message.create({
		data: {
			content,
			taskId,
			senderId: user.id,
			fileId: savedFile ? savedFile.id : null,
		},
		include: {
			sender: { select: { id: true, fullName: true, email: true } },
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

	// Определяем получателя уведомления (другой участник задачи)
	const recipientId =
		message.task.customerId === user.id
			? message.task.executorId
			: message.task.customerId

	// Отправляем уведомление получателю в реальном времени
	if (recipientId) {
		sendNotificationToUser(recipientId, {
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
		})

		console.log('📨 Сообщение в задаче отправлено и уведомление разослано:', {
			senderId: user.id,
			recipientId,
			taskId,
			messageId: message.id,
		})
	}

	return NextResponse.json({
		message: {
			id: message.id,
			content: message.content,
			createdAt: message.createdAt,
			sender: message.sender,
			fileId: message.file?.id || null,
			fileName: message.file?.filename || null,
			fileMimetype: message.file?.mimetype || null,
			fileUrl: message.file ? `/api/files/${message.file.id}` : null, // 🔥 сразу готовая ссылка
		},
	})
}
