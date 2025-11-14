import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import { validateWithZod } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'

// Схема валидации для редактирования сообщения
const editMessageSchema = z.object({
	content: z
		.string()
		.min(1, 'Текст сообщения не может быть пустым')
		.max(5000, 'Сообщение слишком длинное (максимум 5000 символов)')
		.trim(),
})

// PATCH - Редактирование сообщения
export async function PATCH(
	req: Request,
	{ params }: { params: { messageId: string } }
) {
	try {
		logger.debug('PATCH запрос на редактирование сообщения', { messageId: params.messageId })
		
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let body
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		// Валидация данных
		const validation = validateWithZod(editMessageSchema, body)
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.errors.join(', ') },
				{ status: 400 }
			)
		}

		const { content } = validation.data

		// Дополнительная валидация длины
		const contentValidation = validateStringLength(content, 5000, 'Сообщение')
		if (!contentValidation.valid) {
			return NextResponse.json(
				{ error: contentValidation.error },
				{ status: 400 }
			)
		}

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

		if (message.senderId !== user.id) {
			logger.warn('Попытка редактирования чужого сообщения', { messageId: params.messageId, senderId: message.senderId, userId: user.id })
			return NextResponse.json(
				{ error: 'Нет прав для редактирования' },
				{ status: 403 }
			)
		}

		// Обновляем сообщение - просто возвращаем обновленные данные без include
		const updatedMessage = await prisma.message.update({
			where: { id: params.messageId },
			data: {
				content: content.trim(),
				editedAt: new Date(),
			},
		})

		logger.debug('Сообщение обновлено', { messageId: params.messageId })
		
		// Возвращаем в том же формате что получили
		return NextResponse.json({ 
			message: {
				...updatedMessage,
				sender: {
					id: user.id,
					fullName: user.fullName,
					email: user.email
				}
			}
		})
	} catch (error: any) {
		logger.error('Ошибка редактирования сообщения', error, { messageId: params.messageId })
		return NextResponse.json({ 
			error: 'Ошибка сервера'
		}, { status: 500 })
	}
}

