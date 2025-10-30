import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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

		console.log('📖 Пометка приватных сообщений как прочитанных:', {
			userId: user.id,
			otherUserId,
		})

		// Обновляем время последнего прочтения приватных сообщений
		await prisma.user.update({
			where: { id: user.id },
			data: { lastPrivateMessageReadAt: new Date() },
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

		console.log(`✅ Приватные сообщения помечены как прочитанные, удалено уведомлений: ${deletedNotifications.count}`)
		
		return NextResponse.json({ 
			success: true,
			deletedNotifications: deletedNotifications.count
		})
	} catch (error) {
		console.error(
			'Ошибка при пометке приватных сообщений как прочитанных:',
			error
		)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
