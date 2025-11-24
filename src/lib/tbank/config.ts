/**
 * Конфигурация для интеграции с Т-Банком Мультирасчеты
 */

export const TBANK_CONFIG = {
	// URL для продакшена
	PROD_URL: 'https://securepay.tinkoff.ru',
	// URL для тестирования
	TEST_URL: 'https://rest-api-test.tinkoff.ru',

	// Получаем из переменных окружения
	TERMINAL_KEY: process.env.TBANK_TERMINAL_KEY || '',
	TERMINAL_PASSWORD: process.env.TBANK_TERMINAL_PASSWORD || '',

	// E2C терминал для выплат
	E2C_TERMINAL_KEY: process.env.TBANK_E2C_TERMINAL_KEY || '',
	E2C_TERMINAL_PASSWORD: process.env.TBANK_E2C_TERMINAL_PASSWORD || '',

	// Режим (test или prod)
	IS_PRODUCTION: process.env.TBANK_MODE === 'production',

	// Базовый URL сайта для редиректов
	BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',

	// Максимальный срок жизни сделки (в днях)
	DEAL_MAX_LIFETIME_DAYS: 60,
}

/**
 * Получает базовый URL для запросов
 */
export function getTBankBaseUrl(): string {
	return TBANK_CONFIG.IS_PRODUCTION
		? TBANK_CONFIG.PROD_URL
		: TBANK_CONFIG.TEST_URL
}

/**
 * Проверяет, что все необходимые переменные окружения заданы
 */
export function validateTBankConfig(): {
	valid: boolean
	missing: string[]
} {
	const missing: string[] = []

	if (!TBANK_CONFIG.TERMINAL_KEY) {
		missing.push('TBANK_TERMINAL_KEY')
	}
	if (!TBANK_CONFIG.TERMINAL_PASSWORD) {
		missing.push('TBANK_TERMINAL_PASSWORD')
	}
	if (!TBANK_CONFIG.E2C_TERMINAL_KEY) {
		missing.push('TBANK_E2C_TERMINAL_KEY')
	}
	if (!TBANK_CONFIG.E2C_TERMINAL_PASSWORD) {
		missing.push('TBANK_E2C_TERMINAL_PASSWORD')
	}

	return {
		valid: missing.length === 0,
		missing,
	}
}
