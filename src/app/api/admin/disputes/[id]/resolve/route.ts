import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/createNotification'
import { formatMoney, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	const admin = await getUserFromRequest(req)
	if (!admin || admin.role !== 'admin') {
		return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
	}

	const { id } = params
	const { decision, comment } = await req.json()

	if (!['customer', 'executor'].includes(decision)) {
		return NextResponse.json({ error: 'Неверное решение' }, { status: 400 })
	}

	const dispute = await (prisma as any).dispute.findUnique({
		where: { id },
		include: {
			Task: {
				include: {
					customer: { select: { id: true, fullName: true, email: true } },
					executor: { select: { id: true, fullName: true, email: true } },
				},
			},
		},
	})
	if (!dispute) {
		return NextResponse.json({ error: 'Спор не найден' }, { status: 404 })
	}

	const task = dispute.Task
	const escrowNum = toNumber(task.escrowAmount || 0)

	// Вычисляем комиссию 20% и выплату
	const commission = Math.floor(escrowNum * 100 * 0.2) / 100
	const payout = escrowNum - commission

	const commissionDecimal = new Prisma.Decimal(commission)
	const payoutDecimal = new Prisma.Decimal(payout)
	const escrowDecimal = new Prisma.Decimal(escrowNum)

	// Получаем ID владельца платформы
	const platformOwnerId = process.env.PLATFORM_OWNER_ID

	// Обновляем статус спора и обрабатываем деньги в транзакции
	await prisma.$transaction(async tx => {
		// Обновляем статус спора
		const updated = await (tx as any).dispute.update({
			where: { id },
			data: {
				status: 'resolved',
				resolution: comment || null,
				resolvedAt: new Date(),
				adminDecision: decision,
			},
		})

		if (decision === 'customer') {
			// Решение в пользу заказчика - возвращаем деньги
			await tx.task.update({
				where: { id: dispute.taskId },
				data: {
					status: 'cancelled',
					escrowAmount: new Prisma.Decimal(0),
				},
			})

			// Размораживаем средства заказчика
			await tx.user.update({
				where: { id: task.customerId },
				data: {
					frozenBalance: { decrement: escrowDecimal },
					transactions: {
						create: {
							amount: new Prisma.Decimal(0),
							type: 'refund',
							reason: `Возврат средств по решению спора по задаче "${task.title}"`,
							taskId: task.id,
						},
					},
				},
			})
		} else if (decision === 'executor') {
			// Решение в пользу исполнителя - переводим деньги как при завершении задачи
			await tx.task.update({
				where: { id: dispute.taskId },
				data: {
					status: 'completed',
					completedAt: new Date(),
					escrowAmount: new Prisma.Decimal(0),
				},
			})

			// У заказчика: списываем с баланса и размораживаем
			await tx.user.update({
				where: { id: task.customerId },
				data: {
					balance: { decrement: escrowDecimal },
					frozenBalance: { decrement: escrowDecimal },
					transactions: {
						create: [
							{
								amount: new Prisma.Decimal(-escrowNum),
								type: 'payment',
								reason: `Оплата за задачу "${task.title}" (по решению спора)`,
								taskId: task.id,
							},
							{
								amount: new Prisma.Decimal(-commission),
								type: 'commission',
								reason: `Комиссия 20% с задачи "${task.title}" (по решению спора)`,
								taskId: task.id,
							},
						],
					},
				},
			})

			// Исполнителю: начисляем выплату (80%)
			await tx.user.update({
				where: { id: task.executorId },
				data: {
					balance: { increment: payoutDecimal },
					transactions: {
						create: {
							amount: payoutDecimal,
							type: 'earn',
							reason: `Выплата за задачу "${task.title}" (по решению спора)`,
							taskId: task.id,
						},
					},
				},
			})

			// Владельцу платформы: начисляем комиссию (20%)
			if (platformOwnerId) {
				await tx.user.update({
					where: { id: platformOwnerId },
					data: {
						balance: { increment: commissionDecimal },
						transactions: {
							create: {
								amount: commissionDecimal,
								type: 'commission',
								reason: `Комиссия платформы 20% с задачи "${task.title}" (по решению спора)`,
								taskId: task.id,
							},
						},
					},
				})
			}
		}

		// Создаём уведомления для обеих сторон
		const customerMessage =
			decision === 'customer'
				? `Спор по задаче "${task.title}" разрешён в вашу пользу. Средства возвращены на баланс.`
				: `Спор по задаче "${task.title}" разрешён в пользу исполнителя. Средства переведены исполнителю.`

		const executorMessage =
			decision === 'executor'
				? `Спор по задаче "${
						task.title
				  }" разрешён в вашу пользу. Вам начислено ${formatMoney(payout)}.`
				: `Спор по задаче "${task.title}" разрешён в пользу заказчика.`

		// Создаём уведомления в БД
		await createNotification(
			task.customerId,
			customerMessage,
			`/tasks/${task.id}`,
			'dispute'
		)

		if (task.executorId) {
			await createNotification(
				task.executorId,
				executorMessage,
				`/tasks/${task.id}`,
				'dispute'
			)
		}

		// Отправляем уведомления в реальном времени
		sendNotificationToUser(task.customerId, {
			type: 'dispute',
			title: 'Спор разрешён',
			message: customerMessage,
			link: `/tasks/${task.id}`,
			taskTitle: task.title,
			playSound: true,
		}).catch(err =>
			console.error('Ошибка отправки уведомления заказчику:', err)
		)

		if (task.executorId) {
			sendNotificationToUser(task.executorId, {
				type: 'dispute',
				title: 'Спор разрешён',
				message: executorMessage,
				link: `/tasks/${task.id}`,
				taskTitle: task.title,
				playSound: true,
			}).catch(err =>
				console.error('Ошибка отправки уведомления исполнителю:', err)
			)
		}

		return updated
	})

	return NextResponse.json({ success: true })
}
