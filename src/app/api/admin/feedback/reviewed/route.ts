import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/jwt'

export async function POST(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '')

		if (!token) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const payload = verifyJWT(token)
		if (!payload || (payload as any).role !== 'admin') {
			return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
		}

		const { id } = await request.json()

		const feedback = await prisma.feedback.update({
			where: { id },
			data: {
				status: 'reviewed',
				reviewedAt: new Date(),
				reviewedBy: (payload as any).userId,
			},
		})

		return NextResponse.json({ success: true, feedback }, { status: 200 })
	} catch (error) {
		console.error('Ошибка при обновлении статуса:', error)
		return NextResponse.json(
			{ error: 'Не удалось обновить статус' },
			{ status: 500 }
		)
	}
}

