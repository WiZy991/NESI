import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { validateStringLength } from '@/lib/security'

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		logger.debug('Получен запрос на создание жалобы')
		
		const user = await getUserFromRequest(req)
		if (!user) {
			logger.warn('Пользователь не авторизован при создании жалобы')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { id: taskId } = await params
		logger.debug('Создание жалобы на задачу', { taskId, userId: user.id })
		
		let body
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		const { reason, description } = body || {}

		// Валидация причины жалобы
		if (!reason || typeof reason !== 'string' || !reason.trim()) {
			return NextResponse.json(
				{ error: 'Укажите причину жалобы' },
				{ status: 400 }
			)
		}

		const reasonValidation = validateStringLength(reason.trim(), 200, 'Причина жалобы')
		if (!reasonValidation.valid) {
			return NextResponse.json(
				{ error: reasonValidation.error },
				{ status: 400 }
			)
		}

		// Валидация описания (если указано)
		if (description && typeof description === 'string') {
			const descriptionValidation = validateStringLength(description.trim(), 1000, 'Описание жалобы')
			if (!descriptionValidation.valid) {
				return NextResponse.json(
					{ error: descriptionValidation.error },
					{ status: 400 }
				)
			}
		}

		// Проверяем существование задачи
		const task = await prisma.task.findUnique({
			where: { id: taskId },
		})

		if (!task) {
			logger.warn('Задача не найдена при создании жалобы', { taskId })
			return NextResponse.json(
				{ error: 'Задача не найдена' },
				{ status: 404 }
			)
		}

		// Создаём жалобу
		const report = await prisma.communityReport.create({
			data: {
				type: 'task',
				taskId: taskId,
				reason: reason.trim(),
				description: description && typeof description === 'string' ? description.trim() : null,
				reporterId: user.id,
			},
		})

		logger.info('Жалоба создана', { reportId: report.id, taskId, userId: user.id })
		return NextResponse.json(
			{ success: true, report },
			{ status: 201 }
		)
	} catch (error: any) {
		logger.error('Ошибка создания жалобы', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера: ' + (error.message || String(error)) },
			{ status: 500 }
		)
	}
}

