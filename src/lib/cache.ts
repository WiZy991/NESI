// Простой in-memory кеш для API данных
// В продакшене лучше использовать Redis

interface CacheEntry<T> {
	data: T
	timestamp: number
	ttl: number
}

class MemoryCache {
	private cache = new Map<string, CacheEntry<any>>()
	private cleanupInterval: NodeJS.Timeout

	constructor() {
		// Очистка устаревших записей каждые 5 минут
		this.cleanupInterval = setInterval(() => {
			this.cleanup()
		}, 5 * 60 * 1000)
	}

	set<T>(key: string, data: T, ttlMs: number = 300000): void {
		// 5 минут по умолчанию
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs,
		})
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key)

		if (!entry) {
			return null
		}

		const now = Date.now()
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key)
			return null
		}

		return entry.data as T
	}

	delete(key: string): void {
		this.cache.delete(key)
	}

	clear(): void {
		this.cache.clear()
	}

	private cleanup(): void {
		const now = Date.now()
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key)
			}
		}
	}

	destroy(): void {
		clearInterval(this.cleanupInterval)
		this.cache.clear()
	}

	// Статистика кеша
	getStats() {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		}
	}
}

// Глобальный экземпляр кеша
export const cache = new MemoryCache()

// Хелперы для кеширования API запросов
export function getCachedData<T>(key: string): T | null {
	return cache.get<T>(key)
}

export function setCachedData<T>(key: string, data: T, ttlMs?: number): void {
	cache.set(key, data, ttlMs)
}

export function invalidateCache(pattern?: string): void {
	if (!pattern) {
		cache.clear()
		return
	}

	const stats = cache.getStats()
	for (const key of stats.keys) {
		if (key.includes(pattern)) {
			cache.delete(key)
		}
	}
}

// Генераторы ключей для разных типов данных
export const cacheKeys = {
	user: (id: string) => `user:${id}`,
	task: (id: string) => `task:${id}`,
	tasks: (params: string) => `tasks:${params}`,
	categories: () => 'categories:all',
	notifications: (userId: string, page?: number) =>
		`notifications:${userId}${page ? `:page:${page}` : ''}`,
	users: (params: string) => `users:${params}`,
	messages: (taskId: string) => `messages:${taskId}`,
	responses: (taskId: string) => `responses:${taskId}`,
}

// TTL константы
export const cacheTTL = {
	// Статические данные - долго
	categories: 30 * 60 * 1000, // 30 минут
	users: 10 * 60 * 1000, // 10 минут

	// Пользовательские данные - средне
	tasks: 5 * 60 * 1000, // 5 минут
	notifications: 30 * 1000, // 30 секунд

	// Динамические данные - коротко
	messages: 10 * 1000, // 10 секунд
	responses: 30 * 1000, // 30 секунд

	// Персональные данные - очень коротко
	user: 2 * 60 * 1000, // 2 минуты
}

// Хелпер для кеширования с автоматической инвалидацией
export async function withCache<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlMs: number = 300000
): Promise<T> {
	// Пытаемся получить из кеша
	const cached = getCachedData<T>(key)
	if (cached !== null) {
		return cached
	}

	// Если нет в кеше, получаем данные
	const data = await fetcher()

	// Сохраняем в кеш
	setCachedData(key, data, ttlMs)

	return data
}

// Хелпер для кеширования с зависимостями
export function createCacheKey(
	base: string,
	...deps: (string | number)[]
): string {
	return `${base}:${deps.join(':')}`
}

// Очистка кеша при изменении данных
export function invalidateRelatedCache(type: string, id?: string) {
	switch (type) {
		case 'task':
			invalidateCache('tasks:')
			if (id) {
				cache.delete(cacheKeys.task(id))
				cache.delete(cacheKeys.messages(id))
				cache.delete(cacheKeys.responses(id))
			}
			break
		case 'user':
			invalidateCache('users:')
			if (id) {
				cache.delete(cacheKeys.user(id))
				invalidateCache(`notifications:${id}`)
			}
			break
		case 'category':
			cache.delete(cacheKeys.categories())
			break
		case 'message':
			if (id) {
				invalidateCache(`messages:${id}`)
			}
			break
		case 'response':
			if (id) {
				invalidateCache(`responses:${id}`)
			}
			break
	}
}
