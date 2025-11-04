/**
 * Универсальный обработчик ошибок API с retry логикой
 */

export type RetryOptions = {
  maxRetries?: number
  retryDelay?: number
  retryableStatuses?: number[]
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

/**
 * Проверяет, можно ли повторить запрос при данной ошибке
 */
function isRetryableError(error: any, status?: number): boolean {
  if (status && DEFAULT_RETRY_OPTIONS.retryableStatuses.includes(status)) {
    return true
  }

  // Сетевые ошибки
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Таймауты
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return true
  }

  return false
}

/**
 * Выполняет запрос с автоматическими повторными попытками
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  let lastError: any = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 секунд таймаут

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Если ответ успешен, возвращаем его
      if (response.ok) {
        return response
      }

      // Если статус не позволяет повторить попытку, возвращаем ошибку
      if (!isRetryableError(null, response.status)) {
        return response
      }

      // Если это последняя попытка, возвращаем ответ
      if (attempt === config.maxRetries) {
        return response
      }

      // Экспоненциальная задержка перед повторной попыткой
      const delay = config.retryDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error: any) {
      lastError = error

      // Если ошибка не позволяет повторить попытку, выбрасываем её
      if (!isRetryableError(error)) {
        throw error
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === config.maxRetries) {
        throw error
      }

      // Экспоненциальная задержка перед повторной попыткой
      const delay = config.retryDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Unknown error in fetchWithRetry')
}

/**
 * Обрабатывает ошибку и возвращает понятное сообщение для пользователя
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    // Специальные случаи
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Проблемы с сетью. Проверьте подключение к интернету.'
    }

    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return 'Превышено время ожидания. Попробуйте позже.'
    }

    if (error.status === 401) {
      return 'Сессия истекла. Войдите заново.'
    }

    if (error.status === 403) {
      return 'Доступ запрещен.'
    }

    if (error.status === 404) {
      return 'Ресурс не найден.'
    }

    if (error.status === 429) {
      return 'Слишком много запросов. Подождите немного.'
    }

    if (error.status >= 500) {
      return 'Ошибка сервера. Мы уже работаем над исправлением.'
    }

    return error.message
  }

  return 'Произошла неизвестная ошибка. Попробуйте позже.'
}

/**
 * Логирует ошибку (в продакшене отправляет в систему мониторинга)
 */
export async function logError(error: any, context?: string) {
  const { reportError } = await import('@/lib/errorMonitoring')
  
  const errorObj = error instanceof Error 
    ? error 
    : new Error(error?.message || String(error))

  reportError(errorObj, {
    additional: {
      context,
      originalError: error,
    },
  })
}

