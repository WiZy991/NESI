import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await getUserFromRequest(req)
		const { id: taskId } = await params

		// Получаем задачу
		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				id: true,
				customerId: true,
				executorId: true,
				status: true,
				executorLastReadAt: true,
			},
		})

		if (!task) {
			return NextResponse.json(
				{ error: 'Задача не найдена' },
				{ status: 404 }
			)
		}

		// Проверяем, что пользователь - заказчик этой задачи
		if (task.customerId !== user.id) {
			return NextResponse.json(
				{ error: 'Доступ запрещен' },
				{ status: 403 }
			)
		}

		if (!task.executorId) {
			return NextResponse.json({
				hasExecutor: false,
				activity: null,
			})
		}

		// Получаем информацию об исполнителе
		const executor = await prisma.user.findUnique({
			where: { id: task.executorId },
			select: {
				id: true,
				fullName: true,
				lastActivityAt: true,
			},
		})

		if (!executor) {
			return NextResponse.json({
				hasExecutor: false,
				activity: null,
			})
		}

		// Получаем последние сообщения от исполнителя в этой задаче
		const lastMessages = await prisma.message.findMany({
			where: {
				taskId: taskId,
				senderId: task.executorId,
			},
			orderBy: { createdAt: 'desc' },
			take: 5,
			select: {
				id: true,
				content: true,
				createdAt: true,
			},
		})

		// Получаем последние изменения в задаче (обновления, изменения статуса)
		const recentUpdates = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				updatedAt: true,
				executorNote: true,
				executorPlannedStart: true,
				executorPlannedDeadline: true,
			},
		})

		// Определяем статус активности
		const now = new Date()
		const lastActivity = executor.lastActivityAt
			? new Date(executor.lastActivityAt)
			: null

		let activityStatus: 'online' | 'recent' | 'away' | 'offline' = 'offline'
		let activityMessage = 'Не в сети'

		if (lastActivity) {
			const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60)

			if (minutesSinceActivity < 5) {
				activityStatus = 'online'
				activityMessage = 'В сети'
			} else if (minutesSinceActivity < 30) {
				activityStatus = 'recent'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity)} мин. назад`
			} else if (minutesSinceActivity < 120) {
				activityStatus = 'away'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity / 60)} ч. назад`
			} else {
				activityStatus = 'offline'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity / 60)} ч. назад`
			}
		}

		// Проверяем, есть ли недавние сообщения
		const hasRecentMessages = lastMessages.length > 0
		const lastMessageTime = lastMessages[0]?.createdAt
			? new Date(lastMessages[0].createdAt)
			: null

		// Проверяем, есть ли недавние обновления задачи
		const hasRecentUpdates = recentUpdates?.updatedAt
			? (now.getTime() - new Date(recentUpdates.updatedAt).getTime()) / (1000 * 60) < 60
			: false

		return NextResponse.json({
			hasExecutor: true,
			executor: {
				id: executor.id,
				fullName: executor.fullName,
			},
			activity: {
				status: activityStatus,
				message: activityMessage,
				lastActivityAt: lastActivity?.toISOString() || null,
				lastMessageAt: lastMessageTime?.toISOString() || null,
				hasRecentMessages,
				hasRecentUpdates,
				recentMessages: lastMessages.map(msg => ({
					id: msg.id,
					preview: msg.content?.substring(0, 100) || '',
					createdAt: msg.createdAt.toISOString(),
				})),
				executorNote: recentUpdates?.executorNote || null,
				plannedStart: recentUpdates?.executorPlannedStart?.toISOString() || null,
				plannedDeadline: recentUpdates?.executorPlannedDeadline?.toISOString() || null,
			},
		})
	} catch (error) {
		logger.error('Ошибка получения активности исполнителя', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

