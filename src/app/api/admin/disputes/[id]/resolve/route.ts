import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
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

	const notificationsToDispatch: Array<{
		userId: string
		payload: {
			id: string
			type: string
			title: string
			message: string
			link: string
			taskTitle: string
			playSound: boolean
		}
	}> = []

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
				},
			})

			await tx.transaction.create({
				data: {
					userId: task.customerId,
					amount: escrowDecimal,
					type: 'refund',
					reason: `Возврат средств по решению спора по задаче "${task.title}"`,
					taskId: task.id,
					status: 'completed',
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
				},
			})

			await tx.transaction.createMany({
				data: [
					{
						userId: task.customerId,
						amount: new Prisma.Decimal(-escrowNum),
						type: 'payment',
						reason: `Оплата за задачу "${task.title}" (по решению спора)`,
						taskId: task.id,
						status: 'completed',
					},
					{
						userId: task.customerId,
						amount: new Prisma.Decimal(-commission),
						type: 'commission',
						reason: `Комиссия 20% с задачи "${task.title}" (по решению спора)`,
						taskId: task.id,
						status: 'completed',
					},
				],
			})

			// Исполнителю: начисляем выплату (80%)
			if (task.executorId) {
				await tx.user.update({
					where: { id: task.executorId },
					data: {
						balance: { increment: payoutDecimal },
					},
				})

				await tx.transaction.create({
					data: {
						userId: task.executorId,
						amount: payoutDecimal,
						type: 'earn',
						reason: `Выплата за задачу "${task.title}" (по решению спора)`,
						taskId: task.id,
						status: 'completed',
					},
				})
			}

			// Владельцу платформы: начисляем комиссию (20%)
			if (platformOwnerId) {
				await tx.user.update({
					where: { id: platformOwnerId },
					data: {
						balance: { increment: commissionDecimal },
					},
				})

				await tx.transaction.create({
					data: {
						userId: platformOwnerId,
						amount: commissionDecimal,
						type: 'commission',
						reason: `Комиссия платформы 20% с задачи "${task.title}" (по решению спора)`,
						taskId: task.id,
						status: 'completed',
					},
				})
			}
		}

		// Создаём уведомления для обеих сторон в рамках транзакции
		const customerMessage =
			decision === 'customer'
				? `Спор по задаче "${task.title}" разрешён в вашу пользу. Средства возвращены на баланс.`
				: `Спор по задаче "${task.title}" разрешён в пользу исполнителя. Средства переведены исполнителю.`

		const executorMessage =
			decision === 'executor'
				? `Спор по задаче "${task.title}" разрешён в вашу пользу. Вам начислено ${formatMoney(payout)}.`
				: `Спор по задаче "${task.title}" разрешён в пользу заказчика.`

		const customerNotification = await tx.notification.create({
			data: {
				userId: task.customerId,
				type: 'dispute',
				message: customerMessage,
				link: `/tasks/${task.id}`,
			},
		})

		notificationsToDispatch.push({
			userId: task.customerId,
			payload: {
				id: customerNotification.id,
				type: 'dispute',
				title: 'Спор разрешён',
				message: customerMessage,
				link: `/tasks/${task.id}`,
				taskTitle: task.title,
				playSound: true,
			},
		})

		if (task.executorId) {
			const executorNotification = await tx.notification.create({
				data: {
					userId: task.executorId,
					type: decision === 'executor' ? 'payment' : 'dispute',
					message: executorMessage,
					link: `/tasks/${task.id}`,
				},
			})

			notificationsToDispatch.push({
				userId: task.executorId,
				payload: {
					id: executorNotification.id,
					type: decision === 'executor' ? 'payment' : 'dispute',
					title: 'Спор разрешён',
					message: executorMessage,
					link: `/tasks/${task.id}`,
					taskTitle: task.title,
					playSound: true,
				},
			})
		}

		return updated
	})

	// Отправляем уведомления в реальном времени после успешной транзакции
	for (const notification of notificationsToDispatch) {
		try {
			sendNotificationToUser(notification.userId, notification.payload)
		} catch (err) {
			console.error('Ошибка отправки SSE уведомления по спору:', err)
		}
	}

	return NextResponse.json({ success: true })
}