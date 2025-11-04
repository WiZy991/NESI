import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
	try {
		const user = await getUserFromRequest(request)
		
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		
		if (user.role !== 'admin') {
			return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
		}

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

