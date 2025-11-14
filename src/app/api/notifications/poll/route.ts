// src/app/api/notifications/poll/route.ts
// API для polling уведомлений (fallback для SSE)
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createUserRateLimit } from '@/lib/rateLimit'
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

		// Rate limiting для polling: максимум 8 запросов в минуту на пользователя
		// (для интервала 10 секунд это безопасно: 60/10 = 6, плюс запас)
		const pollingRateLimit = createUserRateLimit({
			windowMs: 60 * 1000, // 1 минута
			maxRequests: 8, // Максимум 8 запросов в минуту
		})
		const rateLimitResult = await pollingRateLimit(req)

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ error: 'Слишком частые запросы. Подождите немного.' },
				{
					status: 429,
					headers: {
						'Retry-After': Math.ceil(
							(rateLimitResult.resetTime - Date.now()) / 1000
						).toString(),
						'X-RateLimit-Limit': '8',
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
					},
				}
			)
		}

		const { searchParams } = new URL(req.url)
		const sinceParam = searchParams.get('since')

		// Если указана дата, берем уведомления после неё
		const since = sinceParam
			? new Date(sinceParam)
			: new Date(Date.now() - 10000) // по умолчанию последние 10 секунд
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

<<<<<<< HEAD
		console.log(
			`📡 Polling: найдено ${notifications.length} новых уведомлений для пользователя ${user.id}`
		)
=======
		logger.debug('Polling: найдено новых уведомлений', {
			count: notifications.length,
			userId: user.id,
			since: sinceParam,
		})
>>>>>>> 4d599b495509cae62f8ac20d8451e4d977ff419b

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
<<<<<<< HEAD
		console.error('❌ Ошибка при polling уведомлений:', error)
		console.error(
			'❌ Stack:',
			error instanceof Error ? error.stack : 'No stack'
		)
=======
		logger.error('Ошибка при polling уведомлений', error, {
			userId: user?.id,
			stack: error instanceof Error ? error.stack : undefined,
		})
>>>>>>> 4d599b495509cae62f8ac20d8451e4d977ff419b
		return NextResponse.json(
			{
				error: 'Ошибка сервера',
				message: error instanceof Error ? error.message : 'Unknown error',
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
