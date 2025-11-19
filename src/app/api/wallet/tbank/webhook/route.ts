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
		// Логируем входящий запрос (включая заголовки для отладки)
		const headers = Object.fromEntries(req.headers.entries())
		console.log('📥 [WEBHOOK] Входящий запрос от T-Bank', {
			headers,
			url: req.url,
			method: req.method,
		})

		const body = await req.json()
		console.log('📥 [WEBHOOK] Тело запроса:', JSON.stringify(body, null, 2))
		logger.info('📥 Вебхук от T-Bank', { body })

		// Проверяем подпись
		const isValidSignature = verifyWebhookSignature(body, body.Token)
		console.log('🔐 [WEBHOOK] Проверка подписи:', {
			isValid: isValidSignature,
			receivedToken: body.Token?.substring(0, 20) + '...',
		})

		if (!isValidSignature) {
			console.error('⚠️ [WEBHOOK] Неверная подпись вебхука T-Bank')
			logger.error('⚠️ Неверная подпись вебхука T-Bank', {
				body: JSON.stringify(body),
			})
			return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
		}

		const { Status, PaymentId, OrderId, Amount, SpAccumulationId, DealId } =
			body

		console.log('📊 [WEBHOOK] Параметры платежа:', {
			Status,
			PaymentId,
			OrderId,
			Amount,
			SpAccumulationId,
			DealId,
		})

		// Обрабатываем только успешные платежи (CONFIRMED)
		if (Status !== 'CONFIRMED') {
			console.log(
				`⏳ [WEBHOOK] Платеж ${PaymentId} в статусе ${Status}, пропускаем`
			)
			logger.info(`⏳ Платеж ${PaymentId} в статусе ${Status}, пропускаем`)
			return NextResponse.json({ ok: true, status: Status })
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

			console.log('💰 [WEBHOOK] Начинаем начисление:', {
				userId,
				amount,
				paymentId: PaymentId,
				dealId: finalDealId,
			})

			// Проверяем, существует ли пользователь
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, email: true, balance: true },
			})

			if (!user) {
				console.error(`❌ [WEBHOOK] Пользователь ${userId} не найден`)
				logger.error(`❌ Пользователь ${userId} не найден`)
				return NextResponse.json({ error: 'User not found' }, { status: 404 })
			}

			console.log('👤 [WEBHOOK] Пользователь найден:', {
				email: user.email,
				currentBalance: user.balance.toString(),
			})

			const updated = await prisma.user.update({
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
				select: { balance: true },
			})

			console.log('✅ [WEBHOOK] Начисление успешно:', {
				userId,
				amount,
				oldBalance: user.balance.toString(),
				newBalance: updated.balance.toString(),
				paymentId: PaymentId,
			})

			logger.info(`✅ Начислено ${amount} ₽ пользователю ${userId}`, {
				paymentId: PaymentId,
				dealId: finalDealId,
				oldBalance: user.balance.toString(),
				newBalance: updated.balance.toString(),
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
