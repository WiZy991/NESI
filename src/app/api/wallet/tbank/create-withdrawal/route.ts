import { logActivity, validateWithdrawal } from '@/lib/antifraud'
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
import { confirmWithdrawal, createWithdrawal } from '@/lib/tbank'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Обработка OPTIONS запроса для CORS
 */
export async function OPTIONS(req: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	})
}

/**
 * API для создания выплаты (вывода средств) через Т-Банк
 */
export async function POST(req: NextRequest) {
	try {
		// Логируем метод запроса для отладки
		console.log('📥 [CREATE-WITHDRAWAL] Запрос:', {
			method: req.method,
			url: req.url,
		})

		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount, cardId, phone, sbpMemberId, dealId } = await req.json()

		// Парсим и валидируем сумму
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		const amountNumber = toNumber(parsedAmount)

		// Минимальная сумма вывода - 100 рублей (10,000 копеек)
		if (amountNumber < 100) {
			return NextResponse.json(
				{ error: 'Минимальная сумма вывода: 100 ₽' },
				{ status: 400 }
			)
		}

		// 🛡️ Anti-fraud проверки перед выводом
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

		// Проверка баланса
		const fresh = await prisma.user.findUnique({
			where: { id: user.id },
			select: { balance: true, frozenBalance: true },
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

		// Проверяем наличие способа выплаты
		if (!cardId && (!phone || !sbpMemberId)) {
			return NextResponse.json(
				{
					error:
						'Не указан способ выплаты. Укажите cardId или phone+sbpMemberId',
				},
				{ status: 400 }
			)
		}

		// Создаем уникальный ID заказа
		const orderId = `withdraw_${user.id}_${Date.now()}`

		// Используем переданный DealId, если он есть (опционально)
		const finalDealId = dealId || undefined

		// Получаем телефон пользователя для PaymentRecipientId
		const paymentRecipientId =
			user.phone || user.email || `+7${user.id.slice(0, 10)}`
		const formattedPhone = paymentRecipientId.startsWith('+')
			? paymentRecipientId
			: `+7${paymentRecipientId.replace(/\D/g, '').slice(-10)}`

		// Создаем выплату в Т-Банке
		const withdrawal = await createWithdrawal({
			amount: amountNumber,
			orderId,
			dealId: finalDealId,
			paymentRecipientId: formattedPhone,
			cardId,
			phone: phone || (user.phone ? user.phone.replace(/\D/g, '') : undefined),
			sbpMemberId,
			finalPayout: true, // Закрываем сделку после выплаты
		})

		// Подтверждаем выплату
		if (withdrawal.PaymentId) {
			await confirmWithdrawal(withdrawal.PaymentId)
		}

		// Списываем средства с баланса пользователя
		const amountDecimal = new Prisma.Decimal(amountNumber)

		const updated = await prisma.user.update({
			where: { id: user.id },
			data: {
				balance: { decrement: amountDecimal },
				transactions: {
					create: {
						amount: new Prisma.Decimal(-amountNumber),
						type: 'withdraw',
						reason: `Вывод средств через Т-Банк (PaymentId: ${withdrawal.PaymentId})`,
						dealId: finalDealId,
						paymentId: withdrawal.PaymentId || null,
						status: 'completed',
					},
				},
			},
			select: { balance: true },
		})

		// Логируем успешный вывод
		await logActivity(user.id, 'withdraw_success', req, {
			amount: amountNumber,
			newBalance: toNumber(updated.balance),
			paymentId: withdrawal.PaymentId,
		})

		logger.info('Создана выплата Т-Банк', {
			userId: user.id,
			paymentId: withdrawal.PaymentId,
			amount: amountNumber,
			orderId,
		})

		return NextResponse.json({
			success: true,
			paymentId: withdrawal.PaymentId,
			balance: toNumber(updated.balance),
		})
	} catch (error: any) {
		logger.error('Ошибка создания выплаты T-Bank', error, {
			userId: (await getUserFromRequest(req))?.id,
		})
		return NextResponse.json(
			{ error: error.message || 'Ошибка создания выплаты' },
			{ status: 500 }
		)
	}
}
