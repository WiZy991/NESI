import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { kopecksToRubles, verifyWebhookSignature } from '@/lib/tbank'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Вебхук для обработки нотификаций от Т-Банка
 */

/**
 * GET запрос для проверки доступности вебхука
 * Т-Банк может проверять доступность вебхука через GET
 */
export async function GET(req: NextRequest) {
	return NextResponse.json(
		{
			status: 'ok',
			message: 'Webhook is available. Use POST method to send notifications.',
			endpoint: '/api/wallet/tbank/webhook',
			method: 'POST',
		},
		{ status: 200 }
	)
}

/**
 * POST запрос для обработки уведомлений от Т-Банка
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
		console.log(
			'📥 [WEBHOOK] Тело запроса (полное):',
			JSON.stringify(body, null, 2)
		)
		console.log('📥 [WEBHOOK] Все поля в вебхуке:', Object.keys(body))
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

		// PaymentId и SpAccumulationId могут быть числами, конвертируем в строку
		const paymentIdString = PaymentId ? String(PaymentId) : null
		const dealIdFromWebhook =
			DealId || (SpAccumulationId ? String(SpAccumulationId) : null)

		console.log('📊 [WEBHOOK] Параметры платежа:', {
			Status,
			PaymentId,
			OrderId,
			Amount,
			SpAccumulationId,
			DealId,
			dealIdFromWebhook,
		})

		// Проверяем все возможные поля, где может быть DealId
		console.log('🔍 [WEBHOOK] Поиск DealId во всех полях:', {
			DealId: body.DealId,
			SpAccumulationId: body.SpAccumulationId,
			SpAccumulationIdType: typeof body.SpAccumulationId,
			DATA: body.DATA,
			hasDATA: !!body.DATA,
			DATA_SpAccumulationId: body.DATA?.SpAccumulationId,
			allKeys: Object.keys(body),
			allValues: JSON.stringify(body, null, 2),
		})

		// КРИТИЧЕСКИ ВАЖНО: Проверяем, что вебхук содержит необходимые поля
		if (!PaymentId) {
			console.error(
				'❌ [WEBHOOK] КРИТИЧЕСКАЯ ОШИБКА: PaymentId отсутствует в вебхуке!'
			)
			logger.error('PaymentId отсутствует в вебхуке', { body })
			return NextResponse.json(
				{ error: 'PaymentId is required' },
				{ status: 400 }
			)
		}

		if (!OrderId) {
			console.error(
				'❌ [WEBHOOK] КРИТИЧЕСКАЯ ОШИБКА: OrderId отсутствует в вебхуке!'
			)
			logger.error('OrderId отсутствует в вебхуке', { body })
			return NextResponse.json(
				{ error: 'OrderId is required' },
				{ status: 400 }
			)
		}

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
				OR: [
					{ paymentId: paymentIdString },
					{ reason: { contains: paymentIdString || '' } },
				],
			},
		})

		if (existingTx) {
			// Если транзакция существует, но DealId не был сохранен, обновляем его
			if (!existingTx.dealId && dealIdFromWebhook) {
				await prisma.transaction.update({
					where: { id: existingTx.id },
					data: { dealId: dealIdFromWebhook },
				})
				console.log(
					'✅ [WEBHOOK] Обновлен DealId в существующей транзакции:',
					dealIdFromWebhook
				)
				logger.info('Обновлен DealId в существующей транзакции', {
					transactionId: existingTx.id,
					paymentId: PaymentId,
					dealId: dealIdFromWebhook,
				})
			}
			logger.info('✅ Платеж уже обработан:', PaymentId)
			return NextResponse.json({ ok: true, alreadyProcessed: true })
		}

		const amount = kopecksToRubles(Amount || 0)
		const amountDecimal = new Prisma.Decimal(amount)

		if (operationType === 'deposit') {
			// Пополнение баланса
			// SpAccumulationId может быть числом, конвертируем в строку
			let finalDealId = dealIdFromWebhook

			console.log('💰 [WEBHOOK] Начинаем начисление:', {
				userId,
				amount,
				paymentId: PaymentId,
				dealId: finalDealId,
				receivedDealId: DealId,
				receivedSpAccumulationId: SpAccumulationId,
				dealIdFromWebhook,
			})

			// Если DealId не пришел в вебхуке, пытаемся получить его через API
			if (!finalDealId && PaymentId) {
				try {
					const { checkPaymentStatus } = await import('@/lib/tbank')
					console.log(
						'🔍 [WEBHOOK] DealId не получен, запрашиваем через API...'
					)
					const paymentStatus = await checkPaymentStatus(PaymentId)

					if (paymentStatus.Success) {
						const apiDealId =
							paymentStatus.SpAccumulationId || paymentStatus.DealId
						finalDealId = apiDealId ? String(apiDealId) : null
						console.log('✅ [WEBHOOK] DealId получен из API:', finalDealId)
					}
				} catch (error) {
					console.error('❌ [WEBHOOK] Ошибка получения DealId из API:', error)
					logger.error('Ошибка получения DealId из API в вебхуке', error)
				}
			}

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
							paymentId: paymentIdString,
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
				dealId: finalDealId,
				savedDealId: finalDealId || 'NULL',
				transactionCreated: true,
			})

			// КРИТИЧЕСКИ ВАЖНО: Если DealId все еще NULL, это проблема!
			if (!finalDealId) {
				console.error(
					'⚠️⚠️⚠️ [WEBHOOK] КРИТИЧЕСКАЯ ПРОБЛЕМА: DealId не был сохранен!',
					{
						userId,
						paymentId: PaymentId,
						receivedDealId: DealId,
						receivedSpAccumulationId: SpAccumulationId,
						bodyKeys: Object.keys(body),
						fullBody: JSON.stringify(body, null, 2),
					}
				)
				logger.error('КРИТИЧЕСКАЯ ПРОБЛЕМА: DealId не был сохранен в вебхуке', {
					userId,
					paymentId: PaymentId,
					receivedDealId: DealId,
					receivedSpAccumulationId: SpAccumulationId,
				})
			}

			// Дополнительная проверка: если DealId все еще NULL, пытаемся получить его еще раз
			if (!finalDealId && PaymentId) {
				console.warn(
					'⚠️ [WEBHOOK] DealId остался NULL после всех попыток, пытаемся еще раз...'
				)
				try {
					const { checkPaymentStatus } = await import('@/lib/tbank')
					const retryStatus = await checkPaymentStatus(PaymentId)

					if (retryStatus.Success) {
						const retryDealId =
							retryStatus.SpAccumulationId || retryStatus.DealId || null

						if (retryDealId) {
							// Обновляем транзакцию с DealId
							await prisma.transaction.updateMany({
								where: {
									paymentId: paymentIdString,
									userId: userId,
								},
								data: {
									dealId: retryDealId,
								},
							})

							console.log(
								'✅ [WEBHOOK] DealId обновлен в транзакции:',
								retryDealId
							)
							finalDealId = retryDealId
						}
					}
				} catch (error) {
					console.error(
						'❌ [WEBHOOK] Ошибка повторного получения DealId:',
						error
					)
				}
			}

			logger.info(`✅ Начислено ${amount} ₽ пользователю ${userId}`, {
				paymentId: PaymentId,
				dealId: finalDealId || 'NULL',
				oldBalance: user.balance.toString(),
				newBalance: updated.balance.toString(),
			})
		} else if (operationType === 'withdraw') {
			// Вывод средств - обрабатываем изменения статуса
			console.log('💸 [WEBHOOK] Обработка вывода средств:', {
				userId,
				paymentId: PaymentId,
				status: Status,
				amount,
			})

			// Ищем транзакцию вывода
			const withdrawalTx = await prisma.transaction.findFirst({
				where: {
					userId: userId,
					paymentId: paymentIdString,
					type: 'withdraw',
				},
				orderBy: { createdAt: 'desc' },
			})

			if (!withdrawalTx) {
				logger.warn('⚠️ Транзакция вывода не найдена для вебхука', {
					paymentId: PaymentId,
					userId,
				})
				return NextResponse.json({ ok: true })
			}

			// Обрабатываем разные статусы
			if (Status === 'COMPLETED' || Status === 'CONFIRMED') {
				// Выплата успешна - обновляем статус транзакции
				await prisma.transaction.update({
					where: { id: withdrawalTx.id },
					data: { status: 'completed' },
				})

				logger.info(
					`✅ Выплата ${amount} ₽ пользователю ${userId} подтверждена`,
					{
						paymentId: PaymentId,
						transactionId: withdrawalTx.id,
					}
				)
			} else if (
				Status === 'REJECTED' ||
				Status === 'CANCELED' ||
				Status === 'REFUNDED' ||
				Status === 'FAILED'
			) {
				// Выплата отклонена - возвращаем средства на баланс
				await prisma.user.update({
					where: { id: userId },
					data: {
						balance: { increment: amountDecimal.abs() },
						transactions: {
							update: {
								where: { id: withdrawalTx.id },
								data: {
									status: 'failed',
									reason: `${withdrawalTx.reason} (Отклонено Т-Банком: ${Status})`,
								},
							},
						},
					},
				})

				logger.warn(
					`❌ Выплата ${amount} ₽ пользователю ${userId} отклонена. Средства возвращены.`,
					{
						paymentId: PaymentId,
						status: Status,
						transactionId: withdrawalTx.id,
					}
				)
			} else {
				// Другие статусы (CHECKED, AUTHORIZED и т.д.) - просто логируем
				logger.info(`⏳ Выплата ${PaymentId} в статусе ${Status}`, {
					userId,
					paymentId: PaymentId,
					status: Status,
				})
			}
		}

		return NextResponse.json({ ok: true })
	} catch (error: any) {
		logger.error('❌ Ошибка обработки вебхука T-Bank', error)
		return NextResponse.json({ error: 'Internal error' }, { status: 500 })
	}
}
