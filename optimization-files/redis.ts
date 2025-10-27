// src/lib/redis.ts
// Redis клиент для кеширования

import Redis from 'ioredis'

// Создаем Redis клиент
const redis = new Redis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD,
	retryStrategy: (times: number) => {
		const delay = Math.min(times * 50, 2000)
		return delay
	},
	maxRetriesPerRequest: 3,
	enableReadyCheck: true,
	lazyConnect: false,
})

// Логирование подключения
redis.on('connect', () => {
	console.log('✅ Redis подключен')
})

redis.on('error', err => {
	console.error('❌ Redis ошибка:', err)
})

redis.on('ready', () => {
	console.log('🚀 Redis готов к работе')
})

// Типизированные функции для работы с кешем

/**
 * Получить значение из кеша
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
	try {
		const cached = await redis.get(key)
		if (!cached) return null

		return JSON.parse(cached) as T
	} catch (error) {
		console.error('❌ Redis GET ошибка:', error)
		return null
	}
}

/**
 * Сохранить значение в кеш
 * @param key - ключ
 * @param value - значение
 * @param ttl - время жизни в секундах (по умолчанию 1 час)
 */
export async function cacheSet(
	key: string,
	value: any,
	ttl: number = 3600
): Promise<boolean> {
	try {
		await redis.setex(key, ttl, JSON.stringify(value))
		return true
	} catch (error) {
		console.error('❌ Redis SET ошибка:', error)
		return false
	}
}

/**
 * Удалить значение из кеша
 */
export async function cacheDelete(key: string): Promise<boolean> {
	try {
		await redis.del(key)
		return true
	} catch (error) {
		console.error('❌ Redis DEL ошибка:', error)
		return false
	}
}

/**
 * Удалить все ключи по паттерну
 * Например: cacheDeletePattern('tasks:*')
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
	try {
		const keys = await redis.keys(pattern)
		if (keys.length === 0) return 0

		await redis.del(...keys)
		return keys.length
	} catch (error) {
		console.error('❌ Redis DEL pattern ошибка:', error)
		return 0
	}
}

/**
 * Проверить существование ключа
 */
export async function cacheExists(key: string): Promise<boolean> {
	try {
		const result = await redis.exists(key)
		return result === 1
	} catch (error) {
		console.error('❌ Redis EXISTS ошибка:', error)
		return false
	}
}

/**
 * Получить TTL ключа (в секундах)
 */
export async function cacheTTL(key: string): Promise<number> {
	try {
		return await redis.ttl(key)
	} catch (error) {
		console.error('❌ Redis TTL ошибка:', error)
		return -1
	}
}

/**
 * Инкрементировать счетчик
 */
export async function cacheIncr(key: string, ttl?: number): Promise<number> {
	try {
		const value = await redis.incr(key)
		if (ttl) {
			await redis.expire(key, ttl)
		}
		return value
	} catch (error) {
		console.error('❌ Redis INCR ошибка:', error)
		return 0
	}
}

/**
 * Получить статистику кеша
 */
export async function getCacheStats() {
	try {
		const info = await redis.info('stats')
		const memory = await redis.info('memory')

		// Парсим информацию
		const stats = {
			hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0'),
			misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0'),
			totalKeys: await redis.dbsize(),
			usedMemory: memory.match(/used_memory_human:(.+)/)?.[1] || 'N/A',
			connectedClients: parseInt(
				info.match(/connected_clients:(\d+)/)?.[1] || '0'
			),
		}

		const total = stats.hits + stats.misses
		const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(2) : '0'

		return {
			...stats,
			hitRate: `${hitRate}%`,
		}
	} catch (error) {
		console.error('❌ Redis stats ошибка:', error)
		return null
	}
}

/**
 * Очистить весь кеш (использовать осторожно!)
 */
export async function cacheFlushAll(): Promise<boolean> {
	try {
		await redis.flushall()
		console.log('🗑️  Redis кеш полностью очищен')
		return true
	} catch (error) {
		console.error('❌ Redis FLUSHALL ошибка:', error)
		return false
	}
}

export default redis

// Константы для ключей кеша
export const CACHE_KEYS = {
	categories: 'categories:all',
	subcategories: 'subcategories:all',
	user: (id: string) => `user:${id}`,
	task: (id: string) => `task:${id}`,
	tasksList: (page: number, filters: string) => `tasks:list:${page}:${filters}`,
	notifications: (userId: string) => `notifications:${userId}`,
	profile: (userId: string) => `profile:${userId}`,
}

// Константы для TTL
export const CACHE_TTL = {
	SHORT: 300, // 5 минут
	MEDIUM: 1800, // 30 минут
	LONG: 3600, // 1 час
	DAY: 86400, // 24 часа
}
