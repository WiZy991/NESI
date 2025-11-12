// /api/categories/route.ts

import { getCachedCategories } from '@/lib/categoryCache'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		// Используем кешированные категории (in-memory кеш на 10 минут)
		const categories = await getCachedCategories()

		const response = NextResponse.json({ categories })

		// Дополнительное HTTP кеширование на клиенте на 30 минут
		response.headers.set(
			'Cache-Control',
			'public, s-maxage=1800, stale-while-revalidate=3600'
		)

		return response
	} catch (err) {
		logger.error('Ошибка при получении категорий', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
