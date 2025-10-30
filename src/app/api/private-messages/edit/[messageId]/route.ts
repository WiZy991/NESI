import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// PATCH - Редактирование приватного сообщения
export async function PATCH(
	req: Request,
	{ params }: { params: { messageId: string } }
) {
	try {
		const token = req.headers.get('Authorization')?.replace('Bearer ', '')
		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let decoded: any
		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch {
			return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
		}

		const { content } = await req.json()
		if (!content || !content.trim()) {
			return NextResponse.json(
				{ error: 'Текст сообщения не может быть пустым' },
				{ status: 400 }
			)
		}

		// Проверяем существование сообщения и права доступа
		const message = await prisma.privateMessage.findUnique({
			where: { id: params.messageId },
		})

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		if (message.senderId !== decoded.userId) {
			return NextResponse.json(
				{ error: 'Нет прав для редактирования' },
				{ status: 403 }
			)
		}

		// Обновляем сообщение
		const updatedMessage = await prisma.privateMessage.update({
			where: { id: params.messageId },
			data: {
				content: content.trim(),
				editedAt: new Date(),
			},
		})

		return NextResponse.json({ 
			message: {
				...updatedMessage,
				sender: {
					id: decoded.userId,
					fullName: null,
					email: null
				}
			}
		})
	} catch (error) {
		console.error('Ошибка редактирования сообщения:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

