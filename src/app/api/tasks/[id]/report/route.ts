import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		console.log('📝 Получен запрос на создание жалобы')
		
		const user = await getUserFromRequest(req)
		if (!user) {
			console.log('❌ Пользователь не авторизован')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { id: taskId } = await params
		console.log('🎯 Task ID:', taskId)
		
		const { reason, description } = await req.json()
		console.log('📋 Reason:', reason, 'Description:', description)

		if (!reason || !reason.trim()) {
			return NextResponse.json(
				{ error: 'Укажите причину жалобы' },
				{ status: 400 }
			)
		}

		// Проверяем существование задачи
		const task = await prisma.task.findUnique({
			where: { id: taskId },
		})

		if (!task) {
			return NextResponse.json(
				{ error: 'Задача не найдена' },
				{ status: 404 }
			)
		}

		// Создаём жалобу
		console.log('💾 Создание жалобы в БД...')
		const report = await prisma.communityReport.create({
			data: {
				type: 'task',
				taskId: taskId,
				reason,
				description: description?.trim() || null,
				reporterId: user.id,
			},
		})

		console.log('✅ Жалоба создана:', report.id)
		return NextResponse.json(
			{ success: true, report },
			{ status: 201 }
		)
	} catch (error: any) {
		console.error('❌ Ошибка создания жалобы:', error)
		console.error('Stack:', error.stack)
		return NextResponse.json(
			{ error: 'Ошибка сервера: ' + (error.message || String(error)) },
			{ status: 500 }
		)
	}
}

