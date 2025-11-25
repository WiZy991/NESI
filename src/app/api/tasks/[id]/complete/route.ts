// app/api/tasks/[id]/complete/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { formatMoney, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { awardXP } from '@/lib/level/awardXP'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'
import { logger } from '@/lib/logger'
import { calculateCommissionRate } from '@/lib/level/rewards'

export async function PATCH(req: NextRequest, { params }: any) {
	try {
		const { id } = params
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const task = await prisma.task.findUnique({
		where: { id },
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
		if (task.customerId !== user.id)
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		if (task.status !== 'in_progress')
			return NextResponse.json(
				{ error: 'Можно завершить только задачу в работе' },
				{ status: 400 }
			)
		if (!task.executorId)
			return NextResponse.json(
				{ error: 'У задачи нет назначенного исполнителя' },
				{ status: 400 }
			)

		// Вычисляем комиссию на основе уровня исполнителя
		const escrowNum = toNumber(task.escrowAmount)
		
		// Получаем XP исполнителя для расчета комиссии
		const executor = await prisma.user.findUnique({
			where: { id: task.executorId },
			select: { xp: true },
		})
		
		const baseXp = executor?.xp || 0
		const passedTests = await prisma.certificationAttempt.count({
			where: { userId: task.executorId, passed: true },
		})
		const executorXP = baseXp + passedTests * 10
		
		// Рассчитываем комиссию на основе уровня
		const commissionRate = await calculateCommissionRate(executorXP)
		const commission = Math.floor(escrowNum * 100 * commissionRate) / 100 // Округляем до копеек
		const payout = escrowNum - commission

		const commissionDecimal = new Prisma.Decimal(commission)
		const payoutDecimal = new Prisma.Decimal(payout)

		// 💰 Получаем ID владельца платформы из env
		const platformOwnerId = process.env.PLATFORM_OWNER_ID

		// Формируем транзакции для владельца платформы
		const ownerTransactions = []
		if (platformOwnerId) {
			ownerTransactions.push(
				prisma.user.update({
					where: { id: platformOwnerId },
					data: {
						balance: { increment: commissionDecimal },
						transactions: {
							create: {
								amount: commissionDecimal,
								type: 'commission',
								reason: `Комиссия платформы ${Math.round(commissionRate * 100)}% с задачи "${task.title}"`,
							},
						},
					},
				})
			)
		} else {
			logger.warn('PLATFORM_OWNER_ID не настроен! Комиссия не будет начислена', {
				taskId: task.id,
			})
		}

		// Находим PaymentId и DealId заказчика из его транзакций пополнения через Т-Банк
		// Это нужно для:
		// 1. Подтверждения платежа (Confirm) - списание средств в Т-Банке
		// 2. Вывода средств исполнителем через Т-Банк
		const customerDepositTx = await prisma.transaction.findFirst({
			where: {
				userId: task.customerId,
				type: 'deposit',
				dealId: { not: null },
				paymentId: { not: null },
			},
			orderBy: { createdAt: 'desc' },
			select: { dealId: true, paymentId: true },
		})
		
		const customerDealId = customerDepositTx?.dealId
			? String(customerDepositTx.dealId)
			: null
		
		const customerPaymentId = customerDepositTx?.paymentId || null

		console.log('💼 [COMPLETE-TASK] Параметры Т-Банка для завершения задачи:', {
			customerId: task.customerId,
			executorId: task.executorId,
			customerDealId: customerDealId || 'не найден',
			customerPaymentId: customerPaymentId || 'не найден',
			escrowAmount: escrowNum,
			note: 'PaymentId нужен для Confirm, DealId нужен для вывода средств исполнителем',
		})

		// КРИТИЧНО: Подтверждаем платеж в Т-Банке перед начислением средств исполнителю
		// Согласно документации Т-Банка (multisplit.md раздел 6.1, пункт 4):
		// "После успешного оказания услуги Покупателю Площадка отправляет /v2/Confirm для списания средств с Покупателя"
		// Без Confirm средства остаются в статусе AUTHORIZED и недоступны для выплат
		if (customerPaymentId) {
			try {
				console.log('🔄 [COMPLETE-TASK] Подтверждаем платеж в Т-Банке:', {
					paymentId: customerPaymentId,
					dealId: customerDealId,
					amount: escrowNum,
				})

				const { TBankClient } = await import('@/lib/tbank/client')
				const tbankClient = new TBankClient()
				const confirmResult = await tbankClient.confirmPayment(customerPaymentId)

				if (!confirmResult.Success) {
					logger.error('Ошибка подтверждения платежа в Т-Банке', undefined, {
						paymentId: customerPaymentId,
						dealId: customerDealId,
						errorCode: confirmResult.ErrorCode,
						message: confirmResult.Message,
						taskId: task.id,
					})
					// Не прерываем выполнение, но логируем ошибку
					// Платеж может быть уже подтвержден или подтвердится автоматически
				} else {
					console.log('✅ [COMPLETE-TASK] Платеж успешно подтвержден в Т-Банке:', {
						paymentId: customerPaymentId,
						status: confirmResult.Status,
						dealId: customerDealId,
					})
				}
			} catch (confirmError: any) {
				logger.error('Ошибка при вызове Confirm в Т-Банке', confirmError, {
					paymentId: customerPaymentId,
					dealId: customerDealId,
					taskId: task.id,
				})
				// Не прерываем выполнение - возможно платеж уже подтвержден
				// Или подтвердится автоматически через несколько дней
			}
		} else {
			logger.warn('PaymentId заказчика не найден - невозможно подтвердить платеж в Т-Банке', {
				customerId: task.customerId,
				taskId: task.id,
				note: 'Выплаты могут не работать без подтвержденного платежа в Т-Банке',
			})
		}

		await prisma.$transaction([
			// Завершаем задачу
			// Сохраняем цену в поле price для аналитики
			prisma.task.update({
				where: { id: task.id },
				data: {
					status: 'completed',
					completedAt: new Date(),
					price: task.escrowAmount, // Сохраняем цену из escrowAmount
					escrowAmount: new Prisma.Decimal(0),
				},
			}),

			// У заказчика: списываем с баланса и размораживаем
			prisma.user.update({
				where: { id: task.customerId },
				data: {
					balance: { decrement: new Prisma.Decimal(escrowNum) },
					frozenBalance: { decrement: new Prisma.Decimal(escrowNum) },
					transactions: {
						create: [
							{
								amount: new Prisma.Decimal(-escrowNum),
								type: 'payment',
								reason: `Оплата за задачу "${task.title}"`,
								taskId: task.id, // ✅ Добавляем связь с задачей для корректного подсчета достижений
							},
							{
								amount: new Prisma.Decimal(-commission),
								type: 'commission',
								reason: `Комиссия ${Math.round(commissionRate * 100)}% с задачи "${task.title}"`,
								taskId: task.id, // ✅ Добавляем связь с задачей
							},
						],
					},
				},
			}),

			// Исполнителю: начисляем выплату (80%)
			// Сохраняем DealId заказчика, чтобы исполнитель мог вывести деньги через Т-Банк
			prisma.user.update({
				where: { id: task.executorId },
				data: {
					balance: { increment: payoutDecimal },
					transactions: {
						create: {
							amount: payoutDecimal,
							type: 'earn',
							reason: `Выплата за задачу "${task.title}"`,
							taskId: task.id,
							dealId: customerDealId, // Сохраняем DealId заказчика для вывода через Т-Банк
						},
					},
				},
			}),

			// 💰 Владельцу платформы: начисляем комиссию (20%)
			...ownerTransactions,

			// Создаём уведомление для исполнителя
			prisma.notification.create({
				data: {
					userId: task.executorId,
					type: 'payment',
					message: `Задача "${
						task.title
					}" завершена! Вам начислено ${formatMoney(payout)}`,
					link: `/tasks/${task.id}`,
				},
			}),
		])

		// Отправляем уведомление в реальном времени
		sendNotificationToUser(task.executorId, {
			type: 'payment',
			title: 'Задача завершена',
			message: `Задача "${task.title}" завершена! Вам начислено ${formatMoney(
				payout
			)}`,
			link: `/tasks/${task.id}`,
			taskTitle: task.title,
			amount: payout,
			playSound: true,
		})

		// ✅ Начисляем XP исполнителю за выполненную задачу
		try {
			if (task.executorId) {
				await awardXP(
					task.executorId,
					20, // +20 XP за выполненную задачу
					`Выполнена задача "${task.title}"`
				)
			}
		} catch (xpError) {
			// Логируем ошибку, но не прерываем выполнение
			logger.error('Ошибка начисления XP при завершении задачи', xpError, {
				taskId: task.id,
				executorId: task.executorId,
			})
		}

		// 🎯 Проверяем и начисляем достижения после завершения задачи
		// Для заказчика: проверяем paidTasks и totalSpent
		// Для исполнителя: проверяем completedTasks
		let customerBadges: Array<{ id: string; name: string; icon: string; description?: string }> = []
		let executorBadges: Array<{ id: string; name: string; icon: string; description?: string }> = []
		
		try {
			logger.debug('Проверяем достижения для заказчика после завершения задачи', {
				customerId: task.customerId,
				taskId: task.id,
			})
			const newCustomerBadges = await checkAndAwardBadges(task.customerId)
			if (newCustomerBadges.length > 0) {
				const badgeIds = newCustomerBadges.map(b => b.id)
				const fullBadges = await prisma.badge.findMany({
					where: { id: { in: badgeIds } },
					select: { id: true, name: true, icon: true, description: true }
				})
				customerBadges = fullBadges.map(badge => ({
					id: badge.id,
					name: badge.name,
					icon: badge.icon,
					description: badge.description
				}))
				logger.debug('Заказчику начислено достижений', {
					customerId: task.customerId,
					taskId: task.id,
					badgesCount: customerBadges.length,
					badgeNames: customerBadges.map(b => b.name),
				})
			}

			if (task.executorId) {
				logger.debug('Проверяем достижения для исполнителя после завершения задачи', {
					executorId: task.executorId,
					taskId: task.id,
				})
				const newExecutorBadges = await checkAndAwardBadges(task.executorId)
				if (newExecutorBadges.length > 0) {
					const badgeIds = newExecutorBadges.map(b => b.id)
					const fullBadges = await prisma.badge.findMany({
						where: { id: { in: badgeIds } },
						select: { id: true, name: true, icon: true, description: true }
					})
					executorBadges = fullBadges.map(badge => ({
						id: badge.id,
						name: badge.name,
						icon: badge.icon,
						description: badge.description
					}))
					logger.debug('Исполнителю начислено достижений', {
						executorId: task.executorId,
						taskId: task.id,
						badgesCount: executorBadges.length,
						badgeNames: executorBadges.map(b => b.name),
					})
				}
			}
		} catch (badgeError) {
			logger.error('Ошибка проверки достижений', badgeError, {
				taskId: task.id,
				customerId: task.customerId,
				executorId: task.executorId,
			})
		}

		return NextResponse.json({ 
			success: true,
			task: {
				...task,
				status: 'completed'
			},
			awardedBadges: {
				customer: customerBadges,
				executor: executorBadges
			}
		})
	} catch (err: any) {
		logger.error('Ошибка при завершении задачи', err, {
			taskId: params?.id,
			userId: user?.id,
		})
		return NextResponse.json({ error: err.message || 'Ошибка сервера' }, { status: 500 })
	}
}
