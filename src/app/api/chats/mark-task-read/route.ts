import { getChatKey, updateChatActivity } from '@/lib/chatActivity'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationToUser } from '../../notifications/stream/route'

export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		const { taskId } = await req.json()

		if (!taskId) {
			return NextResponse.json(
				{ error: 'Не указан ID задачи' },
				{ status: 400 }
			)
		}

		console.log('📖 Пометка сообщений задачи как прочитанных:', {
			userId: user.id,
			taskId,
		})

		// Проверяем, что пользователь имеет доступ к этой задаче
		const task = await prisma.task.findFirst({
			where: {
				id: taskId,
				OR: [{ customerId: user.id }, { executorId: user.id }],
			},
		})

		if (!task) {
			return NextResponse.json(
				{ error: 'Задача не найдена или нет доступа' },
				{ status: 404 }
			)
		}

		const now = new Date()

		// Обновляем время последнего прочтения сообщений задачи
		const updateData: any = {}
		let recipientId: string | null = null
		if (task.customerId === user.id) {
			updateData.customerLastReadAt = now
			recipientId = task.executorId
		} else if (task.executorId === user.id) {
			updateData.executorLastReadAt = now
			recipientId = task.customerId
		}

		await prisma.task.update({
			where: { id: taskId },
			data: updateData,
		})

		// Обновляем активность в чатах
		const normalizedChatId = getChatKey('task', {
			chatType: 'task',
			taskId,
		})

		await updateChatActivity({
			chatType: 'task',
			chatId: normalizedChatId,
			userId: user.id,
			lastReadAt: now,
			lastActivityAt: now,
		})

		// Удаляем уведомления о сообщениях в этой задаче
		const deletedNotifications = await prisma.notification.deleteMany({
			where: {
				userId: user.id,
				type: 'message',
				link: `/tasks/${taskId}`,
			},
		})

		// Уведомляем второго участника о прочтении
		if (recipientId) {
			sendNotificationToUser(recipientId, {
				type: 'chatPresence',
				event: 'read',
				userId: user.id,
				chatType: 'task',
				chatId: `task_${taskId}`,
				lastReadAt: now.toISOString(),
				lastActivityAt: now.toISOString(),
			})
		}

		console.log(
			`✅ Сообщения задачи помечены как прочитанные, удалено уведомлений: ${deletedNotifications.count}`
		)

		return NextResponse.json({
			success: true,
			deletedNotifications: deletedNotifications.count,
			lastReadAt: now.toISOString(),
		})
	} catch (error) {
		console.error('Ошибка при пометке сообщений задачи как прочитанных:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
