import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { isPositiveAmount, parseUserInput, toNumber } from '@/lib/money'
import { createPayment } from '@/lib/tbank'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API для создания платежа на пополнение баланса через Т-Банк
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount } = await req.json()

		// Парсим и валидируем сумму
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		const amountNumber = toNumber(parsedAmount)

		// Минимальная сумма для карточных операций - 1 рубль (100 копеек)
		if (amountNumber < 1) {
			return NextResponse.json(
				{ error: 'Минимальная сумма пополнения: 1 ₽' },
				{ status: 400 }
			)
		}

		// Максимальная сумма (можно настроить)
		const maxAmount = 300000 // 300,000 ₽
		if (amountNumber > maxAmount) {
			return NextResponse.json(
				{ error: `Максимальная сумма пополнения: ${maxAmount} ₽` },
				{ status: 400 }
			)
		}

		// Создаем уникальный ID заказа
		const orderId = `deposit_${user.id}_${Date.now()}`

		// Получаем телефон пользователя для PaymentRecipientId
		// Если у пользователя нет телефона, используем email или дефолтное значение
		const paymentRecipientId =
			user.phone || user.email || `+7${user.id.slice(0, 10)}`

		// Создаем платеж в Т-Банке
		const payment = await createPayment({
			amount: amountNumber,
			orderId,
			description: `Пополнение баланса NESI`,
			customerEmail: user.email,
			phone: user.phone,
			createDeal: true, // Создаем новую сделку для каждого пополнения
			paymentRecipientId: paymentRecipientId.startsWith('+')
				? paymentRecipientId
				: `+7${paymentRecipientId.replace(/\D/g, '').slice(-10)}`,
		})

		logger.info('Создан платеж Т-Банк', {
			userId: user.id,
			paymentId: payment.PaymentId,
			amount: amountNumber,
			orderId,
		})

		// DealId может быть в поле DealId или SpAccumulationId
		const dealId = payment.DealId || payment.SpAccumulationId

		return NextResponse.json({
			success: true,
			paymentId: payment.PaymentId,
			paymentUrl: payment.PaymentURL,
			amount: amountNumber,
			dealId: dealId,
		})
	} catch (error: any) {
		logger.error('Ошибка создания платежа T-Bank', error, {
			userId: (await getUserFromRequest(req))?.id,
		})
		return NextResponse.json(
			{ error: error.message || 'Ошибка создания платежа' },
			{ status: 500 }
		)
	}
}
