// Простой in-memory rate limiter для защиты от злоупотреблений
// В продакшене лучше использовать Redis

interface RateLimitEntry {
	count: number
	resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
	windowMs: number // Время окна в миллисекундах
	maxRequests: number // Максимальное количество запросов
	keyGenerator?: (req: Request) => string // Функция для генерации ключа
}

const defaultKeyGenerator = (req: Request): string => {
	// Используем IP адрес как ключ по умолчанию
	const forwarded = req.headers.get('x-forwarded-for')
	const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
	return ip
}

export function rateLimit(config: RateLimitConfig) {
	const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = config

	return async (
		req: Request
	): Promise<{ success: boolean; remaining: number; resetTime: number }> => {
		const key = keyGenerator(req)
		const now = Date.now()
		const resetTime = now + windowMs

		// Очищаем устаревшие записи
		for (const [k, v] of rateLimitStore.entries()) {
			if (v.resetTime < now) {
				rateLimitStore.delete(k)
			}
		}

		const entry = rateLimitStore.get(key)

		if (!entry) {
			// Первый запрос
			rateLimitStore.set(key, { count: 1, resetTime })
			return { success: true, remaining: maxRequests - 1, resetTime }
		}

		if (entry.resetTime < now) {
			// Окно истекло, сбрасываем счетчик
			rateLimitStore.set(key, { count: 1, resetTime })
			return { success: true, remaining: maxRequests - 1, resetTime }
		}

		if (entry.count >= maxRequests) {
			// Лимит превышен
			return { success: false, remaining: 0, resetTime: entry.resetTime }
		}

		// Увеличиваем счетчик
		entry.count++
		rateLimitStore.set(key, entry)

		return {
			success: true,
			remaining: maxRequests - entry.count,
			resetTime: entry.resetTime,
		}
	}
}

// Предустановленные конфигурации
export const rateLimitConfigs = {
	// Строгий лимит для аутентификации
	auth: {
		windowMs: 15 * 60 * 1000, // 15 минут
		maxRequests: 5,
	},
	// Умеренный лимит для API
	api: {
		windowMs: 60 * 1000, // 1 минута
		maxRequests: 60,
	},
	// Либеральный лимит для чтения
	read: {
		windowMs: 60 * 1000, // 1 минута
		maxRequests: 100,
	},
	// Очень строгий для отправки сообщений
	messages: {
		windowMs: 60 * 1000, // 1 минута
		maxRequests: 10,
	},
	// Лимит для загрузки файлов
	upload: {
		windowMs: 60 * 1000, // 1 минута
		maxRequests: 5,
	},
}

// Хелпер для создания rate limiter с пользовательским ключом
export function createUserRateLimit(config: RateLimitConfig) {
	return rateLimit({
		...config,
		keyGenerator: (req: Request) => {
			// Пытаемся получить userId из токена
			const auth = req.headers.get('authorization')
			if (auth && auth.startsWith('Bearer ')) {
				try {
					const token = auth.split(' ')[1]
					// Простая декодировка JWT (без проверки подписи для rate limiting)
					const payload = JSON.parse(atob(token.split('.')[1]))
					return `user:${payload.userId}`
				} catch {
					// Если не удалось декодировать, используем IP
				}
			}
			return defaultKeyGenerator(req)
		},
	})
}

