/**
 * Библиотека для работы с Т-Банк Мультирасчеты API
 * Документация: https://www.tbank.ru/kassa/dev/
 */

import crypto from 'crypto'

const TBANK_API_URL =
	process.env.TBANK_API_URL || 'https://securepay.tinkoff.ru'
const TBANK_TEST_API_URL = 'https://rest-api-test.tinkoff.ru'

/**
 * Получить базовый URL API в зависимости от окружения
 */
function getApiUrl(): string {
	return process.env.NODE_ENV === 'production'
		? TBANK_API_URL
		: TBANK_TEST_API_URL
}

/**
 * Генерация Token для подписи запроса
 * Алгоритм: SHA-256 от конкатенации отсортированных значений параметров + Password
 */
export function generateToken(params: Record<string, any>): string {
	const password = process.env.TBANK_PASSWORD
	if (!password) {
		throw new Error('TBANK_PASSWORD не настроен в переменных окружения')
	}

	// Добавляем пароль к параметрам
	const paramsWithPassword = { ...params, Password: password }

	// Сортируем ключи и фильтруем пустые значения
	const sortedKeys = Object.keys(paramsWithPassword)
		.sort()
		.filter(
			key =>
				paramsWithPassword[key] !== undefined &&
				paramsWithPassword[key] !== null &&
				paramsWithPassword[key] !== ''
		)

	// Конкатенируем значения
	const concatenated = sortedKeys.map(key => paramsWithPassword[key]).join('')

	// Вычисляем SHA-256
	return crypto.createHash('sha256').update(concatenated).digest('hex')
}

/**
 * Параметры для создания платежа (пополнение)
 */
export interface CreatePaymentParams {
	amount: number // Сумма в рублях
	orderId: string // Уникальный ID заказа
	description?: string
	customerEmail?: string
	phone?: string
	dealId?: string // ID сделки (если уже создана)
	createDeal?: boolean // Создать новую сделку
	paymentRecipientId: string // Телефон получателя выплаты в формате "+79606747611"
}

/**
 * Ответ на создание платежа
 */
export interface PaymentResponse {
	Success: boolean
	ErrorCode?: string
	Message?: string
	TerminalKey?: string
	Amount?: number
	OrderId?: string
	PaymentId?: string
	PaymentURL?: string
	Status?: string
	DealId?: string
	SpAccumulationId?: string // ID сделки (может быть в этом поле)
}

/**
 * Создание платежа для пополнения баланса
 */
export async function createPayment(
	params: CreatePaymentParams
): Promise<PaymentResponse> {
	const terminalKey = process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_TERMINAL_KEY не настроен в переменных окружения')
	}

	const amountInKopecks = Math.round(params.amount * 100) // Конвертируем в копейки

	const requestBody: any = {
		TerminalKey: terminalKey,
		Amount: amountInKopecks,
		OrderId: params.orderId,
		Description: params.description || 'Пополнение баланса NESI',
		PaymentRecipientId: params.paymentRecipientId,
	}

	// Если нужно создать сделку
	if (params.createDeal && !params.dealId) {
		requestBody.CreateDealWithType = 'NN'
	}

	// Если указан DealId, используем его
	if (params.dealId) {
		requestBody.DealId = params.dealId
	}

	// Добавляем данные клиента в DATA
	if (params.phone || params.customerEmail) {
		requestBody.DATA = {}
		if (params.phone) {
			requestBody.DATA.Phone = params.phone
		}
		if (params.customerEmail) {
			requestBody.DATA.Email = params.customerEmail
		}
	}

	// URL для редиректа после оплаты
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	requestBody.SuccessURL = `${baseUrl}/wallet/payment-success`
	requestBody.FailURL = `${baseUrl}/wallet/payment-failed`
	requestBody.NotificationURL = `${baseUrl}/api/wallet/tbank/webhook`

	// Генерируем Token
	requestBody.Token = generateToken(requestBody)

	const response = await fetch(`${getApiUrl()}/v2/Init`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	const data = await response.json()

	if (!data.Success && data.ErrorCode !== '0') {
		throw new Error(
			data.Message || `Ошибка создания платежа: ${data.ErrorCode}`
		)
	}

	return data
}

