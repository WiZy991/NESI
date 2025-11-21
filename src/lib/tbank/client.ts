import { logger } from '@/lib/logger'
import { getTBankBaseUrl, TBANK_CONFIG } from './config'
import { generateOrderId, generateTBankToken, rublesToKopecks } from './crypto'

/**
 * Базовый класс для работы с API Т-Банка Мультирасчеты
 */
export class TBankClient {
	private baseUrl: string
	private terminalKey: string
	private password: string

	constructor(terminalKey?: string, password?: string) {
		this.baseUrl = getTBankBaseUrl()
		this.terminalKey = terminalKey || TBANK_CONFIG.TERMINAL_KEY
		this.password = password || TBANK_CONFIG.TERMINAL_PASSWORD
	}

	/**
	 * Выполняет запрос к API Т-Банка
	 */
	private async makeRequest<T = any>(
		endpoint: string,
		params: Record<string, any>
	): Promise<T> {
		// Добавляем TerminalKey если его нет
		if (!params.TerminalKey) {
			params.TerminalKey = this.terminalKey
		}

		// Генерируем Token
		const token = generateTBankToken(params, this.password)
		params.Token = token

		const url = `${this.baseUrl}${endpoint}`

		logger.info('TBank API Request', {
			url,
			endpoint,
			orderId: params.OrderId,
		})

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			})

			const data = await response.json()

			if (!response.ok || !data.Success) {
				logger.error('TBank API Error', {
					url,
					status: response.status,
					statusText: response.statusText,
					errorCode: data.ErrorCode,
					message: data.Message,
					details: data.Details,
					responseData: JSON.stringify(data),
					requestParams: JSON.stringify(params),
				})
			} else {
				logger.info('TBank API Success', {
					endpoint,
					orderId: params.OrderId,
					paymentId: data.PaymentId,
					status: data.Status,
				})
			}

			return data
		} catch (error: any) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			const errorStack = error instanceof Error ? error.stack : undefined
			const errorString = JSON.stringify(
				error,
				Object.getOwnPropertyNames(error)
			)

			logger.error('TBank API Request Failed', {
				url,
				endpoint,
				error: errorMessage,
				errorStack,
				errorString,
				errorType: error?.constructor?.name,
				requestParams: JSON.stringify(params),
			})
			throw error
		}
	}

	/**
	 * Создает новую сделку (Deal)
	 */
	async createDeal(): Promise<{
		Success: boolean
		SpAccumulationId?: string
		ErrorCode: string
		Message?: string
	}> {
		return this.makeRequest('/v2/createSpDeal', {
			SpDealType: 'NN',
		})
	}

	/**
	 * Закрывает сделку
	 */
	async closeDeal(spAccumulationId: string): Promise<{
		Success: boolean
		ErrorCode: string
		Message?: string
	}> {
		return this.makeRequest('/v2/closeSpDeal', {
			SpAccumulationId: spAccumulationId,
		})
	}

	/**
	 * Инициирует платеж (пополнение) в рамках сделки
	 */
	async initPayment(params: {
		amount: number // в рублях
		orderId?: string
		dealId?: string
		paymentRecipientId: string // номер телефона получателя
		description?: string
		createDeal?: boolean
		successURL?: string // URL для возврата после успешной оплаты
		failURL?: string // URL для возврата после неудачной оплаты
	}): Promise<{
		Success: boolean
		PaymentId?: string
		PaymentURL?: string
		Status?: string
		ErrorCode: string
		Message?: string
		Details?: string
		SpAccumulationId?: string
		OrderId?: string // OrderId возвращается в ответе
	}> {
		const orderId = params.orderId || generateOrderId('PAY')
		const requestParams: Record<string, any> = {
			Amount: rublesToKopecks(params.amount),
			OrderId: orderId,
			Description:
				params.description || 'Пополнение баланса через Мультирасчеты',
			PaymentRecipientId: params.paymentRecipientId,
		}

		// Если нужно создать сделку
		if (params.createDeal) {
			requestParams.CreateDealWithType = 'NN'
		} else if (params.dealId) {
			requestParams.DealId = params.dealId
		}

		// Добавляем URL для возврата после оплаты
		if (params.successURL) {
			requestParams.SuccessURL = params.successURL
		}
		if (params.failURL) {
			requestParams.FailURL = params.failURL
		}

		// Уровень проверки (может потребоваться отдел рисков)
		// requestParams.LevelOfConfidence = 'moderate'

		return this.makeRequest('/v2/Init', requestParams)
	}

	/**
	 * Подтверждает платеж (списание с карты покупателя)
	 */
	async confirmPayment(paymentId: string): Promise<{
		Success: boolean
		Status?: string
		ErrorCode: string
		Message?: string
	}> {
		return this.makeRequest('/v2/Confirm', {
			PaymentId: paymentId,
		})
	}

	/**
	 * Отменяет платеж
	 */
	async cancelPayment(
		paymentId: string,
		amount?: number
	): Promise<{
		Success: boolean
		Status?: string
		ErrorCode: string
		Message?: string
	}> {
		const params: Record<string, any> = {
			PaymentId: paymentId,
		}

		if (amount) {
			params.Amount = rublesToKopecks(amount)
		}

		return this.makeRequest('/v2/Cancel', params)
	}

	/**
	 * Получает статус платежа
	 */
	async getPaymentState(paymentId: string): Promise<{
		Success: boolean
		Status?: string
		ErrorCode: string
		Message?: string
		Amount?: number
	}> {
		return this.makeRequest('/v2/GetState', {
			PaymentId: paymentId,
		})
	}
}

