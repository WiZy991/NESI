/**
 * Библиотека для работы с Т-Банк Мультирасчеты API
 * Документация: https://www.tbank.ru/kassa/dev/
 */

import crypto from 'crypto'

/**
 * Проверка конфигурации Т-Банка
 * Возвращает информацию о том, какие переменные окружения настроены
 */
export function validateTBankConfig(): {
	valid: boolean
	missing: string[]
} {
	const required = [
		'TBANK_TERMINAL_KEY',
		'TBANK_TERMINAL_PASSWORD',
		'TBANK_E2C_TERMINAL_KEY',
		'TBANK_E2C_TERMINAL_PASSWORD',
	]

	const missing: string[] = []

	for (const key of required) {
		if (!process.env[key]) {
			missing.push(key)
		}
	}

	return {
		valid: missing.length === 0,
		missing,
	}
}

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
 * @param password - пароль терминала (по умолчанию TBANK_TERMINAL_PASSWORD для EACQ, для E2C передайте TBANK_E2C_TERMINAL_PASSWORD)
 */
export function generateToken(
	params: Record<string, any>,
	password?: string
): string {
	const terminalPassword =
		password || 
		process.env.TBANK_TERMINAL_PASSWORD || 
		process.env.TBANK_PASSWORD || 
		process.env.TBANK_E2C_TERMINAL_PASSWORD
	if (!terminalPassword) {
		throw new Error(
			'TBANK_TERMINAL_PASSWORD, TBANK_PASSWORD или TBANK_E2C_TERMINAL_PASSWORD не настроен в переменных окружения'
		)
	}

	// Добавляем пароль к параметрам
	const paramsWithPassword: Record<string, any> = {
		...params,
		Password: terminalPassword,
	}

	// Сортируем ключи и фильтруем пустые значения
	// Согласно документации: в массив нужно добавить только параметры корневого объекта
	// Вложенные объекты и массивы не участвуют в расчете токена
	const sortedKeys = Object.keys(paramsWithPassword)
		.sort()
		.filter(key => {
			// Исключаем Token из вычисления (он не должен участвовать в подписи)
			if (key === 'Token') return false
			
			// Исключаем параметры RSA подписи (если они вдруг попадут в запрос)
			if (key === 'DigestValue' || key === 'SignatureValue' || key === 'X509SerialNumber') {
				return false
			}
			
			// ВАЖНО: CardData и CustomerKey НЕ участвуют в расчете Token
			// CardData используется для подписи по сертификату (RSA), а не через Token
			// Token используется только для CardId (когда данные хранятся на стороне банка)
			// Согласно документации: "CardData для выплаты по зашифрованным данным карты"
			// "Token используется для CardId, когда данные хранятся на стороне банка"
			if (key === 'CardData' || key === 'CustomerKey') {
				return false
			}

			const value = paramsWithPassword[key]
			// Игнорируем пустые значения
			if (value === undefined || value === null || value === '') {
				return false
			}
			
			// Исключаем вложенные объекты и массивы (они не участвуют в расчете токена)
			if (typeof value === 'object') {
				return false
			}
			
			return true
		})

	// Конкатенируем значения
	// Согласно документации: конкатенировать значения всех пар
	// Пример: Dfsfh56dgKl20150TestBtrue (Password, PaymentId, TerminalKey, isNeedRrn)
	const concatenated = sortedKeys
		.map(key => {
			const value = paramsWithPassword[key]
			
			// Диагностика для важных параметров
			if (key === 'FinalPayout') {
				console.log('🔐 [GENERATE-TOKEN] FinalPayout:', {
					value,
					typeof: typeof value,
					stringValue: String(value),
				})
			}
			
			// Преобразуем boolean в строку (true -> "true", false -> "false")
			// Согласно примеру: {"isNeedRrn",true} -> конкатенируется как "true"
			if (typeof value === 'boolean') {
				return value.toString()
			}
			
			// Преобразуем все остальные значения в строки
			// Числа, строки и другие примитивы преобразуются в строку
			return String(value)
		})
		.join('')

	// Диагностика для E2C (выплаты)
	if (params.TerminalKey && String(params.TerminalKey).includes('E2C')) {
		const finalPayoutValue = paramsWithPassword.FinalPayout
		const hasCardData = !!params.CardData
		const hasCardId = !!params.CardId
		console.log('🔐 [GENERATE-TOKEN] Параметры для подписи E2C:', {
			sortedKeys,
			hasCardData,
			hasCardId,
			excludedFromToken: hasCardData ? ['CardData', 'CustomerKey'] : [],
			note: hasCardData 
				? 'CardData и CustomerKey исключены из расчета Token (используется подпись по сертификату RSA)'
				: hasCardId
					? 'CardId участвует в расчете Token (данные хранятся на стороне банка)'
					: 'Используется Token для подписи запроса',
			finalPayout: {
				value: finalPayoutValue,
				typeof: typeof finalPayoutValue,
				stringValue: String(finalPayoutValue),
			},
			concatenatedLength: concatenated.length,
			concatenatedPreview: concatenated.substring(0, 200) + '...',
			fullConcatenated: concatenated,
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

	// Используем пароль для E2C терминала, если доступен, иначе обычный пароль
	const password = process.env.TBANK_E2C_TERMINAL_PASSWORD || process.env.TBANK_TERMINAL_PASSWORD || process.env.TBANK_PASSWORD
	if (!password) {
		throw new Error('TBANK_E2C_TERMINAL_PASSWORD, TBANK_TERMINAL_PASSWORD или TBANK_PASSWORD не настроен в переменных окружения')
	}

	const requestBody: Record<string, any> = {
		TerminalKey: terminalKey,
		SpDealType: 'NN',
	}

	requestBody.Token = generateToken(requestBody, password)

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
	cardData?: string // Данные карты - НЕ ПОДДЕРЖИВАЕТСЯ без RSA сертификата (будет выброшена ошибка)
	customerKey?: string // CustomerKey - НЕ ПОДДЕРЖИВАЕТСЯ без RSA сертификата (используется только с cardData)
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
		Amount: amountInKopecks, // Number - сумма в копейках
		OrderId: params.orderId,
	}

	// DealId ОБЯЗАТЕЛЕН для выплат в рамках мультирасчетов
	if (!params.dealId) {
		throw new Error('DealId обязателен для выплат в рамках мультирасчетов')
	}
	// ВАЖНО: Согласно документации Т-Банка (vyplaty-multisplit.md стр. 500, таблица 2.4.1)
	// DealId должен быть типа Number (SpAccumulationId - числовой идентификатор сделки)
	// В примерах запросов иногда передается как строка, но согласно официальной спецификации - Number
	// Преобразуем в число
	const dealIdNumber = typeof params.dealId === 'string' 
		? parseInt(params.dealId, 10) 
		: params.dealId
	if (isNaN(dealIdNumber as number)) {
		throw new Error(`Некорректный формат DealId: ${params.dealId}. Ожидается число или строка, преобразуемая в число.`)
	}
	requestBody.DealId = dealIdNumber as number

	// PaymentRecipientId ВСЕГДА обязателен (согласно документации A2C_V2 стр. 15-16)
	requestBody.PaymentRecipientId = params.paymentRecipientId

	// Если выплата по СБП - дополнительно добавляем Phone + SbpMemberId
	if (params.phone && params.sbpMemberId) {
		// ВАЛИДАЦИЯ: Phone должен быть 11 цифр, начинаться с 7
		// Согласно документации: "Формат: 11 цифр. Пример: 70123456789"
		const phoneRegex = /^7\d{10}$/
		if (!phoneRegex.test(params.phone)) {
			console.error('❌ [TBANK] Некорректный формат телефона:', {
				phone: params.phone,
				length: params.phone.length,
				note: 'Телефон должен быть 11 цифр, начинаться с 7. Пример: 79123456789',
			})
			throw new Error(
				`Некорректный формат телефона. Телефон должен быть 11 цифр, начинаться с 7. Пример: 79123456789. Получено: ${params.phone}`
			)
		}
		
		requestBody.Phone = params.phone
		// ВАЖНО: Согласно документации Т-Банка (multisplit.md стр. 1083, таблица 6.2)
		// SbpMemberId должен быть типа Number, не String
		// Преобразуем в число, если передана строка
		requestBody.SbpMemberId = typeof params.sbpMemberId === 'string' 
			? parseInt(params.sbpMemberId, 10) 
			: params.sbpMemberId
		
		console.log('✅ [TBANK] Телефон для СБП валидирован:', {
			phone: params.phone,
			length: params.phone.length,
			format: '11 цифр, начинается с 7',
			sbpMemberId: requestBody.SbpMemberId,
			sbpMemberIdType: typeof requestBody.SbpMemberId,
			note: 'SbpMemberId передается как Number согласно документации (multisplit.md стр. 1083)',
		})
	}
	// ВАЖНО: CardId и CardData - взаимоисключающие параметры
	// CardId используется для выплаты на привязанную карту (данные хранятся на стороне банка)
	// CardData используется для выплаты по зашифрованным данным карты (требует подпись по сертификату RSA)
	// Token используется ТОЛЬКО для CardId, НЕ используется для CardData
	// 
	// КРИТИЧНО: CardData требует RSA сертификат для подписи запроса
	// Если RSA сертификат не настроен, CardData НЕ может быть использован
	if (params.cardData) {
		// CardData требует подписи по сертификату RSA
		// Если RSA сертификат не настроен, выбрасываем ошибку
		throw new Error(
			'❌ CardData не поддерживается без RSA сертификата.\n\n' +
			'CardData требует подписи по сертификату RSA, которая не настроена.\n\n' +
			'Доступные способы вывода:\n\n' +
			'1️⃣ **Привязанная карта (CardId)**:\n' +
			'   • Сначала привяжите карту через раздел "Привязать карту"\n' +
			'   • Затем выберите привязанную карту при выводе\n\n' +
			'2️⃣ **СБП (Система Быстрых Платежей)**:\n' +
			'   • Выберите способ вывода "СБП"\n' +
			'   • Укажите номер телефона и банк\n' +
			'   • Средства поступят мгновенно\n\n' +
			'💡 Рекомендация: Используйте вывод через СБП или привяжите карту заранее.'
		)
	}
	
	if (params.cardId) {
		requestBody.CardId = params.cardId
		console.log('💳 [TBANK] Используется привязанная карта (CardId):', {
			cardId: params.cardId,
			note: 'Token будет сгенерирован для CardId (данные хранятся на стороне банка)',
		})
	}

	// Финальная выплата
	// ВАЖНО: Согласно документации Т-Банка (vyplaty-multisplit.md стр. 516, таблица 2.4.1)
	// FinalPayout должен быть типа Boolean, не String
	// В примерах запросов есть противоречие:
	// - Стр. 903 (СБП): "FinalPayout": "true" (строка) - НО это в примере, возможно опечатка
	// - Стр. 917 (Партнер): "FinalPayout": true (boolean)
	// Согласно таблице параметров (стр. 516) - тип Boolean
	// Используем Boolean согласно официальной спецификации
	if (params.finalPayout === true) {
		requestBody.FinalPayout = true
		console.log('✅ [TBANK] FinalPayout установлен:', {
			value: requestBody.FinalPayout,
			type: typeof requestBody.FinalPayout,
			note: 'FinalPayout передается как boolean true согласно документации (vyplaty-multisplit.md стр. 516)',
		})
	}

	// ВАЖНО: Согласно документации и примерам запросов (стр. 896-908, 1742-1749)
	// NotificationURL НЕ передается в запросах на выплату через e2c/v2/Init
	// Т-Банк сам отправляет нотификации на URL, указанный в настройках терминала
	console.log('🔧 [TBANK] Параметры запроса перед генерацией токена:', {
		allKeysBeforeToken: Object.keys(requestBody).sort(),
		note: 'NotificationURL НЕ передается в запросах на выплату (согласно документации)',
	})

	// Генерируем Token с паролем E2C терминала
	const e2cPassword = process.env.TBANK_E2C_TERMINAL_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_TERMINAL_PASSWORD не настроен в переменных окружения')
	}

	console.log('🔐 [TBANK] Генерация подписи:', {
		hasE2cPassword: !!e2cPassword,
		e2cPasswordLength: e2cPassword?.length,
		parametersForSignature: Object.keys(requestBody).sort(),
		hasCardId: !!requestBody.CardId,
		hasPhone: !!requestBody.Phone,
		hasSbpMemberId: !!requestBody.SbpMemberId,
		note: requestBody.CardId 
			? 'CardId участвует в расчете Token (данные хранятся на стороне банка)'
			: requestBody.Phone && requestBody.SbpMemberId
				? 'СБП - Token используется для подписи запроса'
				: 'Используется Token для подписи запроса',
		finalPayout: {
			value: requestBody.FinalPayout,
			typeof: typeof requestBody.FinalPayout,
			isString: typeof requestBody.FinalPayout === 'string',
			isBoolean: typeof requestBody.FinalPayout === 'boolean',
		},
		sbpMemberId: {
			value: requestBody.SbpMemberId,
			typeof: typeof requestBody.SbpMemberId,
			isNumber: typeof requestBody.SbpMemberId === 'number',
		},
	})

	// ВАЖНО: Согласно документации Т-Банка:
	// - CardId для выплаты на привязанную карту (данные хранятся на стороне банка)
	// - Token используется для CardId, когда данные хранятся на стороне банка
	// 
	// CardData НЕ поддерживается без RSA сертификата (проверка выполнена выше)
	// 
	// Условная обязательность передачи:
	// - CardId для выплаты на привязанную карту (с Token)
	// - или Phone + SbpMemberId для выплаты по СБП (с Token)
	
	const usesCardId = !!(params.cardId || requestBody.CardId)
	
	// Всегда генерируем Token (для CardId или для СБП)
	// Token используется для подписи запроса
	if (usesCardId) {
		// CardId используется - генерируем Token (данные хранятся на стороне банка)
		console.log('🔐 [TBANK] CardId используется - генерируем Token:', {
			hasCardId: !!requestBody.CardId,
			note: 'Token используется для CardId, когда данные хранятся на стороне банка',
		})
	} else {
		// СБП или другой способ - генерируем Token для подписи запроса
		console.log('🔐 [TBANK] Генерируем Token для подписи запроса:', {
			hasPhone: !!requestBody.Phone,
			hasSbpMemberId: !!requestBody.SbpMemberId,
			note: 'Используется Token для подписи запроса (СБП или другой способ)',
		})
	}
	
	try {
		requestBody.Token = generateToken(requestBody, e2cPassword)
	} catch (error: any) {
		throw new Error(
			`Ошибка генерации токена: ${
				error.message || 'Проверьте настройки TBANK_E2C_TERMINAL_PASSWORD'
			}`
		)
	}

	// ВАЖНО: NotificationURL НЕ передается в запросах на выплату
	// Т-Банк отправляет нотификации на URL, указанный в настройках терминала в личном кабинете

	console.log('📤 [TBANK] Подготовка запроса на выплату:', {
		requestBody: JSON.stringify(requestBody, null, 2),
		dealId: params.dealId,
		finalPayout: params.finalPayout,
		hasToken: !!requestBody.Token,
		hasCardData: !!requestBody.CardData,
		note: requestBody.CardData 
			? 'CardData используется - Token НЕ передается (подпись по сертификату RSA)'
			: 'FinalPayout должен быть вне блока DATA (на верхнем уровне)',
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
		const responseText = await response.text()
		console.log('📥 [TBANK] Ответ от e2c/v2/Init (raw):', {
			status: response.status,
			statusText: response.statusText,
			responseLength: responseText.length,
			responseText: responseText,
		})
		data = JSON.parse(responseText)
		console.log('📥 [TBANK] Ответ от e2c/v2/Init (parsed):', {
			success: data.Success,
			errorCode: data.ErrorCode,
			message: data.Message,
			details: data.Details,
			paymentId: data.PaymentId,
			fullResponse: JSON.stringify(data, null, 2),
		})
	} catch (error: any) {
		console.error('❌ [TBANK] Ошибка парсинга JSON:', error)
		const text = await response.text().catch(() => 'Не удалось прочитать ответ')
		console.error('❌ [TBANK] Raw response text:', text.substring(0, 500))
		throw new Error(
			`Ошибка парсинга ответа от Т-Банка: ${
				error.message || 'Некорректный формат ответа'
			}. Ответ: ${text.substring(0, 500)}`
		)
	}

	if (!data.Success && data.ErrorCode !== '0') {
		console.error('❌ [TBANK] Ошибка создания выплаты:', {
			errorCode: data.ErrorCode,
			message: data.Message,
			details: data.Details,
			amount: amountInKopecks,
			amountInRubles: amountInKopecks / 100,
			note: 'Проверьте детали ошибки в поле Details',
		})
		
		// Обработка конкретных ошибок
		let errorMessage = data.Message || `Ошибка создания выплаты: ${data.ErrorCode || 'неизвестная ошибка'}`
		
		// Специальная обработка ошибки 648 - магазин заблокирован
		if (data.ErrorCode === '648') {
			errorMessage = `❌ Терминал E2C заблокирован или не активирован.\n\n` +
				`Проблема: Т-Банк сообщает, что ваш терминал (${terminalKey}) заблокирован или еще не активирован для выплат.\n\n` +
				`Детали: ${data.Details || 'submerchant_id заблокирован'}\n\n` +
				`Решение:\n` +
				`• Обратитесь в поддержку Т-Банка (acq_help@tbank.ru)\n` +
				`• Уточните статус терминала E2C в личном кабинете Т-Банка\n` +
				`• Попросите активировать терминал E2C для выплат\n` +
				`• Проверьте, что терминал правильно настроен и не заблокирован\n\n` +
				`Важно: Без активированного терминала E2C выплаты невозможны.`
		} else if (data.Details) {
			// Упрощенные сообщения об ошибках для пользователей
			if (data.Details.includes('wrong.payout.amount')) {
				errorMessage = `Недостаточно средств для выплаты. Уменьшите сумму или попробуйте позже.`
			} else if (data.Details.includes('deal')) {
				errorMessage = `Ошибка при обработке выплаты. Попробуйте позже или обратитесь в поддержку.`
			} else if (data.Details.includes('заблокирован') || data.Details.includes('submerchant_id')) {
				errorMessage = `Вывод средств временно недоступен. Обратитесь в поддержку.`
			} else {
				errorMessage = `Ошибка вывода средств. Попробуйте позже.`
			}
		}
		
		// Обработка конкретных сообщений об ошибках
		if (data.Message) {
			const messageLower = data.Message.toLowerCase()
			if (messageLower.includes('сбп недоступен') || messageLower.includes('сбп не доступен') || messageLower.includes('недоступен для магазина') || messageLower.includes('сбп не поддерживается')) {
				errorMessage = `Вывод через СБП временно недоступен. Попробуйте позже.`
			}
		}
		
		// Обработка ошибок для выплат на карту
		if (false) { // CardData больше не поддерживается, эта ветка не используется
			// Обработка ошибок для выплат на карту
			const errorText = `${data.Details || ''} ${data.Message || ''}`.toLowerCase()
			if (errorText.includes('cardid') || errorText.includes('carddata') || errorText.includes('привязан') || errorText.includes('привяз')) {
				errorMessage = `Вывод на карту временно недоступен. Используйте вывод через СБП.`
			}
		}
		
		throw new Error(errorMessage)
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
	const e2cPassword = process.env.TBANK_E2C_TERMINAL_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_TERMINAL_PASSWORD не настроен в переменных окружения')
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
 * Получение списка банков СБП (GetSbpMembers)
 * Используется для проверки доступности СБП для терминала
 */
export async function getSbpMembers(): Promise<{
	Success: boolean
	ErrCode: string
	Message?: string
	Members?: Array<{
		MemberId: string
		MemberName?: string
		MemberNameRus: string
	}>
}> {
	const terminalKey = process.env.TBANK_E2C_TERMINAL_KEY || process.env.TBANK_TERMINAL_KEY
	if (!terminalKey) {
		throw new Error('TBANK_E2C_TERMINAL_KEY не настроен в переменных окружения')
	}

	const requestBody: Record<string, any> = {
		TerminalKey: terminalKey,
	}

	// Генерируем Token с паролем E2C терминала
	const e2cPassword = process.env.TBANK_E2C_TERMINAL_PASSWORD || process.env.TBANK_TERMINAL_PASSWORD || process.env.TBANK_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_TERMINAL_PASSWORD, TBANK_TERMINAL_PASSWORD или TBANK_PASSWORD не настроен в переменных окружения')
	}

	requestBody.Token = generateToken(requestBody, e2cPassword)

	// URL для GetSbpMembers отличается от обычного API URL
	// Боевой: https://securepay.tinkoff.ru/a2c/sbp/GetSbpMembers
	// Тестовый: https://rest-api-test.tinkoff.ru/a2c/sbp/GetSbpMembers
	const baseUrl = process.env.NODE_ENV === 'production'
		? 'https://securepay.tinkoff.ru'
		: 'https://rest-api-test.tinkoff.ru'
	const sbpMembersUrl = `${baseUrl}/a2c/sbp/GetSbpMembers`

	console.log('🔍 [TBANK] Запрос списка банков СБП (GetSbpMembers):', {
		url: sbpMembersUrl,
		terminalKey,
		hasPassword: !!e2cPassword,
		environment: process.env.NODE_ENV,
	})

	const response = await fetch(sbpMembersUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => 'Не удалось прочитать ответ')
		console.warn('⚠️ [TBANK] GetSbpMembers вернул HTTP ошибку (не критично):', {
			status: response.status,
			errorText,
			note: 'Это не критично - e2c/v2/Init сам проверит доступность СБП',
		})
		// Не выбрасываем ошибку, возвращаем объект с ошибкой
		try {
			const errorData = JSON.parse(errorText)
			return {
				Success: false,
				ErrCode: errorData.ErrorCode || String(response.status),
				Message: errorData.Message || `HTTP ошибка ${response.status}`,
			}
		} catch {
			return {
				Success: false,
				ErrCode: String(response.status),
				Message: `HTTP ошибка ${response.status}: ${errorText}`,
			}
		}
	}

	const data = await response.json()

	console.log('📥 [TBANK] Ответ от GetSbpMembers:', {
		success: data.Success,
		errCode: data.ErrCode || data.ErrorCode,
		message: data.Message,
		membersCount: data.Members?.length || 0,
		members: data.Members?.slice(0, 5), // Первые 5 банков для примера
	})

	// Возвращаем данные даже если Success = false - это информативная проверка
	// GetSbpMembers может вернуть ошибку, но это не означает, что СБП выплаты недоступны
	// Сам e2c/v2/Init проверит доступность СБП при попытке выплаты
	if (!data.Success && (data.ErrCode !== '0' && data.ErrorCode !== '0')) {
		console.warn('⚠️ [TBANK] GetSbpMembers вернул ошибку, но это не критично:', {
			errCode: data.ErrCode || data.ErrorCode,
			message: data.Message,
			note: 'Это не означает, что СБП выплаты недоступны - e2c/v2/Init сам проверит доступность',
		})
		// Не выбрасываем ошибку - возвращаем данные с информацией об ошибке
		return {
			Success: false,
			ErrCode: data.ErrCode || data.ErrorCode || '0',
			Message: data.Message,
			Members: data.Members,
		}
	}

	return {
		Success: data.Success || false,
		ErrCode: data.ErrCode || data.ErrorCode || '0',
		Message: data.Message,
		Members: data.Members,
	}
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

