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
					errorCode: data.ErrorCode,
					message: data.Message,
					details: data.Details,
				})
			} else {
				logger.info('TBank API Success', {
					endpoint,
					orderId: params.OrderId,
					paymentId: data.PaymentId,
				})
			}

			return data
		} catch (error) {
			logger.error('TBank API Request Failed', { url, error })
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
	}): Promise<{
		Success: boolean
		PaymentId?: string
		PaymentURL?: string
		Status?: string
		ErrorCode: string
		Message?: string
		Details?: string
		SpAccumulationId?: string
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

		logger.info('TBank E2C API Request', {
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
				logger.error('TBank E2C API Error', {
					url,
					status: response.status,
					errorCode: data.ErrorCode,
					message: data.Message,
					details: data.Details,
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
			logger.error('TBank E2C API Request Failed', { url, error })
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
		const requestParams: Record<string, any> = {
			Amount: rublesToKopecks(params.amount),
			OrderId: orderId,
			DealId: params.dealId,
			PaymentRecipientId: params.paymentRecipientId,
		}

		// Если это финальная выплата
		if (params.isFinal) {
			requestParams.FinalPayout = true
		}

		// Если указан телефон для СБП
		if (params.recipientPhone) {
			requestParams.Phone = params.recipientPhone
			// Здесь можно добавить SbpMemberId если нужно
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
