import { getUserFromRequest } from '@/lib/auth'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * API для ответа исполнителя на запрос об отмене
 * POST /api/tasks/[id]/cancel/respond
 * Body: { action: 'accept' | 'dispute' }
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: taskId } = await params
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { action } = await req.json()
		if (!['accept', 'dispute'].includes(action)) {
			return NextResponse.json(
				{ error: 'Неверное действие. Используйте accept или dispute' },
				{ status: 400 }
			)
		}

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				id: true,
				title: true,
				customerId: true,
				executorId: true,
				status: true,
				escrowAmount: true,
				cancellationRequestedAt: true,
			},
		})

		if (!task)
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })

		if (task.executorId !== user.id) {
			return NextResponse.json(
				{ error: 'Только исполнитель может ответить на запрос об отмене' },
				{ status: 403 }
			)
		}

		if (!task.cancellationRequestedAt) {
			return NextResponse.json(
				{ error: 'Нет активного запроса на отмену' },
				{ status: 400 }
			)
		}

		if (action === 'accept') {
			// Исполнитель согласен с отменой
			const escrowNum = toNumber(task.escrowAmount)
			if (escrowNum > 0) {
				const escrowDecimal = new Prisma.Decimal(escrowNum)

				await prisma.$transaction([
					prisma.user.update({
						where: { id: task.customerId },
						data: {
							frozenBalance: { decrement: escrowDecimal },
						},
					}),
					prisma.transaction.create({
						data: {
							userId: task.customerId,
							amount: new Prisma.Decimal(0),
							type: 'refund',
							reason: `Разморозка средств за отмену задачи "${task.title}" (исполнитель согласился)`,
						},
					}),
				])
			}

			await prisma.task.update({
				where: { id: taskId },
				data: {
					executorId: null,
					status: 'open',
					escrowAmount: new Prisma.Decimal(0),
					cancellationRequestedAt: null,
					cancellationReason: null,
				},
			})

			await prisma.notification.create({
				data: {
					userId: task.customerId,
					type: 'task_cancelled',
					message: `Исполнитель согласился с отменой задачи: ${task.title}`,
					link: `/tasks/${task.id}`,
				},
			})

			return NextResponse.json({ success: true, message: 'Отмена подтверждена' })
		} else {
			// Исполнитель оспаривает отмену - НЕ создаем спор автоматически
			// Форма спора откроется на фронте, спор будет создан через /api/disputes
			// Просто возвращаем успех, чтобы фронт мог открыть форму
			return NextResponse.json({
				success: true,
				message: 'Откройте форму спора',
				shouldOpenDispute: true,
			})
		}
	} catch (err: unknown) {
		logger.error('Ошибка при ответе на запрос об отмене', err, {
			taskId: (await params).id,
			userId: user?.id,
		})
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

