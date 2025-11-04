'use client'

import { AlertTriangle, RefreshCw, WifiOff, ServerOff, Clock } from 'lucide-react'

type ErrorDisplayProps = {
  error: string
  onRetry?: () => void
  retryCount?: number
  maxRetries?: number
  variant?: 'network' | 'server' | 'timeout' | 'generic'
}

export default function ErrorDisplay({
  error,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  variant = 'generic',
}: ErrorDisplayProps) {
  const isNetworkError = variant === 'network' || error.toLowerCase().includes('сеть')
  const isServerError = variant === 'server' || error.toLowerCase().includes('сервер')
  const isTimeoutError = variant === 'timeout' || error.toLowerCase().includes('время')

  const getIcon = () => {
    if (isNetworkError) return <WifiOff className="w-8 h-8 text-red-400" />
    if (isServerError) return <ServerOff className="w-8 h-8 text-red-400" />
    if (isTimeoutError) return <Clock className="w-8 h-8 text-red-400" />
    return <AlertTriangle className="w-8 h-8 text-red-400" />
  }

  const getTitle = () => {
    if (isNetworkError) return 'Проблемы с сетью'
    if (isServerError) return 'Ошибка сервера'
    if (isTimeoutError) return 'Превышено время ожидания'
    return 'Произошла ошибка'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 rounded-2xl">
      <div className="mb-4">{getIcon()}</div>
      <h3 className="text-xl font-semibold text-red-400 mb-2">{getTitle()}</h3>
      <p className="text-gray-300 text-center mb-6 max-w-md">{error}</p>

      {onRetry && retryCount < maxRetries && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            <RefreshCw className="w-5 h-5" />
            Попробовать снова {retryCount > 0 && `(${retryCount}/${maxRetries})`}
          </button>
          {retryCount > 0 && (
            <p className="text-xs text-gray-400">Автоматическая попытка через несколько секунд...</p>
          )}
        </div>
      )}

      {retryCount >= maxRetries && (
        <p className="text-sm text-gray-500 text-center">
          Все попытки исчерпаны. Пожалуйста, обновите страницу или обратитесь в поддержку.
        </p>
      )}
    </div>
  )
}

