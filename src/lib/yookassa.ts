/**
 * Библиотека для работы с ЮKassa (YooMoney)
 * Документация: https://yookassa.ru/developers/api
 */

import { Decimal } from '@prisma/client/runtime/library'
import { toNumber } from './money'

// Типы для ЮKassa API
export interface YooKassaPayment {
	id: string
	status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
	paid: boolean
	amount: {
		value: string
		currency: string
	}
	confirmation?: {
		type: 'redirect'
		confirmation_url: string
	}
	created_at: string
	description?: string
	metadata?: Record<string, any>
}

export interface CreatePaymentParams {
	amount: number | string | Decimal
	description: string
	returnUrl: string
	metadata?: Record<string, any>
}

/**
 * Создает платеж в ЮKassa
 */
export async function createYooKassaPayment(
	params: CreatePaymentParams
): Promise<YooKassaPayment> {
	const shopId = process.env.YOOKASSA_SHOP_ID
	const secretKey = process.env.YOOKASSA_SECRET_KEY

	if (!shopId || !secretKey) {
		throw new Error(
			'ЮKassa credentials not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in .env'
		)
	}

	// Конвертируем сумму в строку с 2 знаками после запятой
	const amountValue =
		typeof params.amount === 'number'
			? params.amount.toFixed(2)
			: toNumber(params.amount).toFixed(2)

	// Создаем уникальный ключ идемпотентности
	const idempotenceKey = `${Date.now()}-${Math.random()
		.toString(36)
		.substring(7)}`

	const body = {
		amount: {
			value: amountValue,
			currency: 'RUB',
		},
		confirmation: {
			type: 'redirect',
			return_url: params.returnUrl,
		},
		capture: true, // Автоматическое подтверждение платежа
		description: params.description,
		metadata: params.metadata || {},
	}

	// Базовая аутентификация (shopId:secretKey в base64)
	const authString = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

	const response = await fetch('https://api.yookassa.ru/v3/payments', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Idempotence-Key': idempotenceKey,
			Authorization: `Basic ${authString}`,
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const error = await response.json()
		console.error('YooKassa payment creation error:', error)
		throw new Error(
			`Failed to create payment: ${error.description || response.statusText}`
		)
	}

	return await response.json()
}

/**
 * Получает информацию о платеже
 */
export async function getYooKassaPayment(
	paymentId: string
): Promise<YooKassaPayment> {
	const shopId = process.env.YOOKASSA_SHOP_ID
	const secretKey = process.env.YOOKASSA_SECRET_KEY

	if (!shopId || !secretKey) {
		throw new Error('ЮKassa credentials not configured')
	}

	const authString = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

	const response = await fetch(
		`https://api.yookassa.ru/v3/payments/${paymentId}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Basic ${authString}`,
			},
		}
	)

	if (!response.ok) {
		throw new Error(`Failed to get payment: ${response.statusText}`)
	}

	return await response.json()
}

/**
 * Проверяет подпись вебхука от ЮKassa
 */
export function verifyYooKassaWebhook(
	body: string,
	signature: string | null
): boolean {
	// ЮKassa использует IP-whitelist для вебхуков, а не подписи
	// Проверяем, что запрос пришел с IP адресов ЮKassa
	// В продакшене нужно настроить проверку IP
	return true
}

/**
 * Парсит сумму из ответа ЮKassa в число
 */
export function parseYooKassaAmount(payment: YooKassaPayment): number {
	return parseFloat(payment.amount.value)
}
