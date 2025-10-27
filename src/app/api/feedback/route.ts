import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { name, email, message, type } = body

		// Валидация
		if (!name || !message) {
			return NextResponse.json(
				{ error: 'Имя и сообщение обязательны' },
				{ status: 400 }
			)
		}

		// Сохранение обратной связи
		const feedback = await prisma.feedback.create({
			data: {
				name,
				email: email || null,
				message,
				type: type || 'general',
			},
		})

		return NextResponse.json(
			{
				success: true,
				message: 'Обратная связь успешно отправлена',
				id: feedback.id,
			},
			{ status: 201 }
		)
	} catch (error) {
		console.error('Ошибка при сохранении обратной связи:', error)
		return NextResponse.json(
			{ error: 'Не удалось отправить обратную связь' },
			{ status: 500 }
		)
	}
}