/**
 * Параметры для создания выплаты
 */
export interface CreateWithdrawalParams {
	amount: number // Сумма в рублях
	orderId: string // Уникальный ID заказа
	dealId: string // ID сделки (обязателен для выплат)
	paymentRecipientId: string // Телефон получателя в формате "+79606747611"
	cardId?: string // ID привязанной карты (если есть)
	phone?: string // Телефон для выплаты по СБП
	sbpMemberId?: string // ID банка для СБП
	finalPayout?: boolean // Финальная выплата (закрывает сделку)
}

/**
 * Создание выплаты (вывод средств)
 */
export async function createWithdrawal(
	params: CreateWithdrawalParams
): Promise<PaymentResponse> {
	const terminalKey =
		process.env.TBANK_E2C_TERMINAL_KEY || process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_E2C_TERMINAL_KEY не настроен в переменных окружения')
	}

	const amountInKopecks = Math.round(params.amount * 100)

	const requestBody: any = {
		TerminalKey: terminalKey,
		Amount: amountInKopecks,
		OrderId: params.orderId,
		PaymentRecipientId: params.paymentRecipientId,
		DealId: params.dealId,
	}

	// Если указана привязанная карта
	if (params.cardId) {
		requestBody.CardId = params.cardId
	}

	// Если выплата по СБП
	if (params.phone && params.sbpMemberId) {
		requestBody.Phone = params.phone
		requestBody.SbpMemberId = params.sbpMemberId
	}

	// Финальная выплата
	if (params.finalPayout) {
		requestBody.FinalPayout = true
	}

	// Генерируем Token
	requestBody.Token = generateToken(requestBody)

	const response = await fetch(`${getApiUrl()}/e2c/v2/Init/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	const data = await response.json()

	if (!data.Success && data.ErrorCode !== '0') {
		throw new Error(
			data.Message || `Ошибка создания выплаты: ${data.ErrorCode}`
		)
	}

	return data
}

/**
 * Подтверждение выплаты (вызов метода Payment после Init)
 */
export async function confirmWithdrawal(
	paymentId: string
): Promise<PaymentResponse> {
	const terminalKey =
		process.env.TBANK_E2C_TERMINAL_KEY || process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_E2C_TERMINAL_KEY не настроен в переменных окружения')
	}

	const requestBody = {
		TerminalKey: terminalKey,
		PaymentId: paymentId,
	}

	requestBody.Token = generateToken(requestBody)

	const response = await fetch(`${getApiUrl()}/e2c/v2/Payment/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	const data = await response.json()

	if (!data.Success && data.ErrorCode !== '0') {
		throw new Error(
			data.Message || `Ошибка подтверждения выплаты: ${data.ErrorCode}`
		)
	}

	return data
}

/**
 * Проверка статуса платежа
 */
export async function checkPaymentStatus(
	paymentId: string
): Promise<PaymentResponse> {
	const terminalKey = process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_TERMINAL_KEY не настроен в переменных окружения')
	}

	const requestBody = {
		TerminalKey: terminalKey,
		PaymentId: paymentId,
	}

	requestBody.Token = generateToken(requestBody)

	const response = await fetch(`${getApiUrl()}/v2/GetState`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	const data = await response.json()
	return data
}

/**
 * Проверка подписи вебхука от Т-Банка
 */
export function verifyWebhookSignature(
	body: any,
	receivedToken: string
): boolean {
	try {
		const expectedToken = generateToken(body)
		return expectedToken === receivedToken
	} catch {
		return false
	}
}

/**
 * Конвертация суммы из копеек в рубли
 */
export function kopecksToRubles(kopecks: number): number {
	return kopecks / 100
}

/**
 * Конвертация суммы из рублей в копейки
 */
export function rublesToKopecks(rubles: number): number {
	return Math.round(rubles * 100)
}
