/**
 * Единый HTTP-клиент для всех внешних запросов
 * 
 * Обеспечивает:
 * - Таймауты для всех запросов (5 секунд)
 * - Логирование долгих операций (> 3 секунд)
 * - Безопасную обработку ошибок
 */

import { logger } from './logger'

const HTTP_TIMEOUT = 5000 // 5 секунд
const SLOW_REQUEST_THRESHOLD = 3000 // 3 секунды

/**
 * Выполняет HTTP-запрос с таймаутом и логированием
 */
async function fetchWithTimeout(
	url: string | URL | Request,
	init?: RequestInit,
	timeout: number = HTTP_TIMEOUT
): Promise<Response> {
	const start = Date.now()
	const controller = new AbortController()
	
	// Создаем таймер для прерывания запроса
	const timeoutId = setTimeout(() => {
		controller.abort()
	}, timeout)
	
	// Добавляем signal к существующим опциям
	let fetchOptions: RequestInit
	if (init?.signal) {
		// Если уже есть signal, объединяем их
		const combinedController = new AbortController()
		const originalSignal = init.signal
		
		// Отслеживаем оба сигнала
		originalSignal.addEventListener('abort', () => {
			combinedController.abort()
		})
		controller.signal.addEventListener('abort', () => {
			combinedController.abort()
		})
		
		fetchOptions = {
			...init,
			signal: combinedController.signal,
		}
	} else {
		fetchOptions = {
			...init,
			signal: controller.signal,
		}
	}

	try {
		const response = await fetch(url, fetchOptions)
		const duration = Date.now() - start

		// Логируем долгие запросы
		if (duration > SLOW_REQUEST_THRESHOLD) {
			logger.warn('[SLOW_REQUEST]', {
				url: typeof url === 'string' ? url : url.toString(),
				duration,
				status: response.status,
				method: init?.method || 'GET',
			})
		}

		return response
	} catch (error) {
		const duration = Date.now() - start

		// Обрабатываем ошибки таймаута
		if (error instanceof Error && error.name === 'AbortError') {
			logger.error('[HTTP_TIMEOUT]', error, {
				url: typeof url === 'string' ? url : url.toString(),
				duration,
				timeout,
				method: init?.method || 'GET',
			})
			throw new Error(`Request timeout after ${timeout}ms: ${typeof url === 'string' ? url : url.toString()}`)
		}

		// Логируем другие ошибки
		logger.error('[HTTP_REQUEST_ERROR]', error instanceof Error ? error : undefined, {
			url: typeof url === 'string' ? url : url.toString(),
			duration,
			method: init?.method || 'GET',
		})

		throw error
	} finally {
		// Очищаем таймер
		clearTimeout(timeoutId)
	}
}

/**
 * HTTP-клиент с таймаутом и логированием
 * 
 * Использование:
 * ```typescript
 * import { httpClient } from '@/lib/httpClient'
 * 
 * const response = await httpClient.get('https://api.example.com/data')
 * const data = await response.json()
 * ```
 */
export const httpClient = {
	/**
	 * GET запрос
	 */
	async get(url: string | URL | Request, init?: RequestInit): Promise<Response> {
		return fetchWithTimeout(url, { ...init, method: 'GET' })
	},

	/**
	 * POST запрос
	 */
	async post(url: string | URL | Request, body?: any, init?: RequestInit): Promise<Response> {
		const headers = new Headers(init?.headers)
		if (body && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json')
		}

		return fetchWithTimeout(url, {
			...init,
			method: 'POST',
			headers,
			body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
		})
	},

	/**
	 * PUT запрос
	 */
	async put(url: string | URL | Request, body?: any, init?: RequestInit): Promise<Response> {
		const headers = new Headers(init?.headers)
		if (body && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json')
		}

		return fetchWithTimeout(url, {
			...init,
			method: 'PUT',
			headers,
			body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
		})
	},

	/**
	 * DELETE запрос
	 */
	async delete(url: string | URL | Request, init?: RequestInit): Promise<Response> {
		return fetchWithTimeout(url, { ...init, method: 'DELETE' })
	},

	/**
	 * PATCH запрос
	 */
	async patch(url: string | URL | Request, body?: any, init?: RequestInit): Promise<Response> {
		const headers = new Headers(init?.headers)
		if (body && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json')
		}

		return fetchWithTimeout(url, {
			...init,
			method: 'PATCH',
			headers,
			body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
		})
	},

	/**
	 * Прямой вызов fetch с таймаутом (для совместимости)
	 */
	async fetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
		return fetchWithTimeout(url, init)
	},
}

