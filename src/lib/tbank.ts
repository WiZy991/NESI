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
 * @param params - параметры запроса
 * @param password - пароль терминала (по умолчанию TBANK_PASSWORD для EACQ, для E2C передайте TBANK_E2C_PASSWORD)
 */
export function generateToken(
	params: Record<string, any>,
	password?: string
): string {
	const terminalPassword =
		password || process.env.TBANK_PASSWORD || process.env.TBANK_E2C_PASSWORD
	if (!terminalPassword) {
		throw new Error(
			'TBANK_PASSWORD или TBANK_E2C_PASSWORD не настроен в переменных окружения'
		)
	}

	// Добавляем пароль к параметрам
	const paramsWithPassword: Record<string, any> = {
		...params,
		Password: terminalPassword,
	}

	// Сортируем ключи и фильтруем пустые значения
	const sortedKeys = Object.keys(paramsWithPassword)
		.sort()
		.filter(key => {
			// Исключаем Token из вычисления (он не должен участвовать в подписи)
			if (key === 'Token') return false

			const value = paramsWithPassword[key]
			// Игнорируем пустые значения, но обрабатываем объекты (включая DATA)
			return value !== undefined && value !== null && value !== ''
		})

	// Конкатенируем значения
	// ВАЖНО: Для объектов (включая DATA) нужно сериализовать в JSON БЕЗ пробелов
	const concatenated = sortedKeys
		.map(key => {
			const value = paramsWithPassword[key]
			if (typeof value === 'object' && value !== null) {
				// Сериализуем объекты (включая DATA) в JSON без пробелов
				return JSON.stringify(value)
			}
			return String(value)
		})
		.join('')

	// Диагностика для E2C (выплаты)
	if (params.TerminalKey && String(params.TerminalKey).includes('E2C')) {
		console.log('🔐 [GENERATE-TOKEN] Параметры для подписи E2C:', {
			sortedKeys,
			concatenatedLength: concatenated.length,
			concatenatedPreview: concatenated.substring(0, 200) + '...',
		})
	}

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
	Details?: string
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

	// Инициализируем DATA для клиентских данных
	if (params.phone || params.customerEmail) {
		requestBody.DATA = {}
		if (params.phone) {
			requestBody.DATA.Phone = params.phone
		}
		if (params.customerEmail) {
			requestBody.DATA.Email = params.customerEmail
		}
	}

	// Если нужно создать сделку
	if (params.createDeal && !params.dealId) {
		// CreateDealWithType должен быть ВНЕ блока DATA (на верхнем уровне запроса)
		// Согласно документации: "параметр CreateDealWithType со значением 'NN' (вне блока DATA)"
		requestBody.CreateDealWithType = 'NN'

		console.log(
			'🔧 [TBANK] Создаем сделку:',
			JSON.stringify(
				{
					CreateDealWithType: requestBody.CreateDealWithType,
					structure: 'CreateDealWithType вне DATA (согласно документации)',
				},
				null,
				2
			)
		)
	}

	// Если указан DealId, используем его (вне блока DATA)
	if (params.dealId) {
		requestBody.DealId = params.dealId
	}

	// URL для редиректа после оплаты
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	requestBody.SuccessURL = `${baseUrl}/wallet/payment-success`
	requestBody.FailURL = `${baseUrl}/wallet/payment-failed`
	requestBody.NotificationURL = `${baseUrl}/api/wallet/tbank/webhook`

	// Генерируем Token
	requestBody.Token = generateToken(requestBody)

	// Логируем только структуру, без полного тела запроса
	console.log('📤 [TBANK] Отправляем запрос Init:', {
		url: `${getApiUrl()}/v2/Init`,
		hasCreateDealWithType: !!requestBody.CreateDealWithType,
		hasStartSpAccumulation: !!requestBody.DATA?.StartSpAccumulation,
		hasDATA: !!requestBody.DATA,
	})

	const response = await fetch(`${getApiUrl()}/v2/Init`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	if (!response.ok) {
		const errorText = await response
			.text()
			.catch(() => 'Не удалось прочитать ответ')
		console.error('❌ [TBANK] HTTP ошибка при создании платежа:', {
			status: response.status,
			statusText: response.statusText,
			body: errorText,
		})
		throw new Error(`HTTP ошибка ${response.status}: ${errorText}`)
	}

	let data: PaymentResponse
	try {
		data = await response.json()
	} catch (error: any) {
		console.error('❌ [TBANK] Ошибка парсинга JSON ответа:', error)
		const text = await response.text().catch(() => 'Не удалось прочитать ответ')
		throw new Error(`Ошибка парсинга ответа от Т-Банка: ${text}`)
	}

	console.log('📥 [TBANK] Ответ от Init:', {
		success: data.Success,
		errorCode: data.ErrorCode,
		message: data.Message,
		paymentId: data.PaymentId,
		paymentURL: data.PaymentURL ? 'есть' : 'отсутствует',
		dealId: data.DealId,
		spAccumulationId: data.SpAccumulationId,
	})

	if (!data.Success && data.ErrorCode !== '0') {
		console.error('❌ [TBANK] Ошибка создания платежа:', {
			errorCode: data.ErrorCode,
			message: data.Message,
			details: data.Details,
		})
		throw new Error(
			data.Message || `Ошибка создания платежа: ${data.ErrorCode}`
		)
	}

	return data
}

/**
 * Создание сделки через createSpDeal
 * Альтернативный способ создания сделки
 */
export async function createSpDeal(): Promise<{
	SpAccumulationId: string
	Success: boolean
	ErrorCode: string
}> {
	const terminalKey = process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_TERMINAL_KEY не настроен в переменных окружения')
	}

	const requestBody: Record<string, any> = {
		TerminalKey: terminalKey,
		SpDealType: 'NN',
	}

	requestBody.Token = generateToken(requestBody)

	console.log('🔧 [TBANK] Создаем сделку через createSpDeal:', {
		url: `${getApiUrl()}/v2/createSpDeal`,
		requestBody: JSON.stringify(requestBody, null, 2),
	})

	const response = await fetch(`${getApiUrl()}/v2/createSpDeal`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	if (!response.ok) {
		const errorText = await response
			.text()
			.catch(() => 'Не удалось прочитать ответ')
		throw new Error(
			`HTTP ошибка ${response.status} при создании сделки: ${errorText}`
		)
	}

	const data = await response.json()

	console.log('📥 [TBANK] Ответ от createSpDeal:', {
		success: data.Success,
		spAccumulationId: data.SpAccumulationId,
		errorCode: data.ErrorCode,
		fullResponse: JSON.stringify(data, null, 2),
	})

	if (!data.Success) {
		throw new Error(data.Message || `Ошибка создания сделки: ${data.ErrorCode}`)
	}

	return data
}

/**
 * Параметры для создания выплаты
 */
export interface CreateWithdrawalParams {
	amount: number // Сумма в рублях
	orderId: string // Уникальный ID заказа
	dealId: string // ID сделки (ОБЯЗАТЕЛЕН для мультирасчетов)
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
	}

	// DealId ОБЯЗАТЕЛЕН для выплат в рамках мультирасчетов
	if (!params.dealId) {
		throw new Error('DealId обязателен для выплат в рамках мультирасчетов')
	}
	requestBody.DealId = params.dealId

	// PaymentRecipientId ВСЕГДА обязателен (согласно документации A2C_V2 стр. 15-16)
	requestBody.PaymentRecipientId = params.paymentRecipientId

	// Если выплата по СБП - дополнительно добавляем Phone + SbpMemberId
	if (params.phone && params.sbpMemberId) {
		requestBody.Phone = params.phone
		requestBody.SbpMemberId = params.sbpMemberId
	}
	// Если выплата на карту - добавляем CardId
	else if (params.cardId) {
		requestBody.CardId = params.cardId
	}

	// Финальная выплата
	if (params.finalPayout) {
		requestBody.FinalPayout = true
	}

	// URL для нотификаций о статусе выплаты
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	requestBody.NotificationURL = `${baseUrl}/api/wallet/tbank/webhook`

	// Генерируем Token с паролем E2C терминала
	const e2cPassword = process.env.TBANK_E2C_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_PASSWORD не настроен в переменных окружения')
	}

	console.log('🔐 [TBANK] Генерация подписи:', {
		hasE2cPassword: !!e2cPassword,
		e2cPasswordLength: e2cPassword?.length,
		parametersForSignature: Object.keys(requestBody).sort(),
	})

	try {
		requestBody.Token = generateToken(requestBody, e2cPassword)
	} catch (error: any) {
		throw new Error(
			`Ошибка генерации токена: ${
				error.message || 'Проверьте настройки TBANK_E2C_PASSWORD'
			}`
		)
	}

	console.log('📤 [TBANK] Подготовка запроса на выплату:', {
		requestBody: JSON.stringify(requestBody, null, 2),
		dealId: params.dealId,
		finalPayout: params.finalPayout,
		note: 'FinalPayout должен быть вне блока DATA (на верхнем уровне)',
	})

	let response: Response
	try {
		const apiUrl = `${getApiUrl()}/e2c/v2/Init/`
		console.log('📤 [TBANK] Создание выплаты:', {
			url: apiUrl,
			orderId: params.orderId,
			amount: amountInKopecks,
			dealId: params.dealId,
			hasCardId: !!params.cardId,
			hasPhone: !!params.phone,
			hasSbpMemberId: !!params.sbpMemberId,
			finalPayout: params.finalPayout,
		})

		response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})
	} catch (error: any) {
		console.error('❌ [TBANK] Ошибка сети:', error)
		throw new Error(
			`Ошибка сети при создании выплаты: ${
				error.message || 'Не удалось подключиться к API Т-Банка'
			}`
		)
	}

	if (!response.ok) {
		const errorText = await response
			.text()
			.catch(() => 'Не удалось прочитать ответ')
		console.error('❌ [TBANK] HTTP ошибка:', {
			status: response.status,
			statusText: response.statusText,
			body: errorText,
		})
		throw new Error(
			`Ошибка HTTP ${response.status} при создании выплаты: ${errorText}`
		)
	}

	let data: PaymentResponse
	try {
		data = await response.json()
		console.log('📥 [TBANK] Ответ от API:', {
			success: data.Success,
			errorCode: data.ErrorCode,
			message: data.Message,
			paymentId: data.PaymentId,
		})
	} catch (error: any) {
		console.error('❌ [TBANK] Ошибка парсинга JSON:', error)
		throw new Error(
			`Ошибка парсинга ответа от Т-Банка: ${
				error.message || 'Некорректный формат ответа'
			}`
		)
	}

	if (!data.Success && data.ErrorCode !== '0') {
		console.error('❌ [TBANK] Ошибка от API:', {
			errorCode: data.ErrorCode,
			message: data.Message,
		})
		throw new Error(
			data.Message ||
				`Ошибка создания выплаты: ${data.ErrorCode || 'неизвестная ошибка'}`
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

	const requestBody: Record<string, any> = {
		TerminalKey: terminalKey,
		PaymentId: paymentId,
	}

	// Генерируем Token с паролем E2C терминала
	const e2cPassword = process.env.TBANK_E2C_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_PASSWORD не настроен в переменных окружения')
	}

	requestBody.Token = generateToken(requestBody, e2cPassword)

	let response: Response
	try {
		response = await fetch(`${getApiUrl()}/e2c/v2/Payment/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})
	} catch (error: any) {
		throw new Error(
			`Ошибка сети при подтверждении выплаты: ${
				error.message || 'Не удалось подключиться к API Т-Банка'
			}`
		)
	}

	if (!response.ok) {
		const errorText = await response
			.text()
			.catch(() => 'Не удалось прочитать ответ')
		throw new Error(
			`Ошибка HTTP ${response.status} при подтверждении выплаты: ${errorText}`
		)
	}

	let data: PaymentResponse
	try {
		data = await response.json()
	} catch (error: any) {
		throw new Error(
			`Ошибка парсинга ответа от Т-Банка: ${
				error.message || 'Некорректный формат ответа'
			}`
		)
	}

	if (!data.Success && data.ErrorCode !== '0') {
		throw new Error(
			data.Message ||
				`Ошибка подтверждения выплаты: ${
					data.ErrorCode || 'неизвестная ошибка'
				}`
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

	const requestBody: Record<string, any> = {
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
		// Исключаем Token из параметров перед вычислением подписи
		const { Token, ...paramsWithoutToken } = body
		const expectedToken = generateToken(paramsWithoutToken)
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
