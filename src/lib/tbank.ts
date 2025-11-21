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
	// ВАЖНО: Все значения должны быть преобразованы в строки БЕЗ дополнительных кавычек
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
			
			if (typeof value === 'object' && value !== null) {
				// Сериализуем объекты (включая DATA) в JSON без пробелов
				return JSON.stringify(value)
			}
			// Преобразуем все остальные значения в строки
			// ВАЖНО: String("true") вернет "true", но мы хотим без кавычек в строке подписи
			return String(value)
		})
		.join('')

	// Диагностика для E2C (выплаты)
	if (params.TerminalKey && String(params.TerminalKey).includes('E2C')) {
		const finalPayoutValue = paramsWithPassword.FinalPayout
		console.log('🔐 [GENERATE-TOKEN] Параметры для подписи E2C:', {
			sortedKeys,
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
		Amount: amountInKopecks, // Number - сумма в копейках
		OrderId: params.orderId,
	}

	// DealId ОБЯЗАТЕЛЕН для выплат в рамках мультирасчетов
	if (!params.dealId) {
		throw new Error('DealId обязателен для выплат в рамках мультирасчетов')
	}
	// ПРОТИВОРЕЧИЕ В ДОКУМЕНТАЦИИ:
	// - В таблице параметров (стр. 500): DealId Number
	// - В примере запроса (стр. 905): "DealId": "9043456" (строка)
	// Пробуем передавать как СТРОКУ, как в примере запроса
	requestBody.DealId = String(params.dealId)

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
		// ВАЖНО: Согласно документации (стр. 565) SbpMemberId должен быть Number
		// В примере запроса (стр. 902) показана строка, но это может быть ошибка в примере
		// Передаем как ЧИСЛО, как указано в документации
		requestBody.SbpMemberId = Number(params.sbpMemberId)
		
		console.log('✅ [TBANK] Телефон для СБП валидирован:', {
			phone: params.phone,
			length: params.phone.length,
			format: '11 цифр, начинается с 7',
			sbpMemberId: requestBody.SbpMemberId,
			sbpMemberIdType: typeof requestBody.SbpMemberId,
			note: 'SbpMemberId передается как строка (согласно примеру запроса стр. 902)',
		})
	}
	// Если выплата на карту - добавляем CardId или CardData
	if (params.cardId) {
		requestBody.CardId = params.cardId
		console.log('💳 [TBANK] Используется привязанная карта:', {
			cardId: params.cardId,
			note: 'CardId - идентификатор привязанной карты через AddCard',
		})
	} else if (params.cardData) {
		// CardData должен быть зашифрован через RSA и закодирован в Base64
		// Если передан незашифрованный CardData, пытаемся зашифровать
		let encryptedCardData = params.cardData
		
		// Проверяем, зашифрован ли уже CardData (Base64 строка обычно длиннее)
		// Если CardData не зашифрован, пытаемся зашифровать через RSA
		const rsaPublicKey = process.env.TBANK_RSA_PUBLIC_KEY
		if (rsaPublicKey && !params.cardData.startsWith('-----BEGIN')) {
			try {
				encryptedCardData = await encryptCardData(params.cardData, rsaPublicKey)
				console.log('✅ [TBANK] CardData зашифрован через RSA')
			} catch (encryptError: any) {
				console.error('❌ [TBANK] Ошибка шифрования CardData:', encryptError.message)
				throw new Error(
					`Ошибка шифрования данных карты: ${encryptError.message}\n\n` +
					`Убедитесь, что TBANK_RSA_PUBLIC_KEY настроен правильно в переменных окружения.`
				)
			}
		} else if (!rsaPublicKey) {
			console.warn('⚠️ [TBANK] TBANK_RSA_PUBLIC_KEY не настроен - CardData передается незашифрованным')
			console.warn('⚠️ [TBANK] Т-Банк может отклонить запрос. Получите RSA ключ в поддержке Т-Банка (acq_help@tbank.ru)')
		}
		
		requestBody.CardData = encryptedCardData
		console.log('💳 [TBANK] Используются данные карты:', {
			hasCardData: !!params.cardData,
			isEncrypted: encryptedCardData !== params.cardData,
			note: 'CardData должен быть зашифрован через RSA (X509 RSA 2048) и закодирован в Base64',
		})
	}

	// Финальная выплата
	// ВАЖНО: FinalPayout передается только если явно указано в params.finalPayout
	// НЕ передаем FinalPayout автоматически, чтобы избежать ошибок
	// Согласно документации (стр. 516): FinalPayout Boolean Нет (необязательный параметр)
	// Если передан в значении true - сделка автоматически закроется после выплаты
	// Для частичных выплат FinalPayout НЕ передается
	if (params.finalPayout === true) {
		// Передаем только если явно указано true
		requestBody.FinalPayout = true
		console.log('✅ [TBANK] FinalPayout установлен:', {
			value: requestBody.FinalPayout,
			type: typeof requestBody.FinalPayout,
			note: 'FinalPayout передается только если явно указано в params.finalPayout',
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
	const e2cPassword = process.env.TBANK_E2C_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_PASSWORD не настроен в переменных окружения')
	}

	console.log('🔐 [TBANK] Генерация подписи:', {
		hasE2cPassword: !!e2cPassword,
		e2cPasswordLength: e2cPassword?.length,
		parametersForSignature: Object.keys(requestBody).sort(),
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

	try {
		requestBody.Token = generateToken(requestBody, e2cPassword)
	} catch (error: any) {
		throw new Error(
			`Ошибка генерации токена: ${
				error.message || 'Проверьте настройки TBANK_E2C_PASSWORD'
			}`
		)
	}

	// ВАЖНО: NotificationURL НЕ передается в запросах на выплату
	// Т-Банк отправляет нотификации на URL, указанный в настройках терминала в личном кабинете

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
		
		if (data.Details) {
			// Добавляем детали ошибки к сообщению
			if (data.Details.includes('wrong.payout.amount')) {
				const dealIdInfo = params.dealId ? `\n• DealId: ${params.dealId}` : ''
				errorMessage = `Неверная сумма выплаты (${amountInKopecks / 100} ₽).${dealIdInfo}\n\n` +
					`Возможные причины:\n` +
					`• Сумма превышает доступный баланс сделки\n` +
					`• Недостаточно средств на счете сделки для выплаты\n` +
					`• Сумма слишком мала (минимум для СБП: 10 ₽)\n` +
					`• Баланс сделки был изменен после последней проверки\n\n` +
					`Решение:\n` +
					`• Проверьте доступный баланс сделки в личном кабинете Т-Банка\n` +
					`• Уменьшите сумму выплаты до доступного баланса\n` +
					`• Пополните баланс через Т-Банк для увеличения баланса сделки\n` +
					`• Убедитесь, что все пополнения были зачислены на сделку`
			} else if (data.Details.includes('deal')) {
				errorMessage = `Ошибка связана со сделкой: ${data.Details}\n\n` +
					`DealId: ${params.dealId || 'не указан'}\n` +
					`Проверьте статус сделки в личном кабинете Т-Банка.`
			} else {
				errorMessage = `${errorMessage}\n\nДетали: ${data.Details}`
			}
		}
		
		// Обработка конкретных сообщений об ошибках
		if (data.Message) {
			if (data.Message.includes('СБП недоступен') || data.Message.includes('СБП не доступен') || data.Message.includes('недоступен для магазина')) {
				errorMessage = `❌ Способ выплаты СБП недоступен для вашего терминала.\n\n` +
					`Решение:\n` +
					`• Обратитесь в поддержку Т-Банка (acq_help@tbank.ru)\n` +
					`• Попросите включить выплаты через СБП для терминала E2C (${terminalKey})\n` +
					`• Проверьте настройки терминала в личном кабинете Т-Банка\n` +
					`• Убедитесь, что терминал E2C настроен для выплат через СБП\n\n` +
					`Пока СБП недоступен, используйте вывод на банковскую карту.`
			}
		}
		
		// Обработка ошибок для выплат на карту
		if (data.Details) {
			if (data.Details.includes('CardId') || data.Details.includes('CardData') || data.Details.includes('привязан')) {
				errorMessage = `❌ Ошибка при выплате на карту: ${data.Details}\n\n` +
					`Проблема: Для выплат на карту через CardData требуется шифрование через RSA.\n\n` +
					`Решение:\n` +
					`• Обратитесь в поддержку Т-Банка (acq_help@tbank.ru) для получения RSA ключа\n` +
					`• Получите открытый ключ RSA от Т-Банка для шифрования CardData\n` +
					`• CardData должен быть зашифрован через RSA (X509 RSA 2048) и закодирован в Base64\n` +
					`• Альтернатива: используйте метод AddCard для привязки карты, затем используйте CardId\n\n` +
					`Важно: Без RSA ключа выплаты на карту через CardData невозможны.\n` +
					`Пока используйте вывод через СБП (если доступен) или привяжите карту через AddCard.`
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
	const e2cPassword = process.env.TBANK_E2C_PASSWORD || process.env.TBANK_PASSWORD
	if (!e2cPassword) {
		throw new Error('TBANK_E2C_PASSWORD не настроен в переменных окружения')
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

/**
 * Шифрование CardData через RSA (X509 RSA 2048) и кодирование в Base64
 * @param cardDataPlain - незашифрованные данные карты в формате "PAN=...;ExpDate=...;CardHolder=...;CVV=..."
 * @param publicKeyPem - открытый ключ RSA в формате PEM
 * @returns зашифрованная строка в Base64
 */
async function encryptCardData(
	cardDataPlain: string,
	publicKeyPem: string
): Promise<string> {
	try {
		// Формируем открытый ключ из PEM строки
		const publicKey = crypto.createPublicKey({
			key: publicKeyPem,
			format: 'pem',
			type: 'spki',
		})

		// Шифруем данные через RSA с PKCS1 padding
		const encrypted = crypto.publicEncrypt(
			{
				key: publicKey,
				padding: crypto.constants.RSA_PKCS1_PADDING,
			},
			Buffer.from(cardDataPlain, 'utf8')
		)

		// Кодируем в Base64
		return encrypted.toString('base64')
	} catch (error: any) {
		throw new Error(
			`Ошибка шифрования CardData: ${error.message}\n` +
			`Убедитесь, что TBANK_RSA_PUBLIC_KEY содержит корректный открытый ключ RSA в формате PEM.`
		)
	}
}
