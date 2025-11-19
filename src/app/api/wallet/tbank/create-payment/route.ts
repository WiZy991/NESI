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

		// DealId может быть в поле DealId или SpAccumulationId
		const dealId = payment.DealId || payment.SpAccumulationId

		console.log('💳 [CREATE-PAYMENT] Ответ от Т-Банка:', {
			paymentId: payment.PaymentId,
			dealId: dealId,
			receivedDealId: payment.DealId,
			receivedSpAccumulationId: payment.SpAccumulationId,
			allFields: JSON.stringify(payment, null, 2),
		})

		logger.info('Создан платеж Т-Банк', {
			userId: user.id,
			paymentId: payment.PaymentId,
			amount: amountNumber,
			orderId,
			dealId: dealId || 'NULL',
			receivedDealId: payment.DealId,
			receivedSpAccumulationId: payment.SpAccumulationId,
		})

		console.log('✅ [CREATE-PAYMENT] Платеж успешно создан:', {
			paymentId: payment.PaymentId,
			paymentUrl: payment.PaymentURL,
			dealId: dealId,
			note: 'DealId может прийти только в вебхуке после оплаты',
		})

		return NextResponse.json({
			success: true,
			paymentId: payment.PaymentId,
			paymentUrl: payment.PaymentURL,
			amount: amountNumber,
			dealId: dealId,
			note: dealId ? 'DealId получен из ответа Init' : 'DealId будет получен в вебхуке после оплаты',
		})
	} catch (error: any) {
		console.error('❌ [CREATE-PAYMENT] Ошибка создания платежа:', {
			error: error.message,
			stack: error.stack,
			name: error.name,
			userId: (await getUserFromRequest(req).catch(() => null))?.id,
		})
		logger.error('Ошибка создания платежа T-Bank', error, {
			userId: (await getUserFromRequest(req).catch(() => null))?.id,
		})
		
		// Возвращаем более детальную информацию об ошибке
		const errorMessage = error.message || 'Ошибка создания платежа'
		const statusCode = error.message?.includes('HTTP ошибка') ? 502 : 500
		
		return NextResponse.json(
			{ 
				error: errorMessage,
				details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
			},
			{ status: statusCode }
		)
	}
}
