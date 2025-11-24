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

		// Находим платеж по paymentId
		let payment = await prisma.tBankPayment.findUnique({
			where: { paymentId },
			include: { deal: true },
		})

		// Если не найден, пробуем найти по orderId (на случай если paymentId отличается)
		if (!payment) {
			logger.warn('Платеж не найден по paymentId, пробуем найти по orderId', {
				paymentId,
				userId: user.id,
			})

			payment = await prisma.tBankPayment.findFirst({
				where: {
					orderId: paymentId, // Иногда в URL может быть orderId вместо paymentId
					deal: {
						userId: user.id,
					},
				},
				include: { deal: true },
			})
		}

		// Создаем клиент для проверки статуса
		const client = new TBankClient()
		let result: any = null
		let paymentRecovered = false

		// Если платеж не найден в БД, но деньги списались - проверяем через API Т-Банка
		if (!payment) {
			logger.warn('⚠️ Платеж не найден в БД, проверяем через API Т-Банка', {
				paymentId,
				userId: user.id,
			})

			// Проверяем статус через API Т-Банка
			result = await client.getPaymentState(paymentId)

			if (!result.Success) {
				logger.error('❌ Платеж не найден ни в БД, ни в Т-Банке', {
					paymentId,
					errorCode: result.ErrorCode,
					message: result.Message,
					details: result.Details,
					fullResult: JSON.stringify(result),
				})
				return NextResponse.json(
					{
						error: result.Message || 'Платеж не найден',
						errorCode: result.ErrorCode,
						details: result.Details,
					},
					{ status: 404 }
				)
			}

			// Платеж существует в Т-Банке, но не в БД - создаем запись
			logger.info('🔧 Создаем запись о платеже в БД', {
				paymentId,
				status: result.Status,
				userId: user.id,
			})

			// Ищем или создаем сделку для пользователя
			let deal = await prisma.tBankDeal.findFirst({
				where: {
					userId: user.id,
					status: 'OPEN',
				},
				orderBy: {
					createdAt: 'desc',
				},
			})

			// Если сделки нет, создаем новую (но это не должно происходить в нормальном сценарии)
			if (!deal) {
				logger.warn('⚠️ Сделка не найдена, создаем новую', {
					userId: user.id,
					paymentId,
				})

				// Пытаемся найти сделку по SpAccumulationId из ответа Т-Банка
				// Но если его нет, создаем новую
				deal = await prisma.tBankDeal.create({
					data: {
						spAccumulationId: `RECOVERED_${Date.now()}`,
						userId: user.id,
						dealType: 'NN',
						status: 'OPEN',
					},
				})
			}

			// Создаем запись о платеже
			const amountRubles = result.Amount ? kopecksToRubles(result.Amount) : 0

			payment = await prisma.tBankPayment.create({
				data: {
					dealId: deal.id,
					paymentId: paymentId,
					orderId: `RECOVERED_${Date.now()}`,
					amount: new Prisma.Decimal(amountRubles),
					status: result.Status || 'NEW',
					customerId: user.id,
					terminalKey: client['terminalKey'],
					confirmedAt: result.Status === 'CONFIRMED' ? new Date() : undefined,
				},
				include: { deal: true },
			})

			paymentRecovered = true

			logger.info('✅ Запись о платеже создана', {
				paymentId,
				dealId: deal.id,
				status: result.Status,
			})
		}

		// Проверяем права
		if (payment.deal.userId !== user.id && user.role !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		logger.info('🔍 Проверка статуса платежа', {
			paymentId,
			userId: user.id,
			currentStatus: payment.status,
			dealId: payment.dealId,
			recovered: paymentRecovered,
		})

		// Если платеж был восстановлен, result уже есть, иначе проверяем статус
		if (!result) {
			result = await client.getPaymentState(paymentId)
		}

		logger.info('📊 Результат проверки статуса от Т-Банка', {
			paymentId,
			success: result.Success,
			status: result.Status,
			amount: result.Amount,
			errorCode: result.ErrorCode,
			message: result.Message,
		})

		if (!result.Success) {
			logger.error('❌ Ошибка проверки статуса платежа', {
				paymentId,
				errorCode: result.ErrorCode,
				message: result.Message,
			})
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

		logger.info('🔎 Проверка необходимости начисления баланса', {
			paymentId,
			status: result.Status,
			isConfirmed,
			userId: payment.deal.userId,
		})

		let existingTransaction = null

		if (isConfirmed) {
			// Проверяем, не начисляли ли уже баланс
			existingTransaction = await prisma.transaction.findFirst({
				where: {
					userId: payment.deal.userId,
					type: 'deposit',
					reason: {
						contains: payment.paymentId,
					},
				},
			})

			logger.info('💳 Проверка существующих транзакций', {
				paymentId,
				hasExistingTransaction: !!existingTransaction,
				transactionId: existingTransaction?.id,
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

				logger.info('✅ Баланс успешно начислен после проверки статуса', {
					userId: payment.deal.userId,
					amount: amountRubles,
					amountKopecks: result.Amount,
					paymentId,
					orderId: payment.orderId,
					dealId: payment.dealId,
					status: result.Status,
					timestamp: new Date().toISOString(),
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