/**
 * Клиент для выплат (E2C)
 */
export class TBankPayoutClient {
	private baseUrl: string
	private terminalKey: string
	private password: string

	constructor(terminalKey?: string, password?: string) {
		this.baseUrl = getTBankBaseUrl()
		this.terminalKey = terminalKey || TBANK_CONFIG.E2C_TERMINAL_KEY
		this.password = password || TBANK_CONFIG.E2C_TERMINAL_PASSWORD
	}

	/**
	 * Выполняет запрос к E2C API Т-Банка
	 */
	private async makeRequest<T = any>(
		endpoint: string,
		params: Record<string, any>
	): Promise<T> {
		// Добавляем TerminalKey
		if (!params.TerminalKey) {
			params.TerminalKey = this.terminalKey
		}

		// Генерируем Token
		const token = generateTBankToken(params, this.password)
		params.Token = token

		const url = `${this.baseUrl}${endpoint}`

		// Логируем запрос (без пароля и токена)
		const logParams = { ...params }
		delete logParams.Token
		delete logParams.Password

		logger.info('TBank E2C API Request', {
			url,
			endpoint,
			params: JSON.stringify(logParams),
		})

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			})

			// Получаем текст ответа для обработки ошибок парсинга JSON
			const responseText = await response.text()
			let data: any

			try {
				data = JSON.parse(responseText)
			} catch (parseError) {
				logger.error(
					'TBank E2C API Response Parse Error',
					parseError instanceof Error ? parseError : undefined,
					{
						url,
						endpoint,
						status: response.status,
						statusText: response.statusText,
						responseText: responseText.substring(0, 500), // Первые 500 символов
					}
				)
				throw new Error(
					`Failed to parse API response: ${response.status} ${
						response.statusText
					}. Response: ${responseText.substring(0, 200)}`
				)
			}

			if (!response.ok || !data.Success) {
				logger.error('TBank E2C API Error', undefined, {
					url,
					status: response.status,
					errorCode: data.ErrorCode,
					message: data.Message,
					details: data.Details,
					fullResponse: JSON.stringify(data),
					requestParams: JSON.stringify(logParams),
				})
			} else {
				logger.info('TBank E2C API Success', {
					endpoint,
					orderId: params.OrderId,
					paymentId: data.PaymentId,
				})
			}

			return data
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
				'TBank E2C API Request Failed',
				error instanceof Error ? error : undefined,
				{
					url,
					endpoint,
					error: errorMessage,
					stack: errorStack,
					details: errorDetails,
					requestParams: JSON.stringify(logParams),
				}
			)
			throw error
		}
	}

	/**
	 * Инициирует выплату
	 */
	async initPayout(params: {
		amount: number // в рублях
		orderId?: string
		dealId: string
		paymentRecipientId: string
		recipientPhone?: string
		recipientCardId?: string
		sbpMemberId?: string | number // Идентификатор банка СБП
		isFinal?: boolean
	}): Promise<{
		Success: boolean
		PaymentId?: string
		Status?: string
		ErrorCode: string
		Message?: string
		CardId?: string
	}> {
		const orderId = params.orderId || generateOrderId('PAYOUT')

		// DealId должен быть числом (SpAccumulationId)
		// SpAccumulationId может быть строкой, но API ожидает число
		let dealIdNumber: number
		if (typeof params.dealId === 'string') {
			dealIdNumber = parseInt(params.dealId, 10)
			if (isNaN(dealIdNumber)) {
				logger.error('Invalid DealId format', {
					dealId: params.dealId,
					type: typeof params.dealId,
				})
				throw new Error(`Invalid DealId: ${params.dealId}. Must be a number.`)
			}
		} else if (typeof params.dealId === 'number') {
			dealIdNumber = params.dealId
		} else {
			logger.error('Invalid DealId type', {
				dealId: params.dealId,
				type: typeof params.dealId,
			})
			throw new Error(
				`Invalid DealId type: ${typeof params.dealId}. Expected string or number.`
			)
		}

		const requestParams: Record<string, any> = {
			Amount: rublesToKopecks(params.amount),
			OrderId: orderId,
			DealId: dealIdNumber,
			PaymentRecipientId: params.paymentRecipientId,
		}

		// Если это финальная выплата
		if (params.isFinal) {
			requestParams.FinalPayout = true
		}

		// Если указан телефон для СБП
		// Формат: 11 цифр без + (например: 79001234567)
		if (params.recipientPhone) {
			// Убираем + и оставляем только цифры
			let phone = params.recipientPhone.replace(/[^0-9]/g, '')
			// Если начинается с 8, заменяем на 7
			if (phone.startsWith('8')) {
				phone = '7' + phone.substring(1)
			}
			// Проверяем, что телефон состоит из 11 цифр
			if (phone.length === 11) {
				requestParams.Phone = phone

				// Для СБП выплат обязательно нужен SbpMemberId
				// Если не указан, используем дефолтный (Т-Банк)
				if (params.sbpMemberId) {
					requestParams.SbpMemberId =
						typeof params.sbpMemberId === 'string'
							? parseInt(params.sbpMemberId, 10)
							: params.sbpMemberId
				} else {
					// Дефолтный банк СБП (Т-Банк) - используется для тестирования
					// В продакшене нужно получать через getSbpMembers или позволить пользователю выбрать
					requestParams.SbpMemberId = 100000000004
					logger.warn('Используется дефолтный SbpMemberId для СБП выплаты', {
						phone,
						sbpMemberId: requestParams.SbpMemberId,
					})
				}
			} else {
				logger.warn('Некорректный формат телефона для СБП', {
					original: params.recipientPhone,
					cleaned: phone,
				})
			}
		}

		// Если указана привязанная карта
		if (params.recipientCardId) {
			requestParams.CardId = params.recipientCardId
		}

		return this.makeRequest('/e2c/v2/Init', requestParams)
	}

	/**
	 * Выполняет выплату (после Init)
	 */
	async executePayout(paymentId: string): Promise<{
		Success: boolean
		Status?: string
		ErrorCode: string
		Message?: string
	}> {
		return this.makeRequest('/e2c/v2/Payment', {
			PaymentId: paymentId,
		})
	}

	/**
	 * Получает статус выплаты
	 */
	async getPayoutState(paymentId: string): Promise<{
		Success: boolean
		Status?: string
		ErrorCode: string
		Message?: string
	}> {
		return this.makeRequest('/e2c/v2/GetState', {
			PaymentId: paymentId,
		})
	}

	/**
	 * Получает список банков СБП
	 */
	async getSbpMembers(): Promise<{
		Success: boolean
		ErrorCode: string
		Members?: Array<{
			MemberId: string
			MemberName: string
			MemberNameRus: string
		}>
	}> {
		return this.makeRequest('/a2c/sbp/GetSbpMembers', {})
	}
}
