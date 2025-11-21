import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { TBANK_CONFIG } from '@/lib/tbank/config'
import { kopecksToRubles, verifyTBankToken } from '@/lib/tbank/crypto'
import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'

/**
 * POST /api/tbank/webhook
 * Обрабатывает нотификации от Т-Банка о статусах платежей и выплат
 *
 * Согласно документации, необходимо вернуть "OK" для успешной обработки
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json()

		logger.info('📥 TBank Webhook получен', {
			status: body.Status,
			paymentId: body.PaymentId,
			orderId: body.OrderId,
			notificationType: body.NotificationType,
			success: body.Success,
			amount: body.Amount,
			hasToken: !!body.Token,
			timestamp: new Date().toISOString(),
			fullBody: JSON.stringify(body),
		})

		// Проверяем подпись (Token)
		const password =
			body.NotificationType === 'LINKCARD'
				? TBANK_CONFIG.E2C_TERMINAL_PASSWORD
				: TBANK_CONFIG.TERMINAL_PASSWORD

		// Если это тестовый запрос без Token - возвращаем OK (для проверки доступности)
		if (!body.Token && (body.test === 'ping' || body.test === 'test')) {
			logger.info('Тестовый webhook запрос получен', { body })
			return new Response('OK', { status: 200 })
		}

		const isValid = verifyTBankToken(body, body.Token, password)

		if (!isValid) {
			logger.error('Неверная подпись webhook Т-Банк', { body })
			// Return OK even for invalid signatures to prevent T-Bank from retrying
			return new Response('OK', { status: 200 })
		}

		// Определяем тип нотификации
		const { PaymentId, Status, Success, Amount, SpAccumulationId } = body

		if (!PaymentId) {
			logger.warn('Webhook без PaymentId', { body })
			return new Response('OK', { status: 200 })
		}

		// Обработка нотификаций для платежей (пополнения)
		let payment = await prisma.tBankPayment.findUnique({
			where: { paymentId: PaymentId },
			include: { deal: { include: { user: true } } },
		})

		// Если не найден, пробуем найти по orderId
		if (!payment) {
			logger.warn(
				'⚠️ Платеж не найден по paymentId в webhook, пробуем найти по orderId',
				{
					paymentId: PaymentId,
					orderId: body.OrderId,
				}
			)

			payment = await prisma.tBankPayment.findFirst({
				where: {
					orderId: body.OrderId || PaymentId,
				},
				include: { deal: { include: { user: true } } },
			})
		}

		if (payment) {
			// Если пришел SpAccumulationId и сделка еще не привязана - обновляем
			if (SpAccumulationId && !payment.deal.spAccumulationId) {
				logger.info('Обновляем SpAccumulationId для сделки', {
					dealId: payment.dealId,
					spAccumulationId: SpAccumulationId,
				})

				await prisma.tBankDeal.update({
					where: { id: payment.dealId },
					data: { spAccumulationId: String(SpAccumulationId) },
				})
			}

			await handlePaymentNotification(payment, body)
			return new Response('OK', { status: 200 })
		}

		// Обработка нотификаций для выплат
		const payout = await prisma.tBankPayout.findUnique({
			where: { paymentId: PaymentId },
			include: { deal: true },
		})

		if (payout) {
			await handlePayoutNotification(payout, body)
			return new Response('OK', { status: 200 })
		}

		logger.warn('⚠️ Платеж/выплата не найдена в БД', {
			paymentId: PaymentId,
			status: Status,
			orderId: body.OrderId,
			notificationType: body.NotificationType,
			timestamp: new Date().toISOString(),
		})
		return new Response('OK', { status: 200 })
	} catch (error) {
		logger.error('Ошибка обработки webhook Т-Банк', { error })
		// Все равно возвращаем OK чтобы Т-Банк не повторял запросы
		return new Response('OK', { status: 200 })
	}
}

/**
 * Обрабатывает нотификацию для платежа (пополнения)
 */
