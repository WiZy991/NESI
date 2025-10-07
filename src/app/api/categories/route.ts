// /api/categories/route.ts

import { cacheKeys, cacheTTL, withCache } from '@/lib/cache'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const categories = await withCache(
			cacheKeys.categories(),
			async () => {
				return await prisma.category.findMany({
					include: {
						subcategories: {
							select: {
								id: true,
								name: true,
								minPrice: true,
							},
						},
					},
				})
			},
			cacheTTL.categories
		)

		const response = NextResponse.json({ categories })

		// Кеширование на клиенте на 30 минут
		response.headers.set(
			'Cache-Control',
			'public, s-maxage=1800, stale-while-revalidate=3600'
		)

		return response
	} catch (err) {
		console.error('Ошибка при получении категорий:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
