import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
	try {
		const user = await getUserFromRequest(request)
		
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		
		if (user.role !== 'admin') {
			return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
		}

		const { id, notes } = await request.json()

		const feedback = await prisma.feedback.update({
			where: { id },
			data: { notes },
		})

		return NextResponse.json({ success: true, feedback }, { status: 200 })
	} catch (error) {
		console.error('Ошибка при добавлении заметок:', error)
		return NextResponse.json(
			{ error: 'Не удалось сохранить заметки' },
			{ status: 500 }
		)
	}
}

