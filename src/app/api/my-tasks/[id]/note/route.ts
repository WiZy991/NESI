'use server'

import { NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

type RouteParams = {
	id?: string
	taskId?: string
}

export async function PATCH(
	req: Request,
	{ params }: { params: RouteParams }
) {
	try {
		const taskId = params.id || params.taskId
		if (!taskId) {
			return NextResponse.json({ error: 'Не указан идентификатор задачи' }, { status: 400 })
		}

		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		if (user.role !== 'executor') {
			return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
		}

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: { executorId: true },
		})

		if (!task) {
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
		}

		if (task.executorId !== user.id) {
			return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 })
		}

		let payload: unknown
		try {
			payload = await req.json()
		} catch {
			return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
		}

		let noteValue = ''
		if (
			typeof payload === 'object' &&
			payload !== null &&
			'note' in payload &&
			typeof (payload as { note: unknown }).note === 'string'
		) {
			noteValue = ((payload as { note: string }).note || '').trim()
		}

		const updated = await prisma.task.update({
			where: { id: taskId },
			data: {
				executorNote: noteValue.length > 0 ? noteValue : null,
			},
			select: {
				id: true,
				executorNote: true,
			},
		})

		return NextResponse.json({ task: updated })
	} catch (error) {
		logger.error('Ошибка при обновлении заметки исполнителя', error, { userId: user?.id, taskId })
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

