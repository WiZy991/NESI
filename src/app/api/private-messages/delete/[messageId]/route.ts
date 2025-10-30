import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// DELETE - Удаление приватного сообщения
export async function DELETE(
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
				{ error: 'Нет прав для удаления' },
				{ status: 403 }
			)
		}

		// Помечаем сообщение как удаленное (soft delete)
		const updatedMessage = await prisma.privateMessage.update({
			where: { id: params.messageId },
			data: {
				content: '[Сообщение удалено]',
			},
		})

		return NextResponse.json({ message: updatedMessage })
	} catch (error) {
		console.error('Ошибка удаления сообщения:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

