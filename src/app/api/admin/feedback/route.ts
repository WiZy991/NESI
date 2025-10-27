import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/jwt'

export async function GET(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '')

		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const payload = verifyJWT(token)
		if (!payload || (payload as any).role !== 'admin') {
			return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
		}

		const feedbacks = await prisma.feedback.findMany({
			orderBy: { createdAt: 'desc' },
		})

		return NextResponse.json({ feedbacks }, { status: 200 })
	} catch (error) {
		console.error('Ошибка при получении обратной связи:', error)
		return NextResponse.json(
			{ error: 'Не удалось получить обратную связь' },
			{ status: 500 }
		)
	}
}

