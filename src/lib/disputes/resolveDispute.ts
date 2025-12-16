import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { formatMoney, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { calculateCommissionRate } from '@/lib/level/rewards'

type DisputeDecision = 'customer' | 'executor'

type DispatchableNotification = {
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
}

type ResolveDisputeResult = {
	dispute: any
	notifications: DispatchableNotification[]
}

export async function resolveDisputeWithFinancials({
	disputeId,
	decision,
	comment,
}: {
	disputeId: string
	decision: DisputeDecision
	comment?: string | null
}): Promise<ResolveDisputeResult> {
	const dispute = await prisma.dispute.findUnique({
		where: { id: disputeId },
		include: {
			Task: {
				select: {
					id: true,
					title: true,
					customerId: true,
					executorId: true,
					escrowAmount: true,
				},
			},
		},
	})

	if (!dispute) {
		throw new Error('DISPUTE_NOT_FOUND')
}

	if (!dispute.Task) {
		throw new Error('TASK_NOT_FOUND')
	}

	const task = dispute.Task
	const escrowNum = toNumber(task.escrowAmount || 0)

	// Получаем XP исполнителя для расчета комиссии
	let commissionRate = 0.10 // По умолчанию 10%
	if (task.executorId) {
		const executor = await prisma.user.findUnique({
			where: { id: task.executorId },
			select: { xp: true },
		})
		
		const baseXp = executor?.xp || 0
		const passedTests = await prisma.certificationAttempt.count({
			where: { userId: task.executorId, passed: true },
		})
		const executorXP = baseXp + passedTests * 10
		
		// Рассчитываем комиссию с учетом бесплатных первых 3 задач и уровня
		commissionRate = await calculateCommissionRate(executorXP, task.executorId)
	}

	const commission = Math.floor(escrowNum * 100 * commissionRate) / 100
	const payout = escrowNum - commission

	const commissionDecimal = new Prisma.Decimal(commission)
	const payoutDecimal = new Prisma.Decimal(payout)
	const escrowDecimal = new Prisma.Decimal(escrowNum)

	const platformOwnerId = process.env.PLATFORM_OWNER_ID

	const notificationsToDispatch: DispatchableNotification[] = []

	const updatedDispute = await prisma.$transaction(async tx => {
		const updated = await tx.dispute.update({
			where: { id: disputeId },
			data: {
				status: 'resolved',
				resolution: comment || null,
				resolvedAt: new Date(),
				adminDecision: decision,
			},
		})

		if (decision === 'customer') {
			await tx.task.update({
				where: { id: task.id },
				data: {
					status: 'cancelled',
					escrowAmount: new Prisma.Decimal(0),
				},
			})

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
		} else {
			// КРИТИЧНО: Находим DealId заказчика для сохранения в транзакции исполнителя
			// Это нужно для вывода средств исполнителем через Т-Банк
			const customerDepositTx = await tx.transaction.findFirst({
				where: {
					userId: task.customerId,
					type: 'deposit',
					dealId: { not: null },
					paymentId: { not: null },
				},
				orderBy: { createdAt: 'desc' },
				select: { dealId: true },
			})
			
			const customerDealId = customerDepositTx?.dealId
				? String(customerDepositTx.dealId)
				: null

			// НЕ помечаем задачу как 'completed', чтобы сделка не закрывалась
			// Только обнуляем escrowAmount
			await tx.task.update({
				where: { id: task.id },
				data: {
					escrowAmount: new Prisma.Decimal(0),
					// Статус остаётся 'in_progress', чтобы сделка оставалась открытой
				},
			})

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
						reason: `Комиссия ${Math.round(commissionRate * 100)}% с задачи "${task.title}" (по решению спора)`,
						taskId: task.id,
						status: 'completed',
					},
				],
			})

			if (task.executorId) {
				await tx.user.update({
					where: { id: task.executorId },
					data: {
						balance: { increment: payoutDecimal },
						completedTasksCount: { increment: 1 }, // ✅ Увеличиваем счётчик для комиссии
					},
				})

				// КРИТИЧНО: Сохраняем DealId заказчика в транзакции исполнителя
				// Это нужно для вывода средств через Т-Банк
				await tx.transaction.create({
					data: {
						userId: task.executorId,
						amount: payoutDecimal,
						type: 'earn',
						reason: `Выплата за задачу "${task.title}" (по решению спора)`,
						taskId: task.id,
						dealId: customerDealId, // Сохраняем DealId для вывода через Т-Банк
						status: 'completed',
					},
				})
			}

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
						reason: `Комиссия платформы ${Math.round(commissionRate * 100)}% с задачи "${task.title}" (по решению спора)`,
						taskId: task.id,
						dealId: customerDealId, // Сохраняем DealId для вывода комиссии
						status: 'completed',
					},
				})
			}
		}

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

	return {
		dispute: updatedDispute,
		notifications: notificationsToDispatch,
	}
}

export async function dispatchDisputeNotifications(
	notifications: DispatchableNotification[]
) {
	for (const notification of notifications) {
		try {
			sendNotificationToUser(notification.userId, notification.payload)
		} catch (err) {
			console.error('Ошибка отправки SSE уведомления по спору:', err)
		}
	}
}

