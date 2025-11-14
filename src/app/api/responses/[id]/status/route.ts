import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recordTaskResponseStatus, TASK_RESPONSE_STATUSES } from '@/lib/taskResponseStatus'
import { logger } from '@/lib/logger'

const ALLOWED_STATUSES = new Set(TASK_RESPONSE_STATUSES)

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: responseId } = await params
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		if (!responseId) {
			return NextResponse.json({ error: 'Некорректный идентификатор' }, { status: 400 })
		}

		let body: { status?: unknown; note?: unknown }
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		const statusInput = body?.status
		const note = typeof body?.note === 'string' ? body.note : undefined

		if (typeof statusInput !== 'string') {
			return NextResponse.json({ error: 'Статус обязателен' }, { status: 400 })
		}

		const status = statusInput as (typeof TASK_RESPONSE_STATUSES)[number]
		if (!ALLOWED_STATUSES.has(status)) {
			return NextResponse.json({ error: 'Недопустимый статус' }, { status: 400 })
		}

		const response = await prisma.taskResponse.findUnique({
			where: { id: responseId },
			select: {
				id: true,
				userId: true,
				status: true,
				task: {
					select: {
						customerId: true,
					},
				},
				user: {
					select: {
						id: true,
					},
				},
			},
		})

		if (!response) {
			return NextResponse.json({ error: 'Отклик не найден' }, { status: 404 })
		}

		const isExecutor = response.userId === user.id
		const isCustomer = response.task.customerId === user.id
		const isAdmin = user.role === 'admin'

		if (!isExecutor && !isCustomer && !isAdmin) {
			return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
		}

		if (response.status === status && !note) {
			const fresh = await prisma.taskResponse.findUnique({
				where: { id: responseId },
				include: {
					task: {
						select: {
							id: true,
							title: true,
							customerId: true,
							customer: {
								select: {
									id: true,
									fullName: true,
									email: true,
								},
							},
						},
					},
					statusHistory: {
						orderBy: { createdAt: 'asc' },
						include: {
							changedBy: { select: { id: true, fullName: true, email: true } },
						},
					},
				},
			})
			return NextResponse.json({ response: fresh })
		}

		await recordTaskResponseStatus(responseId, status, {
			changedById: user.id,
			note,
		})

		const fresh = await prisma.taskResponse.findUnique({
			where: { id: responseId },
			include: {
				task: {
					select: {
						id: true,
						title: true,
						customerId: true,
						customer: {
							select: {
								id: true,
								fullName: true,
								email: true,
							},
						},
					},
				},
				statusHistory: {
					orderBy: { createdAt: 'asc' },
					include: {
						changedBy: { select: { id: true, fullName: true, email: true } },
					},
				},
			},
		})

		return NextResponse.json({ response: fresh })
	} catch (err: unknown) {
		let responseId: string | undefined
		try {
			const p = await params
			responseId = p.id
		} catch {
			// Игнорируем ошибку получения params
		}
		logger.error('Ошибка при изменении статуса отклика', err, {
			responseId,
		})
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

