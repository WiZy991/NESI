/**
 * Улучшенная обработка ошибок с логированием
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Безопасная обработка ошибок API
 */
export function handleApiError(error: unknown): {
  message: string
  statusCode: number
  code?: string
} {
  // Логируем ошибку для мониторинга
  console.error('❌ API Error:', error)

  // Если это наш AppError
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    }
  }

  // Если это ошибка Prisma
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    // Не раскрываем детали Prisma ошибок в продакшене
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'Ошибка базы данных',
        statusCode: 500,
        code: 'DATABASE_ERROR',
      }
    }
    return {
      message: prismaError.message || 'Ошибка базы данных',
      statusCode: 500,
      code: prismaError.code || 'DATABASE_ERROR',
    }
  }

  // Общая ошибка
  if (error instanceof Error) {
    // В продакшене не раскрываем стек и детали
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'Произошла ошибка. Попробуйте позже.',
        statusCode: 500,
      }
    }
    return {
      message: error.message || 'Неизвестная ошибка',
      statusCode: 500,
    }
  }

  return {
    message: 'Произошла неизвестная ошибка',
    statusCode: 500,
  }
}

/**
 * Создать безопасный ответ с ошибкой
 */
export function createErrorResponse(error: unknown, defaultMessage: string = 'Ошибка сервера') {
  const handled = handleApiError(error)
  return {
    error: handled.message,
    code: handled.code,
    ...(process.env.NODE_ENV === 'development' && error instanceof Error
      ? { stack: error.stack }
      : {}),
  }
}
