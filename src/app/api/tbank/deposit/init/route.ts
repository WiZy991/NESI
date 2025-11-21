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

		// PaymentRecipientId - идентификатор будущего получателя выплаты
		// Согласно документации, это обязательный параметр для Мультирасчетов
		// В примере документации используется любой идентификатор (не обязательно телефон)
		// Для пополнения баланса используем идентификатор пользователя
		// Если есть телефон - используем его (в формате +7XXXXXXXXXX), иначе - user.id
		let paymentRecipientId: string
		let phoneForData: string | undefined

		// Пробуем использовать телефон из параметров или профиля
		const userPhone = phone || user.phone

		if (userPhone) {
			// Приводим к формату +7XXXXXXXXXX
			let formattedPhone: string
			if (userPhone.startsWith('+')) {
				formattedPhone = userPhone
			} else if (userPhone.startsWith('7')) {
				formattedPhone = `+${userPhone}`
			} else {
				// Извлекаем только цифры и добавляем +7
				const digits = userPhone.replace(/\D/g, '')
				formattedPhone = `+7${digits.slice(-10)}` // Берем последние 10 цифр
			}

			// Проверяем формат
			if (/^\+7\d{10}$/.test(formattedPhone)) {
				paymentRecipientId = formattedPhone
				phoneForData = formattedPhone // Сохраняем для использования в DATA
			} else {
				// Если формат неверный, используем идентификатор пользователя
				paymentRecipientId = `user_${user.id}`
			}
		} else {
			// Если телефона нет, используем идентификатор пользователя
			// Это допустимо согласно примеру в документации (там используется "asdasdad")
			paymentRecipientId = `user_${user.id}`
		}

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

		// Генерируем OrderId для этого платежа (будет использован в SuccessURL)
		// OrderId должен быть уникальным и использоваться для идентификации платежа при возврате
		const orderId = `DEPOSIT_${user.id}_${Date.now()}_${Math.random()
			.toString(36)
			.substring(7)}`

		// Формируем URL для возврата после оплаты
		// Согласно документации Т-Банка, в SuccessURL можно использовать шаблоны:
		// ${Success}, ${ErrorCode}, ${OrderId}, ${Message}, ${Details}
		// PaymentId НЕ передается в URL! Используем OrderId для идентификации платежа
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
		const successURL = `${appUrl}/payment/return?Success=\${Success}&ErrorCode=\${ErrorCode}&OrderId=\${OrderId}`
		const failURL = `${appUrl}/payment/return?Success=\${Success}&ErrorCode=\${ErrorCode}&OrderId=\${OrderId}&Message=\${Message}`

		logger.info('Инициализация пополнения баланса', {
			userId: user.id,
			amount: amountNumber,
			dealId: dealIdToUse,
			createNewDeal,
			successURL,
		})

		// Формируем NotificationURL для webhook-уведомлений
		const notificationURL = `${appUrl}/api/tbank/webhook`

		// Инициируем платеж с OrderId
		const result = await client.initPayment({
			amount: amountNumber,
			dealId: dealIdToUse,
			paymentRecipientId,
			description: `Пополнение баланса пользователя ${user.email}`,
			createDeal: createNewDeal,
			orderId: orderId, // Передаем наш OrderId
			successURL,
			failURL,
			notificationURL, // URL для получения webhook-уведомлений
			phone: phoneForData, // Телефон для DATA (только если есть реальный телефон)
			email: user.email, // Email для DATA
		})

		if (!result.Success || !result.PaymentId) {
			logger.error('❌ Ошибка инициации платежа Т-Банк', {
				userId: user.id,
				errorCode: result.ErrorCode,
				message: result.Message,
				details: result.Details,
				success: result.Success,
				paymentId: result.PaymentId,
				status: result.Status,
				fullResult: JSON.stringify(result, null, 2),
				requestParams: {
					amount: amountNumber,
					dealId: dealIdToUse,
					createDeal: createNewDeal,
					orderId: orderId,
					paymentRecipientId,
				},
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
			// Используем OrderId из ответа Т-Банка (он должен совпадать с тем, что мы отправили)
			const finalOrderId = result.OrderId || orderId

			const savedPayment = await prisma.tBankPayment.create({
				data: {
					dealId: deal.id,
					paymentId: result.PaymentId,
					orderId: finalOrderId, // Используем OrderId для связи с URL возврата
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
				orderId: finalOrderId,
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
			orderId: result.OrderId || orderId,
			savedInDb: !!finalCheck,
		})

		// Возвращаем URL для оплаты
		// Сохраняем orderId в ответе для использования на клиенте
		return NextResponse.json({
			success: true,
			paymentId: result.PaymentId,
			orderId: result.OrderId || orderId,
			paymentURL: result.PaymentURL,
			status: result.Status,
			dealId: deal?.id,
			savedInDb: !!finalCheck,
		})
	} catch (error: any) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		const errorStack = error instanceof Error ? error.stack : undefined
		const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error))

		logger.error('❌ Ошибка при инициации пополнения', {
			userId: user?.id,
			error: errorMessage,
			errorStack,
			errorString,
			errorType: error?.constructor?.name,
			errorCode: error?.code,
			errorName: error?.name,
		})

		return NextResponse.json(
			{
				error: 'Внутренняя ошибка сервера',
				message: errorMessage,
			},
			{ status: 500 }
		)
	}
}
