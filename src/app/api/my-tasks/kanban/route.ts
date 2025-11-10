'use server'

import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/antifraud'
import prisma from '@/lib/prisma'

const VALID_COLUMNS = new Set(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const)

type KanbanColumnType = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

type KanbanUpdate = {
	id: string
	column: KanbanColumnType
	order: number
}

type RawKanbanUpdate = {
	id?: unknown
	column?: unknown
	order?: unknown
}

function extractRawUpdates(value: unknown): RawKanbanUpdate[] | null {
	if (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray((value as { updates?: unknown }).updates)
	) {
		return (value as { updates: RawKanbanUpdate[] }).updates
	}
	return null
}

export async function PATCH(req: NextRequest) {
	const user = await getUserFromRequest(req)

	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	if (user.role !== 'executor') {
		return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
	}

	let payload: unknown
	try {
		payload = await req.json()
	} catch {
		return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 })
	}

	const rawUpdates = extractRawUpdates(payload)

	if (!rawUpdates || rawUpdates.length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	const sanitized: KanbanUpdate[] = []
	const seenIds = new Set<string>()

	for (const update of rawUpdates) {
		if (!update || typeof update.id !== 'string') {
			return NextResponse.json({ error: 'Некорректный идентификатор задачи' }, { status: 400 })
		}

		const columnCandidate =
			typeof update.column === 'string' ? update.column.toUpperCase() : ''
		const column = columnCandidate as KanbanColumnType
		if (!VALID_COLUMNS.has(column)) {
			return NextResponse.json(
				{ error: `Некорректная колонка: ${update.column}` },
				{ status: 400 }
			)
		}

		const order =
			typeof update.order === 'number'
				? update.order
				: Number(update.order ?? Number.NaN)
		if (!Number.isFinite(order) || order < 0) {
			return NextResponse.json({ error: 'Некорректный порядок задачи' }, { status: 400 })
		}

		if (seenIds.has(update.id)) {
			return NextResponse.json(
				{ error: 'Некорректные данные: дублирующийся идентификатор задачи' },
				{ status: 400 }
			)
		}
		seenIds.add(update.id)

		sanitized.push({ id: update.id, column, order })
	}

	const taskIds = sanitized.map(item => item.id)
	const ownedTasks = await prisma.task.findMany({
		where: {
			id: { in: taskIds },
			executorId: user.id,
		},
		select: { id: true },
	})

	if (ownedTasks.length !== sanitized.length) {
		return NextResponse.json(
			{ error: 'Некоторые задачи не принадлежат текущему пользователю' },
			{ status: 403 }
		)
	}

	try {
		await prisma.$transaction(
			sanitized.map(update =>
				prisma.task.update({
					where: { id: update.id },
					data: {
						executorKanbanColumn: update.column,
						executorKanbanOrder: update.order,
					},
				})
			)
		)
	} catch (error) {
		console.error('Ошибка обновления executor kanban:', error)
		return NextResponse.json({ error: 'Не удалось обновить канбан' }, { status: 500 })
	}

	await logActivity(user.id, 'executor_kanban_update', req, {
		updates: sanitized,
	})

	return NextResponse.json({ success: true })
}

