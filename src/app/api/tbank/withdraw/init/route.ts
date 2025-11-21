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

		// Минимальная сумма 100 рублей
		if (amountNumber < 100) {
			return NextResponse.json(
				{ error: 'Минимальная сумма вывода: 100 ₽' },
				{ status: 400 }
			)
		}

		// Проверка телефона
		if (!phone || !phone.match(/^\+?[7-8]\d{10}$/)) {
			return NextResponse.json(
				{
					error:
						'Укажите корректный номер телефона для вывода (формат: +79001234567)',
				},
				{ status: 400 }
			)
		}

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
				},
			})
		}

		// Инициируем выплату
		const payoutClient = new TBankPayoutClient()
		// Генерируем orderId заранее, чтобы использовать его и в API, и в БД
		const orderId = `PAYOUT_${Date.now()}_${user.id.slice(0, 8)}`
		const result = await payoutClient.initPayout({
			amount: amountNumber,
			orderId,
			dealId: deal.spAccumulationId,
			paymentRecipientId: phone,
			recipientPhone: phone,
			recipientCardId: cardId,
			isFinal: isFinal || false,
		})

		if (!result.Success || !result.PaymentId) {
			logger.error('Ошибка инициации выплаты Т-Банк', undefined, {
				userId: user.id,
				errorCode: result.ErrorCode,
				message: result.Message,
				fullResponse: JSON.stringify(result),
				amount: amountNumber,
				dealId: deal.spAccumulationId,
				phone,
			})

			return NextResponse.json(
				{
					error: result.Message || 'Не удалось инициировать выплату',
					errorCode: result.ErrorCode,
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
		})

		return NextResponse.json({
			success: true,
			paymentId: result.PaymentId,
			status: result.Status,
			message:
				'Выплата инициирована. Средства будут переведены после проверки.',
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
