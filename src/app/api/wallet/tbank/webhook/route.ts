import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { kopecksToRubles, verifyWebhookSignature } from '@/lib/tbank'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Вебхук для обработки нотификаций от Т-Банка
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		logger.info('📥 Вебхук от T-Bank', { body })

		// Проверяем подпись
		if (!verifyWebhookSignature(body, body.Token)) {
			logger.error('⚠️ Неверная подпись вебхука T-Bank')
			return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
		}

		const { Status, PaymentId, OrderId, Amount, SpAccumulationId, DealId } =
			body

		// Обрабатываем только успешные платежи (CONFIRMED)
		if (Status !== 'CONFIRMED') {
			logger.info(`⏳ Платеж ${PaymentId} в статусе ${Status}, пропускаем`)
			return NextResponse.json({ ok: true })
		}

		// Определяем тип операции по OrderId
		// Формат: deposit_userId_timestamp или withdraw_userId_timestamp
		const orderParts = OrderId.split('_')
		if (orderParts.length < 2) {
			logger.error('❌ Не удалось определить тип операции из OrderId:', OrderId)
			return NextResponse.json({ error: 'Invalid OrderId' }, { status: 400 })
		}

		const operationType = orderParts[0] // 'deposit' или 'withdraw'
		const userId = orderParts[1]

		if (!userId) {
			logger.error('❌ Не удалось извлечь userId из OrderId:', OrderId)
			return NextResponse.json({ error: 'Invalid OrderId' }, { status: 400 })
		}

		// Проверяем, не обработан ли уже этот платеж
		const existingTx = await prisma.transaction.findFirst({
			where: {
				OR: [{ paymentId: PaymentId }, { reason: { contains: PaymentId } }],
			},
		})

		if (existingTx) {
			logger.info('✅ Платеж уже обработан:', PaymentId)
			return NextResponse.json({ ok: true, alreadyProcessed: true })
		}

		const amount = kopecksToRubles(Amount || 0)
		const amountDecimal = new Prisma.Decimal(amount)

		if (operationType === 'deposit') {
			// Пополнение баланса
			const finalDealId = DealId || SpAccumulationId

			await prisma.user.update({
				where: { id: userId },
				data: {
					balance: { increment: amountDecimal },
					transactions: {
						create: {
							amount: amountDecimal,
							type: 'deposit',
							reason: `Пополнение через Т-Банк (PaymentId: ${PaymentId}, DealId: ${
								finalDealId || 'N/A'
							})`,
							dealId: finalDealId || null,
							paymentId: PaymentId || null,
							status: 'completed',
						},
					},
				},
			})

			logger.info(`✅ Начислено ${amount} ₽ пользователю ${userId}`, {
				paymentId: PaymentId,
				dealId: finalDealId,
			})
		} else if (operationType === 'withdraw') {
			// Вывод средств (обычно уже обработан в create-withdrawal, но на всякий случай)
			logger.info(
				`✅ Выплата ${amount} ₽ пользователю ${userId} подтверждена`,
				{
					paymentId: PaymentId,
				}
			)
		}

		return NextResponse.json({ ok: true })
	} catch (error: any) {
		logger.error('❌ Ошибка обработки вебхука T-Bank', error)
		return NextResponse.json({ error: 'Internal error' }, { status: 500 })
	}
}
