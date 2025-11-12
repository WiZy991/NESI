import { getChatKey, updateChatActivity } from '@/lib/chatActivity'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationToUser } from '../../notifications/stream/route'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		const { otherUserId } = await req.json()

		if (!otherUserId) {
			return NextResponse.json(
				{ error: 'Не указан ID собеседника' },
				{ status: 400 }
			)
		}

		const now = new Date()

		logger.debug('Пометка приватных сообщений как прочитанных', {
			userId: user.id,
			otherUserId,
		})

		// Обновляем время последнего прочтения приватных сообщений пользователя
		await prisma.user.update({
			where: { id: user.id },
			data: { lastPrivateMessageReadAt: now },
		})

		// Обновляем запись активности в чатах
		const normalizedChatId = getChatKey('private', {
			chatType: 'private',
			userA: user.id,
			userB: otherUserId,
		})

		await updateChatActivity({
			chatType: 'private',
			chatId: normalizedChatId,
			userId: user.id,
			lastReadAt: now,
			lastActivityAt: now,
		})

		// Удаляем уведомления о сообщениях от этого пользователя
		const deletedNotifications = await prisma.notification.deleteMany({
			where: {
				userId: user.id,
				type: 'message',
				link: {
					contains: `open=${otherUserId}`,
				},
			},
		})

		// Уведомляем собеседника об обновлении статуса прочтения
		sendNotificationToUser(otherUserId, {
			type: 'chatPresence',
			event: 'read',
			userId: user.id,
			chatType: 'private',
			chatId: `private_${user.id}`,
			lastReadAt: now.toISOString(),
			lastActivityAt: now.toISOString(),
		})

		logger.debug('Приватные сообщения помечены как прочитанные', {
			userId: user.id,
			otherUserId,
			deletedNotifications: deletedNotifications.count,
		})

		return NextResponse.json({
			success: true,
			deletedNotifications: deletedNotifications.count,
			lastReadAt: now.toISOString(),
		})
	} catch (error) {
		logger.error('Ошибка при пометке приватных сообщений как прочитанных', error, {
			userId: user?.id,
			otherUserId,
		})
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
