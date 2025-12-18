import crypto from 'crypto'

/**
 * Генерирует Token для подписи запросов к Т-Банку
 * Алгоритм согласно документации Мультирасчетов
 */
export function generateTBankToken(
	params: Record<string, any>,
	password: string
): string {
	// 1. Убираем Token из параметров если он есть
	const cleanParams = { ...params }
	delete cleanParams.Token
	delete cleanParams.token

	// 2. Добавляем Password
	const paramsWithPassword = {
		...cleanParams,
		Password: password,
	}

	// 3. Сортируем по ключам
	const sortedKeys = Object.keys(paramsWithPassword).sort()

	// 4. Конкатенируем значения
	// Согласно документации Т-Банка:
	// - Объекты (DATA) не включаются в подпись
	// - null и undefined не включаются
	// - Пустые строки не включаются
	const concatenated = sortedKeys
		.map(key => {
			const value = paramsWithPassword[key]

			// Пропускаем null и undefined
			if (value === null || value === undefined) {
				return ''
			}

			// Преобразуем boolean в строку
			if (typeof value === 'boolean') {
				return value.toString()
			}

			// Для объектов не включаем в подпись (согласно документации)
			if (typeof value === 'object' && value !== null) {
				return ''
			}

			// Преобразуем в строку
			const stringValue = String(value)

			// Пропускаем пустые строки
			if (stringValue === '') {
				return ''
			}

			return stringValue
		})
		.filter(v => v !== '')
		.join('')

	// Диагностика для AddCard (чтобы увидеть, что конкатенируется)
	if (paramsWithPassword.CustomerKey && paramsWithPassword.CheckType) {
		console.log('🔐 [GENERATE-TOKEN] Детали генерации токена для AddCard:', {
			sortedKeys,
			values: sortedKeys.map(key => ({
				key,
				value: paramsWithPassword[key],
				stringValue: String(paramsWithPassword[key] || ''),
			})),
			concatenatedLength: concatenated.length,
			concatenatedPreview: concatenated.substring(0, 100) + '...',
			fullConcatenated: concatenated,
			hasPassword: !!password,
			passwordLength: password?.length,
		})
	}

	// 5. Вычисляем SHA-256
	const token = crypto.createHash('sha256').update(concatenated).digest('hex')

	return token
}

/**
 * Проверяет подпись входящего запроса (например, webhook)
 */
export function verifyTBankToken(
	params: Record<string, any>,
	expectedToken: string,
	password: string
): boolean {
	const actualToken = generateTBankToken(params, password)
	return actualToken === expectedToken
}

/**
 * Генерирует уникальный OrderId
 */
export function generateOrderId(prefix: string = 'ORDER'): string {
	const timestamp = Date.now()
	const random = Math.floor(Math.random() * 10000)
	return `${prefix}_${timestamp}_${random}`
}

/**
 * Конвертирует рубли в копейки для API Т-Банка
 */
export function rublesToKopecks(rubles: number): number {
	return Math.round(rubles * 100)
}

/**
 * Конвертирует копейки в рубли
 */
export function kopecksToRubles(kopecks: number): number {
	return kopecks / 100
}
