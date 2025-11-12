// src/app/api/notifications/test-create/route.ts
// Тестовый endpoint для создания уведомлений
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationToUser } from '../../notifications/stream/route'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		logger.debug('Создание тестового уведомления', { userId: user.id })

		// Создаем уведомление в БД
		const notification = await createNotification({
			userId: user.id,
			message: `Тестовое уведомление от ${new Date().toLocaleTimeString()}`,
			link: '/test-notifications',
			type: 'test',
		})

		logger.info('Тестовое уведомление создано в БД', { notificationId: notification.id, userId: user.id })

		// Пытаемся отправить через SSE
		const sseSent = sendNotificationToUser(user.id, {
			type: 'test',
			title: 'Тестовое уведомление',
			message: notification.message,
			link: notification.link,
			timestamp: notification.createdAt.toISOString(),
			playSound: true,
		})

		logger.debug('SSE отправка тестового уведомления', { sseSent, userId: user.id })

		return NextResponse.json({
			success: true,
			notification,
			sseSent,
			message: sseSent
				? 'Уведомление отправлено через SSE'
				: 'Уведомление сохранено в БД, SSE не подключен (будет получено через polling)',
		})
	} catch (error: any) {
		logger.error('Ошибка создания тестового уведомления', error, { userId: user.id })
		return NextResponse.json(
			{ error: 'Ошибка сервера', details: error.message },
			{ status: 500 }
		)
	}
}

