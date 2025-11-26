import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWithZod } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'

// Схема валидации для создания спора
const createDisputeSchema = z.object({
	taskId: z.string().min(1, 'ID задачи обязателен'),
	reason: z
		.string()
		.min(1, 'Причина спора обязательна')
		.max(1000, 'Причина слишком длинная (максимум 1000 символов)')
		.trim(),
	details: z
		.string()
		.max(2000, 'Детали слишком длинные (максимум 2000 символов)')
		.trim()
		.optional(),
})

// 📦 Получить споры пользователя
export async function GET(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const disputes = await (prisma as any).dispute.findMany({
		where: { userId: user.id },
		include: {
			Task: {
				select: { id: true, title: true, status: true },
			},
		},
		orderBy: { createdAt: 'desc' },
	})

	return NextResponse.json({ disputes })
}

// ⚡ Создать спор по задаче
export async function POST(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	let body
	try {
		body = await req.json()
	} catch (error) {
		return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
	}

	// Валидация данных
	const validation = validateWithZod(createDisputeSchema, body)
	if (!validation.success) {
		return NextResponse.json(
			{ error: validation.errors.join(', ') },
			{ status: 400 }
		)
	}

	const { taskId, reason, details } = validation.data

	// Дополнительная валидация длины полей
	const reasonValidation = validateStringLength(reason, 1000, 'Причина спора')
	if (!reasonValidation.valid) {
		return NextResponse.json(
			{ error: reasonValidation.error },
			{ status: 400 }
		)
	}

	if (details) {
		const detailsValidation = validateStringLength(details, 2000, 'Детали спора')
		if (!detailsValidation.valid) {
			return NextResponse.json(
				{ error: detailsValidation.error },
				{ status: 400 }
			)
		}
	}

	// Проверяем, связан ли пользователь с задачей
	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			OR: [{ customerId: user.id }, { executorId: user.id }],
		},
	})

	if (!task) {
		return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 })
	}

	// Проверяем, что задача в статусе "В работе"
	if (task.status !== 'in_progress') {
		return NextResponse.json({ error: 'Спор можно создать только для задачи в статусе "В работе"' }, { status: 400 })
	}

	// Проверяем, не существует ли уже спор по этой задаче
	const existing = await (prisma as any).dispute.findFirst({
		where: { taskId },
	})
	if (existing) {
		return NextResponse.json({ error: 'Спор уже создан' }, { status: 400 })
	}

	// Создаём новый спор и сбрасываем запрос на отмену (если был)
	const dispute = await prisma.$transaction(async (tx) => {
		const newDispute = await (tx as any).dispute.create({
			data: {
				id: `dispute_${taskId}_${Date.now()}`,
				taskId,
				userId: user.id,
				reason,
				details,
				status: 'open',
			},
		})

		// Сбрасываем запрос на отмену, так как создан спор
		await tx.task.update({
			where: { id: taskId },
			data: {
				cancellationRequestedAt: null,
				cancellationReason: null,
			},
		})

		return newDispute
	})

	return NextResponse.json({ dispute })
}
