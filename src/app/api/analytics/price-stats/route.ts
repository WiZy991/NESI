import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

// Интерфейс для данных о ценах из внешних источников
interface ExternalPriceData {
	source: string
	category: string
	subcategory?: string
	minPrice: number
	maxPrice: number
	averagePrice: number
	sampleSize: number
	lastUpdated: string
}

// Функция для получения данных о ценах из внешних источников (заглушка)
// В реальности здесь можно интегрироваться с API фриланс-платформ
async function getExternalPriceData(
	categoryId?: string,
	subcategoryId?: string
): Promise<ExternalPriceData[]> {
	// Заглушка - в реальности здесь можно использовать:
	// - API фриланс-платформ (FL.ru, Freelancehunt, etc.)
	// - Парсинг публичных данных
	// - Интеграция с агрегаторами цен
	
	const mockData: ExternalPriceData[] = [
		{
			source: 'FL.ru',
			category: 'IT и программирование',
			subcategory: 'Веб-разработка',
			minPrice: 5000,
			maxPrice: 50000,
			averagePrice: 25000,
			sampleSize: 150,
			lastUpdated: new Date().toISOString(),
		},
		{
			source: 'Freelancehunt',
			category: 'IT и программирование',
			subcategory: 'Веб-разработка',
			minPrice: 3000,
			maxPrice: 45000,
			averagePrice: 22000,
			sampleSize: 120,
			lastUpdated: new Date().toISOString(),
		},
		{
			source: 'Kwork',
			category: 'IT и программирование',
			subcategory: 'Веб-разработка',
			minPrice: 2000,
			maxPrice: 40000,
			averagePrice: 20000,
			sampleSize: 200,
			lastUpdated: new Date().toISOString(),
		},
	]

	return mockData
}

export async function GET(req: Request) {
	try {
		const user = await getUserFromRequest(req).catch(() => null)

		// Разрешаем доступ только заказчикам
		if (!user || user.role !== 'customer') {
			return NextResponse.json(
				{ error: 'Доступно только для заказчиков' },
				{ status: 403 }
			)
		}

		const { searchParams } = new URL(req.url)
		const categoryId = searchParams.get('categoryId') || undefined
		const subcategoryId = searchParams.get('subcategoryId') || undefined

		// Получаем статистику цен из нашей базы данных
		const priceStats = await prisma.task.aggregate({
			where: {
				status: { in: ['open', 'in_progress', 'completed'] },
				price: { not: null },
				...(subcategoryId && { subcategoryId }),
				...(categoryId && !subcategoryId && {
					subcategory: { categoryId },
				}),
			},
			_avg: { price: true },
			_min: { price: true },
			_max: { price: true },
			_count: { price: true },
		})

		// Получаем статистику по подкатегориям
		const subcategoryStats = await prisma.task.groupBy({
			by: ['subcategoryId'],
			where: {
				status: { in: ['open', 'in_progress', 'completed'] },
				price: { not: null },
				...(categoryId && !subcategoryId && {
					subcategory: { categoryId },
				}),
			},
			_avg: { price: true },
			_min: { price: true },
			_max: { price: true },
			_count: { price: true },
		})

		// Получаем информацию о подкатегориях
		const subcategoryIds = subcategoryStats.map(s => s.subcategoryId).filter(Boolean)
		const subcategories = await prisma.subcategory.findMany({
			where: {
				id: { in: subcategoryIds as string[] },
			},
			include: {
				category: true,
			},
		})

		// Формируем детальную статистику по подкатегориям
		const detailedSubcategoryStats = subcategoryStats.map(stat => {
			const subcategory = subcategories.find(s => s.id === stat.subcategoryId)
			return {
				subcategoryId: stat.subcategoryId,
				subcategoryName: subcategory?.name || 'Неизвестно',
				categoryName: subcategory?.category.name || 'Неизвестно',
				averagePrice: Number(stat._avg.price || 0),
				minPrice: Number(stat._min.price || 0),
				maxPrice: Number(stat._max.price || 0),
				taskCount: stat._count.price,
			}
		})

		// Получаем данные из внешних источников
		const externalData = await getExternalPriceData(categoryId, subcategoryId)

		// Вычисляем общую статистику
		const overallStats = {
			averagePrice: Number(priceStats._avg.price || 0),
			minPrice: Number(priceStats._min.price || 0),
			maxPrice: Number(priceStats._max.price || 0),
			taskCount: priceStats._count.price,
		}

		// Вычисляем среднюю цену из внешних источников
		const externalAverage =
			externalData.length > 0
				? externalData.reduce((sum, d) => sum + d.averagePrice, 0) / externalData.length
				: 0

		return NextResponse.json({
			internal: {
				overall: overallStats,
				bySubcategory: detailedSubcategoryStats,
			},
			external: externalData,
			comparison: {
				internalAverage: overallStats.averagePrice,
				externalAverage,
				difference: overallStats.averagePrice - externalAverage,
				differencePercent:
					externalAverage > 0
						? ((overallStats.averagePrice - externalAverage) / externalAverage) * 100
						: 0,
			},
		})
	} catch (error) {
		logger.error('Ошибка получения статистики цен', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

