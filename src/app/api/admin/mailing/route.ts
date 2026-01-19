import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendAdminMailingEmail } from '@/lib/mail'

export async function POST(req: NextRequest) {
	try {
		const admin = await getUserFromRequest(req)

		if (!admin || String(admin.role) !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		const { role, subject, message } = await req.json()

		if (!role || (role !== 'executor' && role !== 'customer')) {
			return NextResponse.json({ error: 'Неверная роль' }, { status: 400 })
		}

		if (!subject || !message) {
			return NextResponse.json(
				{ error: 'Тема и сообщение обязательны' },
				{ status: 400 }
			)
		}

		// Получаем всех пользователей с выбранной ролью, которые не заблокированы
		const users = await prisma.user.findMany({
			where: {
				role: role,
				blocked: false,
			},
			select: {
				email: true,
				fullName: true,
			},
		})

		if (users.length === 0) {
			return NextResponse.json(
				{ error: 'Нет пользователей с выбранной ролью' },
				{ status: 400 }
			)
		}

		// Отправляем письма
		let sentCount = 0
		let failedCount = 0

		for (const user of users) {
			try {
				await sendAdminMailingEmail(user.email, {
					subject,
					message,
					recipientName: user.fullName || 'Пользователь',
				})
				sentCount++
			} catch (error) {
				console.error(`Ошибка при отправке письма на ${user.email}:`, error)
				failedCount++
			}
		}

		return NextResponse.json({
			success: true,
			sentCount,
			failedCount,
			total: users.length,
		})
	} catch (error) {
		console.error('Ошибка при отправке рассылки:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

