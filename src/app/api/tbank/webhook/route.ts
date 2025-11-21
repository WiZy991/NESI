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

		logger.info('TBank Webhook получен', {
			status: body.Status,
			paymentId: body.PaymentId,
			orderId: body.OrderId,
		})

		// Проверяем подпись (Token)
		const password =
			body.NotificationType === 'LINKCARD'
				? TBANK_CONFIG.E2C_TERMINAL_PASSWORD
				: TBANK_CONFIG.TERMINAL_PASSWORD

		const isValid = verifyTBankToken(body, body.Token, password)

		if (!isValid) {
			logger.error('Неверная подпись webhook Т-Банк', { body })
			return new Response('INVALID_SIGNATURE', { status: 400 })
		}

		// Определяем тип нотификации
		const { PaymentId, Status, Success, Amount, SpAccumulationId } = body

		if (!PaymentId) {
			logger.warn('Webhook без PaymentId', { body })
			return new Response('OK', { status: 200 })
		}

		// Обработка нотификаций для платежей (пополнения)
		const payment = await prisma.tBankPayment.findUnique({
			where: { paymentId: PaymentId },
			include: { deal: { include: { user: true } } },
		})

		if (payment) {
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

		logger.warn('Платеж/выплата не найдена в БД', { paymentId: PaymentId })
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

	// Если платеж подтвержден - начисляем деньги
	if (Status === 'CONFIRMED' && Success) {
		const amountRubles = Amount
			? kopecksToRubles(Amount)
			: toNumber(payment.amount)

		// Начисляем на баланс пользователя
		if (payment.deal.user) {
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
							reason: 'Пополнение через Т-Банк Мультирасчеты',
						},
					},
				},
			})

			logger.info('Баланс пополнен через Т-Банк', {
				userId: payment.deal.userId,
				amount: amountRubles,
				paymentId: payment.paymentId,
			})
		}

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
