/**
 * API для создания платежа через ЮKassa
 */

import { getUserFromRequest } from '@/lib/auth'
import { isPositiveAmount, parseUserInput } from '@/lib/money'
import { createYooKassaPayment } from '@/lib/yookassa'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount } = await req.json()

		// Валидируем сумму
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json(
				{ error: 'Некорректная сумма. Минимум 1.00 ₽' },
				{ status: 400 }
			)
		}

		const amountNum =
			typeof parsedAmount === 'number'
				? parsedAmount
				: parseFloat(parsedAmount.toString())

		// Минимальная сумма пополнения
		if (amountNum < 1) {
			return NextResponse.json(
				{ error: 'Минимальная сумма пополнения: 1.00 ₽' },
				{ status: 400 }
			)
		}

		// Максимальная сумма пополнения (защита от ошибок)
		if (amountNum > 100000) {
			return NextResponse.json(
				{ error: 'Максимальная сумма пополнения: 100,000.00 ₽' },
				{ status: 400 }
			)
		}

		// Создаем платеж в ЮKassa
		const payment = await createYooKassaPayment({
			amount: amountNum,
			description: `Пополнение баланса на сумму ${amountNum.toFixed(2)} ₽`,
			returnUrl: `${
				process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
			}/wallet/payment-result`,
			metadata: {
				userId: user.id,
				email: user.email,
				type: 'balance_deposit',
			},
		})

		// Возвращаем URL для редиректа на оплату
		return NextResponse.json({
			success: true,
			paymentId: payment.id,
			confirmationUrl: payment.confirmation?.confirmation_url,
			amount: amountNum,
		})
	} catch (error: any) {
		console.error('Ошибка создания платежа:', error)
		return NextResponse.json(
			{
				error: 'Не удалось создать платеж',
				details: error.message,
			},
			{ status: 500 }
		)
	}
}
