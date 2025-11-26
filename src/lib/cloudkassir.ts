/**
 * Утилита для работы с API CloudKassir (CloudPayments)
 * Документация: https://cloudpayments.ru/docs/api/kassa
 */

const CLOUDKASSIR_API_URL = 'https://api.cloudpayments.ru'

export interface CloudKassirConfig {
	publicId: string
	apiSecret: string
	inn: string
}

export interface ReceiptItem {
	label: string // Наименование товара/услуги (1-124 символа)
	price: string | number // Цена за единицу
	quantity: string | number // Количество
	amount: string | number // Price * Quantity с учетом скидки
	vat: string | number | null // Ставка НДС (0, 5, 7, 10, 20, null)
	method?: number // Способ расчета (1-7, по умолчанию 4 - полный расчет)
	object?: number // Предмет расчета (0-33, по умолчанию 0)
	measurementUnit?: string // Единица измерения
}

export interface CustomerReceipt {
	items: ReceiptItem[]
	taxationSystem: number // Система налогообложения (0-5)
	amounts: {
		electronic?: string | number // Сумма оплаты электронными деньгами
		cash?: string | number // Сумма оплаты наличными
		advancePayment?: string | number // Сумма предоплаты
		credit?: string | number // Сумма постоплатой
		provision?: string | number // Сумма встречным предоставлением
	}
	email?: string // E-mail покупателя
	phone?: string // Телефон покупателя (формат: +79999999999)
	customerInfo?: string // Покупатель (тег ОФД 1227)
	customerInn?: string // ИНН покупателя (тег ОФД 1228)
	cashierName?: string // Имя кассира
	calculationPlace?: string // Место осуществления расчёта
	isInternetPayment?: boolean // Признак интернет оплаты
	russiaTimeZone?: number // Часовая зона места расчета (1-11)
}

export interface CreateReceiptParams {
	inn: string
	type: 'Income' | 'IncomeReturn' | 'Expense' | 'ExpenseReturn'
	customerReceipt: CustomerReceipt
	invoiceId?: string // Номер заказа в вашей системе
	accountId?: string // Идентификатор пользователя в вашей системе
}

export interface CreateReceiptResponse {
	Success: boolean
	Message: string
	Warning?: string | null
	WarningCodes?: number[] | null
	Model?: {
		Id: string
		ErrorCode: number
		ReceiptLocalUrl?: string
	}
}

export interface ReceiptStatusResponse {
	Success: boolean
	Message?: string | null
	Model: 'Processed' | 'Queued' | 'Error' | 'NotFound'
	Warnings?: Array<{
		Code: number
		Description: string
	}>
}

export interface ReceiptDataResponse {
	Success: boolean
	Message?: string | null
	Model?: {
		Email?: string
		Phone?: string | null
		Items: Array<{
			Label: string
			Price: number
			Quantity: number
			Amount: number
			Vat: number
			Method?: number
			Object?: number
		}>
		TaxationSystem: number
		Amounts: {
			Electronic?: number
			Cash?: number
			AdvancePayment?: number
			Credit?: number
			Provision?: number
		}
		AdditionalData?: {
			Id: string
			AccountId?: string
			Amount: number
			DateTime: string
			InvoiceId?: string
			DocumentNumber: string
			FiscalNumber: string
			FiscalSign: string
			QrCodeUrl: string
			OfdReceiptUrl?: string
		}
	}
}

/**
 * Создает HTTP Basic Auth заголовок
 */
function createAuthHeader(publicId: string, apiSecret: string): string {
	const credentials = Buffer.from(`${publicId}:${apiSecret}`).toString('base64')
	return `Basic ${credentials}`
}

/**
 * Формирование кассового чека
 */
