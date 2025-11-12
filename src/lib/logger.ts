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

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
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
			const errorContext = {
				...context,
				...(error instanceof Error
					? {
							error: error.message,
							stack: error.stack,
					  }
					: { error: String(error) }),
			}
			console.error(this.formatMessage('error', message, errorContext))
		}
	}
}

export const logger = new Logger()


