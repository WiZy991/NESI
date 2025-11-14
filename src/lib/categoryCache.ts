/**
 * In-memory кеш для категорий и подкатегорий
 * Кеш обновляется каждые 10 минут или при инвалидации
 */

import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface CachedData<T> {
	data: T
	timestamp: number
}

const CACHE_TTL = 10 * 60 * 1000 // 10 минут

let categoriesCache: CachedData<any> | null = null

/**
 * Получить категории с кешированием
 */
export async function getCachedCategories() {
	const now = Date.now()

	// Проверить кеш
	if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL) {
		logger.debug('Категории загружены из кеша')
		return categoriesCache.data
	}

	logger.debug('Загрузка категорий из БД')

	// Загрузить из БД
	const categories = await prisma.category.findMany({
		select: {
			id: true,
			name: true,
			subcategories: {
				select: {
					id: true,
					name: true,
					minPrice: true,
				},
				orderBy: { name: 'asc' },
			},
		},
		orderBy: { name: 'asc' },
	})

	// Сохранить в кеш
	categoriesCache = {
		data: categories,
		timestamp: now,
	}

	return categories
}

/**
 * Инвалидировать кеш категорий
 * Вызывать при создании/обновлении/удалении категорий
 */
export function invalidateCategoriesCache() {
	categoriesCache = null
	logger.debug('Кеш категорий инвалидирован')
}

