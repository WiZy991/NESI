import {
	logActivity,
	sendAdminAlert,
	validateWithdrawal,
} from '@/lib/antifraud'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
	formatMoney,
	hasEnoughBalance,
	isPositiveAmount,
	parseUserInput,
	toNumber,
} from '@/lib/money'
import prisma from '@/lib/prisma'
import { TBankClient, TBankPayoutClient } from '@/lib/tbank/client'
import { TBANK_CONFIG } from '@/lib/tbank/config'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/withdraw/init
 * Инициирует вывод средств через Т-Банк Мультирасчеты (E2C)
 */
export async function POST(req: NextRequest) {
	let user: any = null
	try {
		user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount, phone, cardId, isFinal } = await req.json()

		// Валидация суммы
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		const amountNumber = toNumber(parsedAmount)

		// Минимальная сумма 100 рублей для E2C выплат
		// Используем строгое сравнение с учетом возможных проблем округления
		if (isNaN(amountNumber) || amountNumber < 100) {
			logger.warn('Попытка вывода суммы меньше минимума', {
				amount,
				parsedAmount: parsedAmount.toString(),
				amountNumber,
			})
			return NextResponse.json(
				{ error: 'Минимальная сумма вывода: 100 ₽' },
				{ status: 400 }
			)
		}

		// Проверка телефона
		// Согласно документации, PaymentRecipientId должен быть в формате +7XXXXXXXXXX (12 символов)
		// Для Phone в e2c/v2/Init формат: 11 цифр без + (например: 79001234567)
		if (!phone) {
			return NextResponse.json(
				{
					error: 'Укажите номер телефона для вывода',
				},
				{ status: 400 }
			)
		}

		// Нормализуем телефон для Phone (11 цифр без +)
		let normalizedPhone = phone.replace(/[^0-9]/g, '')
		// Если начинается с 8, заменяем на 7
		if (normalizedPhone.startsWith('8')) {
			normalizedPhone = '7' + normalizedPhone.substring(1)
		}
		// Проверяем, что телефон состоит из 11 цифр (7 + 10 цифр)
		if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('7')) {
			return NextResponse.json(
				{
					error:
						'Некорректный формат телефона. Должно быть 11 цифр, начинающихся с 7 (например: 79001234567)',
				},
				{ status: 400 }
			)
		}

		// PaymentRecipientId для выплат: согласно документации может быть 11 цифр без +
		// В примере документации: "79066589133" (11 цифр)
		// Используем 11 цифр без + для выплат
		const paymentRecipientId = normalizedPhone

		// 🛡️ Anti-fraud проверки
		const validationResult = await validateWithdrawal(user.id, amountNumber)

		if (!validationResult.allowed) {
			await logActivity(user.id, 'withdraw_blocked', req, {
				amount: amountNumber,
				reason: validationResult.error,
			})

			return NextResponse.json(
				{ error: validationResult.error },
				{ status: 400 }
			)
		}

		// Предупреждение для админа
		if (validationResult.warning) {
			logger.warn('Вывод с предупреждением', {
				userId: user.id,
				warning: validationResult.warning,
				amount: amountNumber,
			})
		}

		// Проверка баланса
		const fresh = await prisma.user.findUnique({
			where: { id: user.id },
			select: {
				balance: true,
				frozenBalance: true,
				email: true,
				createdAt: true,
			},
		})

		if (
			!fresh ||
			!hasEnoughBalance(fresh.balance, fresh.frozenBalance, parsedAmount)
		) {
			const available = fresh
				? toNumber(fresh.balance) - toNumber(fresh.frozenBalance)
				: 0
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Доступно: ${formatMoney(
						available
					)}, требуется: ${formatMoney(parsedAmount)}`,
				},
				{ status: 400 }
			)
		}

		// Уведомление админа для новых аккаунтов
		const accountAge = Date.now() - fresh.createdAt.getTime()
		const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000

		if (isNewAccount && amountNumber > 3000) {
			await sendAdminAlert(
				`Новый аккаунт "${fresh.email}" выводит ${formatMoney(
					amountNumber
				)} через Т-Банк`,
				`/admin/users/${user.id}`,
				{
					amount: amountNumber,
					accountAgeDays: Math.floor(accountAge / (24 * 60 * 60 * 1000)),
				}
			)
		}

		// Находим или создаем открытую сделку
		let deal = await prisma.tBankDeal.findFirst({
			where: {
				userId: user.id,
				status: 'OPEN',
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Если нет открытой сделки - создаем
		if (!deal) {
			const tbankClient = new TBankClient()
			const dealResult = await tbankClient.createDeal()

			if (!dealResult.Success || !dealResult.SpAccumulationId) {
				return NextResponse.json(
					{ error: 'Не удалось создать сделку для вывода' },
					{ status: 500 }
				)
			}

			deal = await prisma.tBankDeal.create({
				data: {
					spAccumulationId: dealResult.SpAccumulationId,
					userId: user.id,
					dealType: 'NN',
					status: 'OPEN',
					totalAmount: new Prisma.Decimal(0),
					paidAmount: new Prisma.Decimal(0),
					remainingBalance: new Prisma.Decimal(0),
				},
			})
		}

		// Проверяем баланс сделки
		// Для E2C выплат нужно, чтобы на балансе сделки было достаточно средств
		// Если баланс сделки меньше суммы выплаты, нужно сначала пополнить баланс сделки
		const dealBalance = toNumber(deal.remainingBalance || 0)
		if (dealBalance < amountNumber) {
			logger.warn('Недостаточно средств на балансе сделки', {
				userId: user.id,
				dealId: deal.spAccumulationId,
				dealBalance,
				requestedAmount: amountNumber,
			})

			// Для E2C можно выводить напрямую с баланса пользователя, но нужно проверить документацию
			// Пока оставляем предупреждение, но не блокируем
		}

		// Инициируем выплату
		const payoutClient = new TBankPayoutClient()
		// Генерируем orderId заранее, чтобы использовать его и в API, и в БД
		const orderId = `PAYOUT_${Date.now()}_${user.id.slice(0, 8)}`
		const result = await payoutClient.initPayout({
			amount: amountNumber,
			orderId,
			dealId: deal.spAccumulationId,
			paymentRecipientId: paymentRecipientId, // Формат: +7XXXXXXXXXX (12 символов)
			recipientPhone: normalizedPhone, // Формат: 11 цифр без + (например: 79001234567)
			recipientCardId: cardId,
			isFinal: isFinal || false,
		})

		if (!result.Success || !result.PaymentId) {
			logger.error('Ошибка инициации выплаты Т-Банк', undefined, {
				userId: user.id,
				errorCode: result.ErrorCode,
				message: result.Message,
				details: result.Details,
				fullResponse: JSON.stringify(result),
				amount: amountNumber,
				dealId: deal.spAccumulationId,
				phone,
			})

			// Более понятное сообщение об ошибке
			let errorMessage = result.Message || 'Не удалось инициировать выплату'

			// Если ошибка связана с суммой - показываем более точное сообщение
			if (result.Details && result.Details.includes('wrong.payout.amount')) {
				if (amountNumber < 100) {
					errorMessage = 'Неверная сумма выплаты. Минимальная сумма: 100 ₽'
				} else {
					// Сумма больше 1000, но все равно ошибка - возможно, проблема с балансом сделки
					const dealBalance = toNumber(deal.remainingBalance || 0)
					if (dealBalance < amountNumber) {
						errorMessage = `Недостаточно средств на балансе сделки. Доступно: ${formatMoney(
							dealBalance
						)}, требуется: ${formatMoney(
							amountNumber
						)}. Пополните баланс через депозит.`
					} else {
						errorMessage = `Неверная сумма выплаты. Проверьте баланс сделки или обратитесь в поддержку.`
					}
				}
			}

			return NextResponse.json(
				{
					error: errorMessage,
					errorCode: result.ErrorCode,
					details: result.Details,
				},
				{ status: 400 }
			)
		}

		// Сохраняем выплату в БД
		const payout = await prisma.tBankPayout.create({
			data: {
				dealId: deal.id,
				paymentId: result.PaymentId,
				orderId,
				recipientId: user.id,
				recipientType: phone ? 'phone' : cardId ? 'card' : 'user',
				amount: new Prisma.Decimal(amountNumber),
				status: result.Status || 'NEW',
				isFinal: isFinal || false,
				terminalKey: TBANK_CONFIG.E2C_TERMINAL_KEY,
			},
		})

		// Замораживаем средства на балансе пользователя
		await prisma.user.update({
			where: { id: user.id },
			data: {
				frozenBalance: {
					increment: new Prisma.Decimal(amountNumber),
				},
			},
		})

		logger.info('Выплата инициирована', {
			userId: user.id,
			payoutId: payout.id,
			paymentId: result.PaymentId,
			amount: amountNumber,
			phone,
			status: result.Status,
			hasCardId: !!cardId,
		})

		// Согласно документации:
		// - Для СБП: выплата происходит в Init, Payment не нужен
		// - Для карты: нужно вызвать /e2c/v2/Payment после Init
		// Если указана карта - вызываем Payment сразу
		if (cardId && result.Status === 'CHECKED') {
			logger.info('Выплата на карту, вызываем Payment', {
				paymentId: result.PaymentId,
			})

			try {
				const executeResult = await payoutClient.executePayout(result.PaymentId)

				if (executeResult.Success) {
					// Обновляем статус выплаты
					await prisma.tBankPayout.update({
						where: { paymentId: result.PaymentId },
						data: {
							status: executeResult.Status || 'COMPLETING',
						},
					})

					// Списываем с баланса и размораживаем
					await prisma.user.update({
						where: { id: user.id },
						data: {
							balance: {
								decrement: payout.amount,
							},
							frozenBalance: {
								decrement: payout.amount,
							},
							transactions: {
								create: {
									amount: new Prisma.Decimal(-amountNumber),
									type: 'withdraw',
									reason: `Вывод средств через Т-Банк (PaymentId: ${result.PaymentId})`,
								},
							},
						},
					})

					// Обновляем баланс сделки
					await prisma.tBankDeal.update({
						where: { id: deal.id },
						data: {
							paidAmount: {
								increment: payout.amount,
							},
							remainingBalance: {
								decrement: payout.amount,
							},
						},
					})

					logger.info('✅ Выплата на карту выполнена', {
						paymentId: result.PaymentId,
						status: executeResult.Status,
					})

					return NextResponse.json({
						success: true,
						paymentId: result.PaymentId,
						status: executeResult.Status,
						message: 'Средства успешно выведены на карту',
					})
				} else {
					logger.error('Ошибка выполнения выплаты на карту', {
						paymentId: result.PaymentId,
						errorCode: executeResult.ErrorCode,
						message: executeResult.Message,
					})

					// Размораживаем средства при ошибке
					await prisma.user.update({
						where: { id: user.id },
						data: {
							frozenBalance: {
								decrement: payout.amount,
							},
						},
					})

					return NextResponse.json(
						{
							error: executeResult.Message || 'Не удалось выполнить выплату',
							errorCode: executeResult.ErrorCode,
						},
						{ status: 400 }
					)
				}
			} catch (error) {
				logger.error('Ошибка при вызове Payment для карты', {
					paymentId: result.PaymentId,
					error: error instanceof Error ? error.message : String(error),
				})

				// Размораживаем средства при ошибке
				await prisma.user.update({
					where: { id: user.id },
					data: {
						frozenBalance: {
							decrement: payout.amount,
						},
					},
				})

				return NextResponse.json(
					{
						error: 'Ошибка при выполнении выплаты',
					},
					{ status: 500 }
				)
			}
		}

		// Для СБП выплата происходит в Init, Payment не нужен
		return NextResponse.json({
			success: true,
			paymentId: result.PaymentId,
			status: result.Status,
			message:
				result.Status === 'COMPLETED'
					? 'Средства успешно переведены'
					: 'Выплата инициирована. Средства будут переведены после проверки.',
		})
	} catch (error) {
		let errorMessage = 'Unknown error'
		let errorStack: string | undefined
		let errorDetails: any = null

		if (error instanceof Error) {
			errorMessage = error.message
			errorStack = error.stack
			errorDetails = {
				name: error.name,
				message: error.message,
			}
		} else if (typeof error === 'object' && error !== null) {
			try {
				errorDetails = JSON.stringify(error)
				errorMessage = String(error)
			} catch {
				errorMessage = String(error)
				errorDetails = error
			}
		} else {
			errorMessage = String(error)
		}

		logger.error(
			'Ошибка инициации вывода',
			error instanceof Error ? error : undefined,
			{
				userId: user ? user.id : 'unknown',
				error: errorMessage,
				stack: errorStack,
				details: errorDetails,
			}
		)
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
