// src/lib/categoryCache.ts
// In-memory кеш для категорий и подкатегорий

import prisma from './prisma'

const CACHE_TTL = 60 * 60 * 1000 // 1 час

interface CachedData<T> {
	data: T
	timestamp: number
}

let categoriesCache: CachedData<any> | null = null
let subcategoriesCache: CachedData<any> | null = null

/**
 * Получить категории с кешированием
 */
export async function getCachedCategories() {
	const now = Date.now()

	// Проверить кеш
	if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL) {
		console.log('✅ Categories from cache')
		return categoriesCache.data
	}

	console.log('🔄 Fetching categories from DB')

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
 * Получить подкатегории с кешированием
 */
export async function getCachedSubcategories() {
	const now = Date.now()

	// Проверить кеш
	if (subcategoriesCache && now - subcategoriesCache.timestamp < CACHE_TTL) {
		console.log('✅ Subcategories from cache')
		return subcategoriesCache.data
	}

	console.log('🔄 Fetching subcategories from DB')

	// Загрузить из БД
	const subcategories = await prisma.subcategory.findMany({
		select: {
			id: true,
			name: true,
			minPrice: true,
			categoryId: true,
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: { name: 'asc' },
	})

	// Сохранить в кеш
	subcategoriesCache = {
		data: subcategories,
		timestamp: now,
	}

	return subcategories
}

/**
 * Инвалидировать кеш категорий
 * Вызывать при создании/обновлении/удалении категорий
 */
export function invalidateCategoryCache() {
	console.log('🗑️  Invalidating category cache')
	categoriesCache = null
	subcategoriesCache = null
}

/**
 * Получить статистику кеша
 */
export function getCacheStats() {
	const now = Date.now()

	return {
		categories: {
			cached: !!categoriesCache,
			age: categoriesCache
				? Math.round((now - categoriesCache.timestamp) / 1000)
				: null,
			ttl: CACHE_TTL / 1000,
		},
		subcategories: {
			cached: !!subcategoriesCache,
			age: subcategoriesCache
				? Math.round((now - subcategoriesCache.timestamp) / 1000)
				: null,
			ttl: CACHE_TTL / 1000,
		},
	}
}
