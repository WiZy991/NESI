import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recordTaskResponseStatus, TASK_RESPONSE_STATUSES } from '@/lib/taskResponseStatus'

const ALLOWED_STATUSES = new Set(TASK_RESPONSE_STATUSES)

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	const responseId = params.id
	if (!responseId) {
		return NextResponse.json({ error: 'Некорректный идентификатор' }, { status: 400 })
	}

	const body = await req.json().catch(() => ({}))
	const statusInput = body?.status
	const note: string | undefined = body?.note

	if (typeof statusInput !== 'string') {
		return NextResponse.json({ error: 'Статус обязателен' }, { status: 400 })
	}

	const status = statusInput as (typeof TASK_RESPONSE_STATUSES)[number]
	if (!ALLOWED_STATUSES.has(status)) {
		return NextResponse.json({ error: 'Недопустимый статус' }, { status: 400 })
	}

	const response = await prisma.taskResponse.findUnique({
		where: { id: responseId },
		include: {
			task: { select: { customerId: true } },
			user: { select: { id: true } },
		} as any,
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

	if ((response as any).status === status && !note) {
		const fresh = await prisma.taskResponse.findUnique({
			where: { id: responseId },
			include: {
				task: {
					include: { customer: true },
				},
				statusHistory: {
					orderBy: { createdAt: 'asc' },
					include: {
						changedBy: { select: { id: true, fullName: true, email: true } },
					},
				},
			} as any,
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
				include: { customer: true },
			},
			statusHistory: {
				orderBy: { createdAt: 'asc' },
				include: {
					changedBy: { select: { id: true, fullName: true, email: true } },
				},
			},
		} as any,
	})

	return NextResponse.json({ response: fresh })
}

