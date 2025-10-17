import { getUserFromRequest } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationToUser } from '../notifications/stream/route'

export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { recipientId, chatType, chatId, isTyping } = await req.json()

		if (!recipientId) {
			return NextResponse.json(
				{ error: 'recipientId обязателен' },
				{ status: 400 }
			)
		}

		// Отправляем уведомление о наборе сообщения
		sendNotificationToUser(recipientId, {
			type: 'typing',
			senderId: user.id,
			sender: user.fullName || user.email,
			chatType: chatType || 'private',
			chatId: chatId || `private_${user.id}`,
			isTyping: isTyping || false,
			timestamp: new Date().toISOString(),
		})

		console.log('⌨️ Событие набора отправлено:', {
			senderId: user.id,
			recipientId,
			isTyping,
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Ошибка отправки события набора:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
