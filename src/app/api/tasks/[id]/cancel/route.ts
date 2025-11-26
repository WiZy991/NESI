import { getUserFromRequest } from '@/lib/auth'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: taskId } = await params
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				id: true,
				title: true,
				customerId: true,
				executorId: true,
				status: true,
				escrowAmount: true,
			},
		})

		if (!task)
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })

		if (task.customerId !== user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const validStatuses = ['in_progress', 'in progress', 'in-progress']
		if (!task.executorId || !validStatuses.includes(task.status)) {
			return NextResponse.json(
				{ error: `Task is not in progress (actual status = "${task.status}")` },
				{ status: 400 }
			)
		}

		// Проверяем, есть ли уже запрос на отмену
		const existingTask = await prisma.task.findUnique({
			where: { id: taskId },
			select: { cancellationRequestedAt: true },
		})

		if (existingTask?.cancellationRequestedAt) {
			// Запрос уже существует - возвращаем ошибку
			return NextResponse.json(
				{ error: 'Запрос на отмену уже отправлен. Ожидайте ответа исполнителя.' },
				{ status: 400 }
			)
		}

		// Создаем запрос на отмену (НЕ отменяем сразу!)
		const { reason } = await req.json().catch(() => ({}))
		
		await prisma.task.update({
			where: { id: taskId },
			data: {
				cancellationRequestedAt: new Date(),
				cancellationReason: reason || null,
			},
		})

		if (task.executorId) {
			await prisma.notification.create({
				data: {
					userId: task.executorId,
					type: 'task_cancelled',
					message: `Заказчик запросил отмену задачи: ${task.title}`,
					link: `/tasks/${task.id}`,
				},
			})
		}

		return NextResponse.json({ success: true })
	} catch (err: unknown) {
		logger.error('Ошибка при отмене задачи', err, {
			taskId,
			userId: user?.id,
		})
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}
