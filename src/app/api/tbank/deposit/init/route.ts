import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isPositiveAmount, parseUserInput, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { TBankClient } from '@/lib/tbank/client'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/deposit/init
 * Инициирует пополнение баланса через Т-Банк Мультирасчеты
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount, phone } = await req.json()

		// Валидация суммы
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		const amountNumber = toNumber(parsedAmount)

		// Минимальная сумма 100 рублей
		if (amountNumber < 100) {
			return NextResponse.json(
				{ error: 'Минимальная сумма пополнения: 100 ₽' },
				{ status: 400 }
			)
		}

		// Номер телефона получателя (для идентификации в системе Мультирасчетов)
		const paymentRecipientId = phone || user.email || `user_${user.id}`

		// Ищем открытую сделку пользователя или создаем новую
		let deal = await prisma.tBankDeal.findFirst({
			where: {
				userId: user.id,
				status: 'OPEN',
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		let createNewDeal = !deal
		let dealIdToUse = deal?.spAccumulationId

		// Создаем клиент
		const client = new TBankClient()

		// Формируем URL для возврата после оплаты
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
		const successURL = `${appUrl}/payment/return?PaymentId={PaymentId}`
		const failURL = `${appUrl}/payment/return?PaymentId={PaymentId}&status=failed`

		logger.info('Инициализация пополнения баланса', {
			userId: user.id,
			amount: amountNumber,
			dealId: dealIdToUse,
			createNewDeal,
			successURL,
		})

		// Инициируем платеж
		const result = await client.initPayment({
			amount: amountNumber,
			dealId: dealIdToUse,
			paymentRecipientId,
			description: `Пополнение баланса пользователя ${user.email}`,
			createDeal: createNewDeal,
			successURL,
			failURL,
		})

		if (!result.Success || !result.PaymentId) {
			logger.error('Ошибка инициации платежа Т-Банк', {
				userId: user.id,
				errorCode: result.ErrorCode,
				message: result.Message,
				details: result.Details,
				fullResult: JSON.stringify(result),
			})

			return NextResponse.json(
				{
					error: result.Message || 'Не удалось инициировать платеж',
					details: result.Details,
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Проверяем, что все необходимые данные получены
		if (!result.PaymentId) {
			logger.error('❌ PaymentId не получен от Т-Банка', {
				userId: user.id,
				result: JSON.stringify(result),
			})
			return NextResponse.json(
				{ error: 'Не получен ID платежа от Т-Банка' },
				{ status: 500 }
			)
		}

		// Если вернулся SpAccumulationId - создана новая сделка
		if (result.SpAccumulationId && createNewDeal) {
			deal = await prisma.tBankDeal.create({
				data: {
					spAccumulationId: result.SpAccumulationId,
					userId: user.id,
					dealType: 'NN',
					status: 'OPEN',
				},
			})

			logger.info('Создана новая сделка при пополнении', {
				userId: user.id,
				dealId: deal.id,
				spAccumulationId: result.SpAccumulationId,
			})
		}

		// Если сделки все еще нет - это ошибка, но создаем временную для сохранения платежа
		if (!deal) {
			logger.error(
				'⚠️ Сделка не найдена после инициализации платежа, создаем временную',
				{
					userId: user.id,
					paymentId: result.PaymentId,
					spAccumulationId: result.SpAccumulationId,
				}
			)

			// Создаем временную сделку
			deal = await prisma.tBankDeal.create({
				data: {
					spAccumulationId: result.SpAccumulationId || `TEMP_${Date.now()}`,
					userId: user.id,
					dealType: 'NN',
					status: 'OPEN',
				},
			})
		}

		// Сохраняем платеж в БД (теперь deal гарантированно существует)
		let paymentSaved = false
		try {
			const orderId = result.OrderId || `PAY_${Date.now()}_${result.PaymentId}`

			const savedPayment = await prisma.tBankPayment.create({
				data: {
					dealId: deal.id,
					paymentId: result.PaymentId,
					orderId: orderId,
					amount: new Prisma.Decimal(amountNumber),
					status: result.Status || 'NEW',
					customerId: user.id,
					terminalKey: client['terminalKey'],
				},
			})

			paymentSaved = true

			logger.info('💾 Платеж успешно сохранен в БД', {
				paymentId: result.PaymentId,
				paymentDbId: savedPayment.id,
				dealId: deal.id,
				orderId: orderId,
				amount: amountNumber,
				status: result.Status || 'NEW',
			})

			// Проверяем, что платеж действительно сохранен
			const verifyPayment = await prisma.tBankPayment.findUnique({
				where: { paymentId: result.PaymentId },
			})

			if (!verifyPayment) {
				logger.error(
					'❌ КРИТИЧЕСКАЯ ОШИБКА: Платеж не найден после сохранения!',
					{
						paymentId: result.PaymentId,
						dealId: deal.id,
					}
				)
			} else {
				logger.info('✅ Платеж подтвержден в БД', {
					paymentId: result.PaymentId,
					paymentDbId: verifyPayment.id,
				})
			}
		} catch (error: any) {
			// Если платеж уже существует (дубликат) - проверяем, что он есть
			if (error.code === 'P2002') {
				logger.warn('⚠️ Платеж уже существует в БД (дубликат)', {
					paymentId: result.PaymentId,
				})

				// Проверяем, что платеж действительно существует
				const existingPayment = await prisma.tBankPayment.findUnique({
					where: { paymentId: result.PaymentId },
				})

				if (existingPayment) {
					paymentSaved = true
					logger.info('✅ Существующий платеж найден в БД', {
						paymentId: result.PaymentId,
						paymentDbId: existingPayment.id,
						dealId: existingPayment.dealId,
					})
				} else {
					logger.error(
						'❌ КРИТИЧЕСКАЯ ОШИБКА: Дубликат, но платеж не найден!',
						{
							paymentId: result.PaymentId,
						}
					)
				}
			} else {
				logger.error('❌ Ошибка сохранения платежа в БД', {
					paymentId: result.PaymentId,
					error: error.message,
					code: error.code,
					stack: error.stack,
					dealId: deal.id,
				})
				// Не прерываем процесс, платеж все равно инициирован
			}
		}

		// Если платеж не был сохранен - это критическая ошибка
		if (!paymentSaved) {
			logger.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Платеж не был сохранен в БД!', {
				paymentId: result.PaymentId,
				userId: user.id,
				dealId: deal.id,
				amount: amountNumber,
			})
		}

		// Финальная проверка: убеждаемся, что платеж сохранен в БД
		const finalCheck = await prisma.tBankPayment.findUnique({
			where: { paymentId: result.PaymentId },
			select: { id: true, dealId: true, status: true },
		})

		if (!finalCheck) {
			logger.error(
				'❌ КРИТИЧЕСКАЯ ОШИБКА: Платеж не найден в БД перед возвратом ответа!',
				{
					paymentId: result.PaymentId,
					userId: user.id,
					dealId: deal?.id,
				}
			)
			// Все равно возвращаем успех, так как платеж инициирован в Т-Банке
			// Система восстановления в check-status должна помочь
		} else {
			logger.info('✅ Финальная проверка: Платеж найден в БД', {
				paymentId: result.PaymentId,
				paymentDbId: finalCheck.id,
				dealId: finalCheck.dealId,
				status: finalCheck.status,
			})
		}

		logger.info('✅ Платеж успешно инициирован', {
			userId: user.id,
			paymentId: result.PaymentId,
			amount: amountNumber,
			paymentURL: result.PaymentURL,
			status: result.Status,
			dealId: deal?.id,
			orderId: result.OrderId || 'не указан',
			savedInDb: !!finalCheck,
		})

		// Возвращаем URL для оплаты
		return NextResponse.json({
			success: true,
			paymentId: result.PaymentId,
			paymentURL: result.PaymentURL,
			status: result.Status,
			dealId: deal?.id,
			savedInDb: !!finalCheck,
		})
	} catch (error) {
		logger.error('Ошибка при инициации пополнения', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
