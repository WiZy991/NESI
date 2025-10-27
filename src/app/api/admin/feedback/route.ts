import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/jwt'

export async function GET(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '')

		if (!token) {
			console.log('❌ Нет токена')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const payload = verifyJWT(token)
		console.log('Payload:', payload)
		
		if (!payload) {
			console.log('❌ Невалидный токен')
			return NextResponse.json({ error: 'Невалидный токен' }, { status: 401 })
		}

		// Получаем роль из токена или из БД
		let userRole = (payload as any).role
		if (!userRole) {
			// Если в токене нет роли (старый токен), получаем из БД
			const userId = (payload as any).userId
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true },
			})
			userRole = user?.role
		}
		
		if (userRole !== 'admin') {
			console.log('❌ Не админ. Роль:', userRole)
			return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
		}

		console.log('✅ Аутентификация прошла успешно')

		const feedbacks = await prisma.feedback.findMany({
			orderBy: { createdAt: 'desc' },
		})

		console.log(`✅ Получено ${feedbacks.length} отзывов`)

		return NextResponse.json({ feedbacks }, { status: 200 })
	} catch (error) {
		console.error('❌ Ошибка при получении обратной связи:', error)
		return NextResponse.json(
			{ 
				error: 'Не удалось получить обратную связь',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}

