/**
 * Next.js Instrumentation
 * 
 * Этот файл выполняется при старте сервера Next.js.
 * Используется для настройки глобальных обработчиков ошибок.
 */

import { logger } from './src/lib/logger'

/**
 * Глобальный обработчик необработанных Promise rejections
 * 
 * Предотвращает падение backend из-за необработанных ошибок
 */
if (typeof process !== 'undefined') {
	process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
		const error = reason instanceof Error ? reason : new Error(String(reason))
		
		logger.error('[UNHANDLED_PROMISE_REJECTION]', error, {
			promise: promise.toString(),
			reason: reason instanceof Error ? {
				name: reason.name,
				message: reason.message,
				stack: reason.stack,
			} : String(reason),
		})
		
		// НЕ завершаем процесс - backend должен продолжать работать
		// В production это позволит серверу оставаться доступным даже при ошибках
	})

	/**
	 * Глобальный обработчик необработанных исключений
	 * 
	 * Логирует критические ошибки, но не завершает процесс
	 */
	process.on('uncaughtException', (error: Error) => {
		logger.error('[UNCAUGHT_EXCEPTION]', error, {
			name: error.name,
			message: error.message,
			stack: error.stack,
		})
		
		// В production логируем, но не завершаем процесс
		// Это позволяет серверу продолжать отвечать на /health даже при критических ошибках
		if (process.env.NODE_ENV === 'production') {
			// В production не завершаем процесс - пусть работает
			// В development можно завершить для отладки
			return
		}
	})
}

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		// Инициализация выполнена выше через process.on
		logger.info('Global error handlers registered')
	}
}

