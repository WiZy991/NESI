// src/app/api/notifications/mark-read-by-link/route.ts
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		const { link } = await req.json()

		if (!link) {
			return NextResponse.json(
				{ error: 'Не указана ссылка' },
				{ status: 400 }
			)
		}

		console.log('📖 Удаление уведомлений по ссылке:', {
			userId: user.id,
			link,
		})

		// Удаляем уведомления с этой ссылкой
		const deletedNotifications = await prisma.notification.deleteMany({
			where: {
				userId: user.id,
				link,
			},
		})

		console.log(`✅ Удалено уведомлений: ${deletedNotifications.count}`)
		
		return NextResponse.json({ 
			success: true,
			deletedNotifications: deletedNotifications.count
		})
	} catch (error) {
		console.error('Ошибка при удалении уведомлений:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

