/**
 * Утилита для повторных попыток выполнения запросов при ошибках
 */

export interface RetryOptions {
	maxRetries?: number
	retryDelay?: number
	backoffMultiplier?: number
	shouldRetry?: (error: unknown, attempt: number) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	retryDelay: 1000,
	backoffMultiplier: 2,
	shouldRetry: (error: unknown) => {
		// По умолчанию повторяем только при сетевых ошибках или 5xx ошибках
		if (error instanceof Error) {
			return error.message.includes('fetch') || error.message.includes('network')
		}
		return false
	},
}

/**
 * Выполняет функцию с повторными попытками при ошибках
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options }
	let lastError: unknown

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error

			// Проверяем, нужно ли повторять попытку
			if (attempt < opts.maxRetries && opts.shouldRetry(error, attempt)) {
				const delay = opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt)
				await new Promise(resolve => setTimeout(resolve, delay))
				continue
			}

			// Если не нужно повторять, выбрасываем ошибку
			throw error
		}
	}

	throw lastError
}

/**
 * Выполняет fetch запрос с повторными попытками
 */
export async function fetchWithRetry(
	input: RequestInfo | URL,
	init?: RequestInit,
	options: RetryOptions = {}
): Promise<Response> {
	return withRetry(
		async () => {
			const response = await fetch(input, init)

			// Если это 5xx ошибка, выбрасываем ошибку для повторной попытки
			if (response.status >= 500 && response.status < 600) {
				throw new Error(`Server error: ${response.status}`)
			}

			return response
		},
		{
			...options,
			shouldRetry: (error, attempt) => {
				// Повторяем при сетевых ошибках или 5xx ошибках
				if (error instanceof Error) {
					return (
						error.message.includes('fetch') ||
						error.message.includes('network') ||
						error.message.includes('Server error')
					)
				}
				return false
			},
		}
	)
}

/**
 * Выполняет JSON запрос с повторными попытками
 */
export async function fetchJsonWithRetry<T>(
	input: RequestInfo | URL,
	init?: RequestInit,
	options: RetryOptions = {}
): Promise<T> {
	const response = await fetchWithRetry(input, init, options)

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`)
	}

	return response.json()
}