async function handlePaymentNotification(
	payment: any,
	notification: any
): Promise<void> {
	const { Status, Success, Amount, SpAccumulationId } = notification

	// Обновляем статус платежа
	await prisma.tBankPayment.update({
		where: { paymentId: payment.paymentId },
		data: {
			status: Status,
			confirmedAt: Status === 'CONFIRMED' ? new Date() : undefined,
		},
	})

	// Если пришел SpAccumulationId и сделка еще не привязана - обновляем
	if (SpAccumulationId && payment.deal && !payment.deal.spAccumulationId) {
		logger.info('Обновляем SpAccumulationId для сделки из нотификации', {
			dealId: payment.dealId,
			spAccumulationId: SpAccumulationId,
		})

		await prisma.tBankDeal.update({
			where: { id: payment.dealId },
			data: { spAccumulationId: String(SpAccumulationId) },
		})
	}

	// Логируем все данные для диагностики
	logger.info('🔄 Обработка платежа в webhook', {
		paymentId: payment.paymentId,
		orderId: payment.orderId,
		status: Status,
		success: Success,
		amount: Amount,
		dealId: payment.dealId,
		userId: payment.deal.userId,
		currentPaymentStatus: payment.status,
		hasDeal: !!payment.deal,
		hasUserId: !!payment.deal.userId,
		timestamp: new Date().toISOString(),
	})

	// Если платеж подтвержден - начисляем деньги
	// Проверяем разные статусы, которые означают успешную оплату
	const isConfirmed =
		Status === 'CONFIRMED' ||
		(Success === true && Status !== 'REJECTED' && Status !== 'CANCELED')

	logger.info('Проверка подтверждения платежа', {
		paymentId: payment.paymentId,
		status: Status,
		success: Success,
		isConfirmed,
	})

	if (isConfirmed) {
		const amountRubles = Amount
			? kopecksToRubles(Amount)
			: toNumber(payment.amount)

		logger.info('✅ Платеж подтвержден, начинаем начисление баланса', {
			paymentId: payment.paymentId,
			orderId: payment.orderId,
			amountRubles,
			amountKopecks: Amount,
			userId: payment.deal.userId,
			dealId: payment.dealId,
			timestamp: new Date().toISOString(),
		})

		// Проверяем, не начисляли ли уже баланс (чтобы избежать двойного начисления)
		const existingTransaction = await prisma.transaction.findFirst({
			where: {
				userId: payment.deal.userId,
				type: 'deposit',
				reason: {
					contains: payment.paymentId,
				},
			},
		})

		if (existingTransaction) {
			logger.warn(
				'⚠️ Баланс уже был начислен для этого платежа (пропускаем двойное начисление)',
				{
					paymentId: payment.paymentId,
					orderId: payment.orderId,
					transactionId: existingTransaction.id,
					userId: payment.deal.userId,
					amount: toNumber(existingTransaction.amount),
					timestamp: new Date().toISOString(),
				}
			)
		} else if (payment.deal.userId) {
			try {
				// Начисляем на баланс пользователя
				await prisma.user.update({
					where: { id: payment.deal.userId },
					data: {
						balance: {
							increment: new Prisma.Decimal(amountRubles),
						},
						transactions: {
							create: {
								amount: new Prisma.Decimal(amountRubles),
								type: 'deposit',
								reason: `Пополнение через Т-Банк Мультирасчеты (PaymentId: ${payment.paymentId})`,
							},
						},
					},
				})

				// Обновляем баланс сделки
				await prisma.tBankDeal.update({
					where: { id: payment.dealId },
					data: {
						totalAmount: {
							increment: new Prisma.Decimal(amountRubles),
						},
						remainingBalance: {
							increment: new Prisma.Decimal(amountRubles),
						},
					},
				})

				logger.info('✅ Баланс успешно пополнен через Т-Банк', {
					userId: payment.deal.userId,
					amount: amountRubles,
					paymentId: payment.paymentId,
					status: Status,
				})
			} catch (error) {
				logger.error('❌ Ошибка при начислении баланса', {
					error: error instanceof Error ? error.message : String(error),
					paymentId: payment.paymentId,
					userId: payment.deal.userId,
					amount: amountRubles,
				})
			}
		} else {
			logger.error('❌ Не найден userId для начисления баланса', {
				paymentId: payment.paymentId,
				dealId: payment.dealId,
				deal: payment.deal,
			})
		}
	} else {
		logger.warn('Платеж не подтвержден, баланс не начисляется', {
			paymentId: payment.paymentId,
			status: Status,
			success: Success,
		})
	}

	// Если платеж отклонен
	if (Status === 'REJECTED' || Status === 'CANCELED') {
		logger.warn('Платеж отклонен/отменен', {
			paymentId: payment.paymentId,
			status: Status,
		})
	}
}

/**
 * Обрабатывает нотификацию для выплаты
 */
async function handlePayoutNotification(
	payout: any,
	notification: any
): Promise<void> {
	const { Status, Success } = notification

	// Обновляем статус выплаты
	await prisma.tBankPayout.update({
		where: { paymentId: payout.paymentId },
		data: {
			status: Status,
			completedAt: Status === 'COMPLETED' ? new Date() : undefined,
		},
	})

	// Если выплата завершена успешно
	if (Status === 'COMPLETED' && Success) {
		logger.info('Выплата завершена успешно', {
			paymentId: payout.paymentId,
			recipientId: payout.recipientId,
			amount: toNumber(payout.amount),
		})

		// Средства уже списаны в init/execute, здесь просто логируем
	}

	// Если выплата отклонена - возвращаем средства
	if (Status === 'REJECTED') {
		const userId = payout.recipientId

		// Размораживаем и возвращаем на баланс
		await prisma.user.update({
			where: { id: userId },
			data: {
				frozenBalance: {
					decrement: payout.amount,
				},
			},
		})

		logger.warn('Выплата отклонена, средства разморожены', {
			paymentId: payout.paymentId,
			userId,
			amount: toNumber(payout.amount),
		})
	}

	// Если сделка закрыта (финальная выплата)
	if (payout.isFinal && Status === 'COMPLETED') {
		await prisma.tBankDeal.update({
			where: { id: payout.dealId },
			data: {
				status: 'CLOSED',
				closedAt: new Date(),
			},
		})

		logger.info('Сделка закрыта (финальная выплата)', {
			dealId: payout.dealId,
		})
	}
}

function toNumber(value: any): number {
	if (typeof value === 'number') return value
	if (typeof value === 'string') return parseFloat(value)
	if (value?.toNumber) return value.toNumber()
	return 0
}
