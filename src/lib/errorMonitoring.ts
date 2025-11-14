/**
 * Система мониторинга ошибок
 * В продакшене можно интегрировать Sentry или другой сервис
 */

import { clientLogger } from './clientLogger'

export interface ErrorContext {
  userId?: string
  url?: string
  userAgent?: string
  timestamp?: string
  additional?: Record<string, any>
}

/**
 * Отправляет ошибку на сервер для логирования
 */
export async function reportError(
  error: Error | string,
  context?: ErrorContext
): Promise<void> {
  try {
    const errorData = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      ...context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    }

    // Отправляем на сервер только в продакшене
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      window.location.hostname !== 'localhost'
    ) {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
        keepalive: true, // Отправка даже если страница закрывается
      }).catch(() => {
        // Игнорируем ошибки при отправке ошибок
      })
    } else {
      // В разработке просто логируем
      clientLogger.error('Error reported', error instanceof Error ? error : new Error(String(error)), errorData)
    }
  } catch (err) {
    // Игнорируем ошибки при логировании
    clientLogger.error('Failed to report error', err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Отслеживает Web Vitals метрики
 */
export function trackWebVitals(metric: any) {
  // В продакшене можно отправлять в Google Analytics или другой сервис
  if (process.env.NODE_ENV === 'production') {
    // Пример отправки в аналитику
    // gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   metric_id: metric.id,
    //   metric_value: metric.value,
    //   metric_delta: metric.delta,
    // })
    
    clientLogger.debug('Web Vital metric', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
    })
  }
}

/**
 * Инициализирует мониторинг ошибок
 */
export function initErrorMonitoring() {
  if (typeof window === 'undefined') return

  // Глобальный обработчик необработанных ошибок
  window.addEventListener('error', (event) => {
    reportError(
      new Error(event.message),
      {
        url: event.filename,
        additional: {
          lineno: event.lineno,
          colno: event.colno,
        },
      }
    )
  })

  // Глобальный обработчик промисов с ошибками
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      {
        additional: {
          type: 'unhandledrejection',
        },
      }
    )
  })
}

