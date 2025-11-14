/**
 * Универсальный обработчик ошибок для API routes
 * Предоставляет понятные сообщения об ошибках пользователям
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

export interface ApiErrorContext {
	userId?: string
	endpoint?: string
	[key: string]: any
}

/**
 * Обработка ошибок Prisma
 */
function handlePrismaError(error: any): { message: string; statusCode: number } {
	const code = error.code

	switch (code) {
		case 'P2002':
			return {
				message: 'Запись с такими данными уже существует',
				statusCode: 409,
			}
		case 'P2025':
			return {
				message: 'Запись не найдена',
				statusCode: 404,
			}
		case 'P2003':
			return {
				message: 'Связанная запись не найдена',
				statusCode: 400,
			}
		case 'P2014':
			return {
				message: 'Нарушение ограничений данных',
				statusCode: 400,
			}
		default:
			return {
				message: 'Ошибка базы данных',
				statusCode: 500,
			}
	}
}

/**
 * Обработка ошибок валидации
 */
function handleValidationError(error: any): { message: string; statusCode: number } {
	if (error.message) {
		return {
			message: error.message,
			statusCode: 400,
		}
	}
	return {
		message: 'Ошибка валидации данных',
		statusCode: 400,
	}
}

/**
 * Универсальный обработчик ошибок для API
 */
export function handleApiError(
	error: unknown,
	context?: ApiErrorContext
): NextResponse {
	// Логируем ошибку
	logger.error('API Error', error, context)

	// Обработка известных типов ошибок
	if (error && typeof error === 'object' && 'code' in error) {
		// Prisma ошибки
		if (typeof error.code === 'string' && error.code.startsWith('P')) {
			const { message, statusCode } = handlePrismaError(error)
			return NextResponse.json({ error: message }, { status: statusCode })
		}
	}

	// Ошибки валидации
	if (error instanceof Error && error.name === 'ValidationError') {
		const { message, statusCode } = handleValidationError(error)
		return NextResponse.json({ error: message }, { status: statusCode })
	}

	// Ошибки авторизации
	if (error instanceof Error && error.message.includes('Не авторизован')) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	// Ошибки доступа
	if (error instanceof Error && error.message.includes('Нет прав')) {
		return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
	}

	// В продакшене не раскрываем детали ошибок
	const isProduction = process.env.NODE_ENV === 'production'
	const message = isProduction
		? 'Произошла ошибка. Попробуйте позже или обратитесь в поддержку.'
		: error instanceof Error
		? error.message
		: 'Неизвестная ошибка'

	return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Обертка для API handlers с автоматической обработкой ошибок
 */
export function withErrorHandler<T extends any[]>(
	handler: (...args: T) => Promise<NextResponse>,
	context?: ApiErrorContext
) {
	return async (...args: T): Promise<NextResponse> => {
		try {
			return await handler(...args)
		} catch (error) {
			return handleApiError(error, context)
		}
	}
}

