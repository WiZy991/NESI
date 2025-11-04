import { useState, useCallback } from 'react'

type RetryOptions = {
  maxRetries?: number
  delay?: number
  onRetry?: (attempt: number) => void
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
) {
  const { maxRetries = 3, delay = 1000, onRetry } = options
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const executeWithRetry = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn(...args)
          setRetryCount(0)
          setIsRetrying(false)
          return result
        } catch (error) {
          lastError = error as Error

          if (attempt < maxRetries) {
            setRetryCount(attempt + 1)
            setIsRetrying(true)
            onRetry?.(attempt + 1)

            // Экспоненциальная задержка
            const waitTime = delay * Math.pow(2, attempt)
            await new Promise((resolve) => setTimeout(resolve, waitTime))
          } else {
            setRetryCount(0)
            setIsRetrying(false)
            throw lastError
          }
        }
      }

      throw lastError || new Error('Unknown error')
    },
    [fn, maxRetries, delay, onRetry]
  )

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
  }
}

