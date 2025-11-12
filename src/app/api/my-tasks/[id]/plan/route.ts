'use server'

import { NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

type RouteParams = {
	id?: string
	taskId?: string
}

type PlanPayload = {
	plannedStart?: string | null
	plannedDeadline?: string | null
	planNote?: string | null
}

function parseDate(value: unknown): Date | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed) return null
	const date = new Date(trimmed)
	return Number.isNaN(date.getTime()) ? null : date
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

		let payload: PlanPayload
		try {
			payload = (await req.json()) as PlanPayload
		} catch {
			return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
		}

		const plannedStart = parseDate(payload.plannedStart)
		const plannedDeadline = parseDate(payload.plannedDeadline)
		const planNote =
			typeof payload.planNote === 'string' && payload.planNote.trim().length > 0
				? payload.planNote.trim()
				: null

		const updated = await prisma.task.update({
			where: { id: taskId },
			data: {
				executorPlannedStart: plannedStart,
				executorPlannedDeadline: plannedDeadline,
				executorPlanNote: planNote,
			},
			select: {
				id: true,
				executorPlannedStart: true,
				executorPlannedDeadline: true,
				executorPlanNote: true,
			},
		})

		return NextResponse.json({ plan: updated })
	} catch (error) {
		logger.error('Ошибка при обновлении персонального плана исполнителя', error, { userId: user?.id, taskId })
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

