import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// DELETE - Удаление сообщения
export async function DELETE(
	req: Request,
	{ params }: { params: { messageId: string } }
) {
	try {
		logger.debug('DELETE запрос на удаление сообщения', { messageId: params.messageId })
		
		const token = req.headers.get('Authorization')?.replace('Bearer ', '')
		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let decoded: any
		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch (err) {
			logger.error('Ошибка проверки токена', err, { messageId: params.messageId })
			return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
		}

		logger.debug('Пользователь авторизован', { userId: decoded.userId })

		// Проверяем существование сообщения и права доступа
		const message = await prisma.message.findUnique({
			where: { id: params.messageId },
		})

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		if (message.senderId !== decoded.userId) {
			logger.warn('Нет прав для удаления сообщения', {
				messageId: params.messageId,
				messageSenderId: message.senderId,
				userId: decoded.userId,
			})
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

			logger.info('Сообщение удалено', { messageId: updatedMessage.id })
			return NextResponse.json({ message: updatedMessage })
		} catch (updateError) {
			logger.error('Ошибка обновления сообщения', updateError, { messageId: params.messageId })
			return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 })
		}
	} catch (error) {
		logger.error('Ошибка удаления сообщения', error, { messageId: params.messageId })
		return NextResponse.json({ error: 'Ошибка сервера: ' + String(error) }, { status: 500 })
	}
}