export async function createReceipt(
	config: CloudKassirConfig,
	params: CreateReceiptParams
): Promise<CreateReceiptResponse> {
	const url = `${CLOUDKASSIR_API_URL}/kkt/receipt`

	// Формируем тело запроса
	const body = {
		inn: params.inn,
		Type: params.type,
		customerReceipt: {
			items: params.customerReceipt.items.map(item => ({
				label: item.label,
				price: String(item.price),
				quantity: String(item.quantity),
				amount: String(item.amount),
				vat: item.vat === null ? null : String(item.vat),
				method: item.method ?? 4, // По умолчанию полный расчет
				object: item.object ?? 0, // По умолчанию неизвестный предмет оплаты
				...(item.measurementUnit && { measurementUnit: item.measurementUnit }),
			})),
			taxationSystem: String(params.customerReceipt.taxationSystem),
			amounts: {
				...(params.customerReceipt.amounts.electronic && {
					electronic: String(params.customerReceipt.amounts.electronic),
				}),
				...(params.customerReceipt.amounts.cash && {
					cash: String(params.customerReceipt.amounts.cash),
				}),
				...(params.customerReceipt.amounts.advancePayment && {
					advancePayment: String(params.customerReceipt.amounts.advancePayment),
				}),
				...(params.customerReceipt.amounts.credit && {
					credit: String(params.customerReceipt.amounts.credit),
				}),
				...(params.customerReceipt.amounts.provision && {
					provision: String(params.customerReceipt.amounts.provision),
				}),
			},
			...(params.customerReceipt.email && { email: params.customerReceipt.email }),
			...(params.customerReceipt.phone && { phone: params.customerReceipt.phone }),
			...(params.customerReceipt.customerInfo && {
				customerInfo: params.customerReceipt.customerInfo,
			}),
			...(params.customerReceipt.customerInn && {
				customerInn: params.customerReceipt.customerInn,
			}),
			...(params.customerReceipt.cashierName && {
				cashierName: params.customerReceipt.cashierName,
			}),
			...(params.customerReceipt.calculationPlace && {
				calculationPlace: params.customerReceipt.calculationPlace,
			}),
			...(params.customerReceipt.isInternetPayment !== undefined && {
				isInternetPayment: params.customerReceipt.isInternetPayment,
			}),
			...(params.customerReceipt.russiaTimeZone && {
				russiaTimeZone: params.customerReceipt.russiaTimeZone,
			}),
		},
		...(params.invoiceId && { invoiceId: params.invoiceId }),
		...(params.accountId && { accountId: params.accountId }),
	}

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: createAuthHeader(config.publicId, config.apiSecret),
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`CloudKassir API error: ${response.status} ${errorText}`)
	}

	return await response.json()
}

/**
 * Получение статуса чека
 */
export async function getReceiptStatus(
	config: CloudKassirConfig,
	receiptId: string
): Promise<ReceiptStatusResponse> {
	const url = `${CLOUDKASSIR_API_URL}/kkt/receipt/status/get`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: createAuthHeader(config.publicId, config.apiSecret),
		},
		body: JSON.stringify({ Id: receiptId }),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`CloudKassir API error: ${response.status} ${errorText}`)
	}

	return await response.json()
}

/**
 * Получение данных чека
 */
export async function getReceiptData(
	config: CloudKassirConfig,
	receiptId: string
): Promise<ReceiptDataResponse> {
	const url = `${CLOUDKASSIR_API_URL}/kkt/receipt/get`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: createAuthHeader(config.publicId, config.apiSecret),
		},
		body: JSON.stringify({ Id: receiptId }),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`CloudKassir API error: ${response.status} ${errorText}`)
	}

	return await response.json()
}

/**
 * Проверка HMAC подписи уведомления
 */
export function verifyReceiptWebhook(
	apiSecret: string,
	body: string,
	receivedHmac: string
): boolean {
	// Используем динамический импорт для Node.js crypto
	const crypto = require('crypto')
	const calculatedHmac = crypto
		.createHmac('sha256', apiSecret)
		.update(body)
		.digest('base64')

	return calculatedHmac === receivedHmac
}

/**
 * Получение конфигурации из переменных окружения
 */
export function getCloudKassirConfig(): CloudKassirConfig {
	const publicId = process.env.CLOUDKASSIR_PUBLIC_ID
	const apiSecret = process.env.CLOUDKASSIR_API_SECRET
	const inn = process.env.CLOUDKASSIR_INN

	if (!publicId || !apiSecret || !inn) {
		throw new Error(
			'CloudKassir credentials not configured. Set CLOUDKASSIR_PUBLIC_ID, CLOUDKASSIR_API_SECRET, and CLOUDKASSIR_INN in .env'
		)
	}

	return {
		publicId,
		apiSecret,
		inn,
	}
}

