import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// PATCH - Редактирование сообщения
export async function PATCH(
	req: Request,
	{ params }: { params: { messageId: string } }
) {
	try {
		console.log('✏️ PATCH запрос на редактирование:', params.messageId)
		
		const token = req.headers.get('Authorization')?.replace('Bearer ', '')
		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let decoded: any
		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch (err) {
			console.error('❌ Ошибка токена:', err)
			return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
		}

		const { content } = await req.json()
		console.log('📝 Новый контент:', content)
		
		if (!content || !content.trim()) {
			return NextResponse.json(
				{ error: 'Текст сообщения не может быть пустым' },
				{ status: 400 }
			)
		}

		// Проверяем существование сообщения и права доступа
		const message = await prisma.message.findUnique({
			where: { id: params.messageId },
		})

		console.log('📨 Сообщение найдено:', message ? 'Да' : 'Нет')

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		if (message.senderId !== decoded.userId) {
			console.log('❌ Нет прав:', message.senderId, '!==', decoded.userId)
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

		console.log('✅ Сообщение обновлено')
		
		// Возвращаем в том же формате что получили
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
	} catch (error: any) {
		console.error('❌ Ошибка редактирования:', error)
		return NextResponse.json({ 
			error: 'Ошибка сервера: ' + (error.message || String(error))
		}, { status: 500 })
	}
}

