/**
 * Клиентский logger для замены console.log в компонентах
 * В продакшене логирует только ошибки и предупреждения
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
	[key: string]: any
}

class ClientLogger {
	private isDevelopment = process.env.NODE_ENV === 'development'
	private isProduction = process.env.NODE_ENV === 'production'

	private shouldLog(level: LogLevel): boolean {
		// В продакшене логируем только warn и error
		if (this.isProduction) {
			return level === 'warn' || level === 'error'
		}
		// В разработке логируем всё
		return true
	}

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString()
		let contextStr = ''
		
		if (context && Object.keys(context).length > 0) {
			try {
				// Безопасная сериализация с обработкой циклических ссылок и больших объектов
				const safeContext: LogContext = {}
				for (const [key, value] of Object.entries(context)) {
					if (value !== undefined && value !== null) {
						if (typeof value === 'string') {
							// Ограничиваем длину строковых значений (особенно для stack)
							const maxLength = key === 'stack' ? 1000 : 500
							safeContext[key] = value.length > maxLength 
								? value.substring(0, maxLength) + '...' 
								: value
						} else if (typeof value === 'object') {
							// Для объектов пытаемся сериализовать, но ограничиваем глубину
							try {
								const serialized = JSON.stringify(value)
								if (serialized.length > 1000) {
									safeContext[key] = serialized.substring(0, 1000) + '...'
								} else {
									safeContext[key] = value
								}
							} catch {
								safeContext[key] = '[object - serialization failed]'
							}
						} else {
							safeContext[key] = value
						}
					}
				}
				// Используем replacer для безопасной сериализации
				contextStr = ` ${JSON.stringify(safeContext, (key, value) => {
					if (typeof value === 'string' && value.length > 2000) {
						return value.substring(0, 2000) + '... [truncated]'
					}
					return value
				}, 0)}`
			} catch (e) {
				// Если не удалось сериализовать, просто пропускаем контекст
				contextStr = ' [context serialization failed]'
			}
		}
		
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
	}

	debug(message: string, context?: LogContext) {
		if (this.shouldLog('debug')) {
			console.debug(this.formatMessage('debug', message, context))
		}
	}

	info(message: string, context?: LogContext) {
		if (this.shouldLog('info')) {
			console.info(this.formatMessage('info', message, context))
		}
	}

	warn(message: string, context?: LogContext) {
		if (this.shouldLog('warn')) {
			console.warn(this.formatMessage('warn', message, context))
		}
	}

	error(message: string, error?: Error | unknown, context?: LogContext) {
		if (this.shouldLog('error')) {
			try {
				const errorContext: LogContext = {
					...(context || {}),
				}
				
				if (error instanceof Error) {
					errorContext.error = error.message
					// Stack trace выводим отдельно, не включаем в JSON для избежания проблем с сериализацией
					if (error.stack) {
						const stackLines = error.stack.split('\n')
						// Берем только первые 5 строк stack trace для краткости
						const shortStack = stackLines.slice(0, 5).join('\n')
						errorContext.stackPreview = shortStack.length > 500 
							? shortStack.substring(0, 500) + '...' 
							: shortStack
					}
				} else if (error !== undefined && error !== null) {
					const errorStr = String(error)
					errorContext.error = errorStr.length > 500 ? errorStr.substring(0, 500) + '...' : errorStr
				}
				
				const formattedMessage = this.formatMessage('error', message, errorContext)
				console.error(formattedMessage)
				
				// Если есть полный stack trace, выводим его отдельно для удобства отладки
				if (error instanceof Error && error.stack && this.isDevelopment) {
					console.error('Stack trace:', error.stack)
				}
			} catch (formatError) {
				// Fallback если форматирование не удалось - выводим простым способом
				const errorMsg = error instanceof Error ? error.message : String(error || 'Unknown error')
				console.error(`[ERROR] ${message}`, errorMsg)
				if (context) {
					console.error('Context:', context)
				}
			}
		}
	}
}

export const clientLogger = new ClientLogger()

