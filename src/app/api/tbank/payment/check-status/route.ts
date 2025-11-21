import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { TBankClient } from '@/lib/tbank/client'
import { kopecksToRubles } from '@/lib/tbank/crypto'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/payment/check-status
 * Проверяет статус платежа и начисляет баланс, если платеж подтвержден
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { paymentId } = await req.json()

		if (!paymentId) {
			return NextResponse.json(
				{ error: 'Не указан ID платежа' },
				{ status: 400 }
			)
		}

		// Находим платеж
		const payment = await prisma.tBankPayment.findUnique({
			where: { paymentId },
			include: { deal: true },
		})

		if (!payment) {
			return NextResponse.json({ error: 'Платеж не найден' }, { status: 404 })
		}

		// Проверяем права
		if (payment.deal.userId !== user.id && user.role !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		// Проверяем статус через API Т-Банка
		const client = new TBankClient()
		const result = await client.getPaymentState(paymentId)

		if (!result.Success) {
			return NextResponse.json(
				{
					error: result.Message || 'Не удалось проверить статус платежа',
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Обновляем статус в БД
		await prisma.tBankPayment.update({
			where: { paymentId },
			data: {
				status: result.Status || payment.status,
				confirmedAt:
					result.Status === 'CONFIRMED' ? new Date() : payment.confirmedAt,
			},
		})

		// Если платеж подтвержден, но баланс еще не начислен
		const isConfirmed =
			result.Status === 'CONFIRMED' || result.Status === 'AUTHORIZED'

		if (isConfirmed) {
			// Проверяем, не начисляли ли уже баланс
			const existingTransaction = await prisma.transaction.findFirst({
				where: {
					userId: payment.deal.userId,
					type: 'deposit',
					reason: {
						contains: payment.paymentId,
					},
				},
			})

			if (!existingTransaction && payment.deal.userId) {
				const amountRubles = result.Amount
					? kopecksToRubles(result.Amount)
					: toNumber(payment.amount)

				// Начисляем баланс
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

				logger.info('Баланс начислен вручную после проверки статуса', {
					userId: payment.deal.userId,
					amount: amountRubles,
					paymentId,
				})

				return NextResponse.json({
					success: true,
					status: result.Status,
					balanceUpdated: true,
					amount: amountRubles,
				})
			}
		}

		return NextResponse.json({
			success: true,
			status: result.Status,
			balanceUpdated: false,
			message: existingTransaction
				? 'Баланс уже был начислен'
				: 'Платеж еще не подтвержден',
		})
	} catch (error) {
		logger.error('Ошибка проверки статуса платежа', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
