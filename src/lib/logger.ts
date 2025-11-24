// Система логирования для замены console.log
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
	[key: string]: any
}

class Logger {
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

	private formatMessage(
		level: LogLevel,
		message: string,
		context?: LogContext
	): string {
		const timestamp = new Date().toISOString()
		const contextStr = context ? ` ${JSON.stringify(context)}` : ''
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
			// Если второй параметр - это объект контекста (не Error), то это context
			// Если второй параметр - Error, то это error, а третий - context
			let errorObj: Error | unknown | undefined
			let contextObj: LogContext | undefined

			if (error instanceof Error) {
				// Второй параметр - это Error
				errorObj = error
				contextObj = context
			} else if (error && typeof error === 'object') {
				// Второй параметр - это context (объект, но не Error)
				contextObj = error as LogContext
				errorObj = undefined
			} else {
				// Второй параметр - это что-то другое или undefined
				errorObj = error
				contextObj = context
			}

			const errorContext: LogContext = {
				...(contextObj || {}),
				...(errorObj instanceof Error
					? {
							error: errorObj.message,
							stack: errorObj.stack,
							errorName: errorObj.name,
					  }
					: errorObj !== undefined
					? {
							error:
								typeof errorObj === 'object' && errorObj !== null
									? JSON.stringify(
											errorObj,
											Object.getOwnPropertyNames(errorObj)
									  )
									: String(errorObj),
					  }
					: {}),
			}
			console.error(this.formatMessage('error', message, errorContext))
		}
	}
}

export const logger = new Logger()
<<<<<<< HEAD




=======
>>>>>>> 8500b26eb6ac8f59cfd0fcfdccb818e3b53a8d8e
