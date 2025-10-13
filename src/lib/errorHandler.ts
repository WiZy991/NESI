// Централизованная обработка ошибок

export interface ApiError {
	message: string
	code?: string
	statusCode?: number
	details?: any
}

export class AppError extends Error {
	public statusCode: number
	public code?: string
	public details?: any

	constructor(
		message: string,
		statusCode: number = 500,
		code?: string,
		details?: any
	) {
		super(message)
		this.name = 'AppError'
		this.statusCode = statusCode
		this.code = code
		this.details = details
	}
}

// Логирование ошибок
export function logError(error: Error, context?: string) {
	const timestamp = new Date().toISOString()
	const errorInfo = {
		timestamp,
		message: error.message,
		stack: error.stack,
		context,
		...(error instanceof AppError && {
			statusCode: error.statusCode,
			code: error.code,
			details: error.details,
		}),
	}

	// В продакшене здесь можно добавить отправку в Sentry, LogRocket и т.д.
	if (process.env.NODE_ENV === 'production') {
		console.error('Production Error:', JSON.stringify(errorInfo))
		// TODO: Отправка в внешний сервис логирования
	} else {
		console.error('Development Error:', errorInfo)
	}
}

// Обработка ошибок API
export function handleApiError(error: unknown): {
	message: string
	statusCode: number
} {
	if (error instanceof AppError) {
		logError(error, 'API')
		return {
			message: error.message,
			statusCode: error.statusCode,
		}
	}

	if (error instanceof Error) {
		logError(error, 'API')
		return {
			message: 'Внутренняя ошибка сервера',
			statusCode: 500,
		}
	}

	// Неизвестная ошибка
	const unknownError = new Error('Неизвестная ошибка')
	logError(unknownError, 'API')
	return {
		message: 'Произошла неизвестная ошибка',
		statusCode: 500,
	}
}

// Валидация входных данных
export function validateRequired(value: any, fieldName: string): void {
	if (value === null || value === undefined || value === '') {
		throw new AppError(
			`Поле "${fieldName}" обязательно для заполнения`,
			400,
			'VALIDATION_ERROR'
		)
	}
}

export function validateEmail(email: string): void {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(email)) {
		throw new AppError('Некорректный формат email', 400, 'VALIDATION_ERROR')
	}
}

export function validatePassword(password: string): void {
	if (password.length < 6) {
		throw new AppError(
			'Пароль должен содержать минимум 6 символов',
			400,
			'VALIDATION_ERROR'
		)
	}
}

// Обработка ошибок Prisma
export function handlePrismaError(error: any): AppError {
	if (error.code === 'P2002') {
		return new AppError(
			'Запись с такими данными уже существует',
			409,
			'DUPLICATE_ENTRY'
		)
	}

	if (error.code === 'P2025') {
		return new AppError('Запись не найдена', 404, 'NOT_FOUND')
	}

	if (error.code === 'P2003') {
		return new AppError(
			'Нарушение внешнего ключа',
			400,
			'FOREIGN_KEY_CONSTRAINT'
		)
	}

	// Общая ошибка Prisma
	return new AppError('Ошибка базы данных', 500, 'DATABASE_ERROR', {
		prismaCode: error.code,
		prismaMessage: error.message,
	})
}

// Retry механизм для критичных операций
export async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	let lastError: Error

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation()
		} catch (error) {
			lastError = error as Error

			if (attempt === maxRetries) {
				break
			}

			// Экспоненциальная задержка
			const waitTime = delay * Math.pow(2, attempt - 1)
			await new Promise(resolve => setTimeout(resolve, waitTime))
		}
	}

	throw lastError!
}

// Circuit breaker для внешних сервисов
export class CircuitBreaker {
	private failures = 0
	private lastFailureTime = 0
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

	constructor(
		private threshold: number = 5,
		private timeout: number = 60000, // 1 минута
		private resetTimeout: number = 30000 // 30 секунд
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime > this.resetTimeout) {
				this.state = 'HALF_OPEN'
			} else {
				throw new AppError(
					'Сервис временно недоступен',
					503,
					'SERVICE_UNAVAILABLE'
				)
			}
		}

		try {
			const result = await operation()
			this.onSuccess()
			return result
		} catch (error) {
			this.onFailure()
			throw error
		}
	}

	private onSuccess() {
		this.failures = 0
		this.state = 'CLOSED'
	}

	private onFailure() {
		this.failures++
		this.lastFailureTime = Date.now()

		if (this.failures >= this.threshold) {
			this.state = 'OPEN'
		}
	}
}

