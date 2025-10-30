import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// DELETE - Удаление сообщения
export async function DELETE(
	req: Request,
	{ params }: { params: { messageId: string } }
) {
	try {
		console.log('🗑️ DELETE запрос на удаление сообщения:', params.messageId)
		
		const token = req.headers.get('Authorization')?.replace('Bearer ', '')
		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let decoded: any
		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch (err) {
			console.error('❌ Ошибка проверки токена:', err)
			return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
		}

		console.log('✅ Пользователь:', decoded.userId)

		// Проверяем существование сообщения и права доступа
		const message = await prisma.message.findUnique({
			where: { id: params.messageId },
		})

		console.log('📝 Найденное сообщение:', message)

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		if (message.senderId !== decoded.userId) {
			console.log('❌ Нет прав:', message.senderId, '!==', decoded.userId)
			return NextResponse.json(
				{ error: 'Нет прав для удаления' },
				{ status: 403 }
			)
		}

		// Помечаем сообщение как удаленное (soft delete)
		// Если поле deletedAt не существует, просто меняем content
		try {
			const updatedMessage = await prisma.message.update({
				where: { id: params.messageId },
				data: {
					content: '[Сообщение удалено]',
				},
			})

			console.log('✅ Сообщение удалено:', updatedMessage.id)
			return NextResponse.json({ message: updatedMessage })
		} catch (updateError) {
			console.error('❌ Ошибка обновления:', updateError)
			return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 })
		}
	} catch (error) {
		console.error('❌ Ошибка удаления сообщения:', error)
		return NextResponse.json({ error: 'Ошибка сервера: ' + String(error) }, { status: 500 })
	}
}

