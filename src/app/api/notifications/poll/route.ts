// src/app/api/notifications/poll/route.ts
// API для polling уведомлений (fallback для SSE)
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { searchParams } = new URL(req.url)
		const sinceParam = searchParams.get('since')

		// Если указана дата, берем уведомления после неё
		const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 10000) // по умолчанию последние 10 секунд
		// Получаем новые уведомления
		const notifications = await prisma.notification.findMany({
			where: {
				userId: user.id,
				createdAt: {
					gt: since,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 20, // максимум 20 уведомлений за раз
		})

		logger.debug('Polling: найдено новых уведомлений', {
			count: notifications.length,
			userId: user.id,
			since: sinceParam,
		})

		// Преобразуем в формат совместимый с SSE
		const formattedNotifications = notifications.map(n => ({
			id: n.id, // Включаем ID для дедупликации
			type: n.type || 'notification',
			title: getNotificationTitle(n.type || 'notification'),
			message: n.message,
			link: n.link,
			timestamp: n.createdAt.toISOString(),
			playSound: true,
		}))

		return NextResponse.json({
			notifications: formattedNotifications,
			count: notifications.length,
		})
	} catch (error) {
		logger.error('Ошибка при polling уведомлений', error, {
			userId: user?.id,
			stack: error instanceof Error ? error.stack : undefined,
		})
		return NextResponse.json(
			{ 
				error: 'Ошибка сервера',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}

function getNotificationTitle(type: string): string {
	const titles: Record<string, string> = {
		message: 'Новое сообщение',
		response: 'Новый отклик',
		hire: 'Вас наняли',
		review: 'Новый отзыв',
		task_status: 'Изменение статуса задачи',
		payment: 'Платёж обработан',
		notification: 'Уведомление',
	}
	return titles[type] || 'Уведомление'
}

