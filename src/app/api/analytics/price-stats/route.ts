import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { analyzeTaskText, calculateSimilarity, type TaskAnalysis } from '@/lib/taskTextAnalysis'
import { findTaskType, getTypicalPrice, getPriceRange, isPriceReasonable, TASK_PRICE_KNOWLEDGE } from '@/lib/taskPriceKnowledge'

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
		const taskTitle = searchParams.get('title') || undefined
		const taskDescription = searchParams.get('description') || undefined

		// Анализируем текст задачи, если передан
		let taskAnalysis: TaskAnalysis | null = null
		let similarTasks: Array<{ id: string; price: number; similarity: number }> = []
		
		if (taskTitle && taskDescription) {
			taskAnalysis = analyzeTaskText(taskTitle, taskDescription)
			
			// Проверяем, есть ли тип задачи в базе знаний
			const taskType = findTaskType(taskTitle, taskDescription)
			
			// Ищем похожие задачи в базе данных
			try {
				const allTasks = await prisma.task.findMany({
					where: {
						status: { in: ['open', 'in_progress', 'completed'] },
						price: { not: null },
						...(subcategoryId && { subcategoryId }),
						...(categoryId && !subcategoryId && {
							subcategory: { categoryId },
						}),
					},
					select: {
						id: true,
						title: true,
						description: true,
						price: true,
					},
					take: 500, // Ограничиваем для производительности
				})
				
				// Анализируем каждую задачу и вычисляем схожесть
				for (const task of allTasks) {
					if (!task.title || !task.description || !task.price) continue
					
					const otherAnalysis = analyzeTaskText(task.title, task.description)
					const similarity = calculateSimilarity(taskAnalysis, otherAnalysis)
					
					// Берем задачи с схожестью > 30%
					if (similarity > 30) {
						similarTasks.push({
							id: task.id,
							price: Number(task.price),
							similarity,
						})
					}
				}
				
				// Сортируем по схожести и берем топ-50
				similarTasks.sort((a, b) => b.similarity - a.similarity)
				similarTasks = similarTasks.slice(0, 50)
			} catch (err) {
				logger.warn('Ошибка поиска похожих задач', { error: err })
			}
		}
		
		// Проверяем, есть ли тип задачи в базе знаний
		const taskType = taskTitle && taskDescription ? findTaskType(taskTitle, taskDescription) : null
		
		// Получаем статистику цен из нашей базы данных
		// Приоритет: 1) Похожие задачи, 2) База знаний, 3) Коэффициенты
		let useSimilarTasks = similarTasks.length >= 3
		let useKnowledgeBase = false
		let knowledgeBasePrice = 0
		let knowledgeBaseRange = { min: 0, max: 0 }
		
		// Если найден тип задачи в базе знаний, используем его цену
		if (taskType && similarTasks.length < 3) {
			useKnowledgeBase = true
			knowledgeBasePrice = getTypicalPrice(taskType)
			knowledgeBaseRange = getPriceRange(taskType)
		}
		
		// Если задача очень простая и маленькая, но похожих задач мало,
		// используем обычную статистику, но с понижающим коэффициентом
		// Если задача очень сложная и большая, но похожих задач мало,
		// используем повышающий коэффициент (т.к. сложные проекты стоят дороже)
		let priceMultiplier = 1
		if (taskAnalysis && similarTasks.length < 3 && !useKnowledgeBase) {
			// Для очень сложных и больших задач - повышаем цену
			if (taskAnalysis.complexity === 'very_complex' && taskAnalysis.volume === 'very_large') {
				// Для очень сложных масштабных проектов используем коэффициент 2.0-3.0
				priceMultiplier = 2.5
			} else if (taskAnalysis.complexity === 'very_complex' || taskAnalysis.volume === 'very_large') {
				// Для очень сложных или очень больших задач используем коэффициент 1.5-2.0
				priceMultiplier = 1.8
			} else if (taskAnalysis.complexity === 'complex' && taskAnalysis.volume === 'large') {
				// Для сложных больших задач используем коэффициент 1.2-1.5
				priceMultiplier = 1.3
			}
			// Для простых задач - понижаем цену
			else if (taskAnalysis.complexity === 'simple' && taskAnalysis.volume === 'small') {
				// Для очень простых задач используем коэффициент 0.3-0.5
				priceMultiplier = 0.4
			} else if (taskAnalysis.complexity === 'simple' || taskAnalysis.volume === 'small') {
				// Для простых или маленьких задач используем коэффициент 0.6-0.8
				priceMultiplier = 0.7
			}
		}
		
		// Определяем источник цены
		const priceStats = useSimilarTasks
			? {
					_avg: { price: similarTasks.reduce((sum, t) => sum + t.price, 0) / similarTasks.length },
					_min: { price: Math.min(...similarTasks.map(t => t.price)) },
					_max: { price: Math.max(...similarTasks.map(t => t.price)) },
					_count: { price: similarTasks.length },
				}
			: useKnowledgeBase
			? {
					_avg: { price: knowledgeBasePrice },
					_min: { price: knowledgeBaseRange.min },
					_max: { price: knowledgeBaseRange.max },
					_count: { price: 0 }, // База знаний не имеет количества
				}
			: await prisma.task.aggregate({
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
		// Если используем базу знаний, не применяем коэффициент
		const baseAveragePrice = Number(priceStats._avg.price || 0)
		const baseMinPrice = Number(priceStats._min.price || 0)
		const baseMaxPrice = Number(priceStats._max.price || 0)
		
		const overallStats = {
			averagePrice: useKnowledgeBase 
				? Math.round(baseAveragePrice)
				: Math.round(baseAveragePrice * priceMultiplier),
			minPrice: useKnowledgeBase
				? Math.round(baseMinPrice)
				: Math.round(baseMinPrice * priceMultiplier),
			maxPrice: useKnowledgeBase
				? Math.round(baseMaxPrice)
				: Math.round(baseMaxPrice * priceMultiplier),
			taskCount: priceStats._count.price,
		}

		// Вычисляем среднюю цену из внешних источников
		const baseExternalAverage =
			externalData.length > 0
				? externalData.reduce((sum, d) => sum + d.averagePrice, 0) / externalData.length
				: 0
		
		// Применяем коэффициент к внешней средней цене, если он есть
		// Если используем базу знаний, не применяем коэффициент к внешним данным
		const externalAverage = useKnowledgeBase
			? Math.round(baseExternalAverage)
			: Math.round(baseExternalAverage * priceMultiplier)

		return NextResponse.json({
			internal: {
				overall: overallStats,
				bySubcategory: detailedSubcategoryStats,
			},
			external: externalData,
			comparison: {
				internalAverage: overallStats.averagePrice,
				externalAverage,
				baseExternalAverage: baseExternalAverage, // Для отображения оригинальной цены если нужно
				difference: overallStats.averagePrice - externalAverage,
				differencePercent:
					externalAverage > 0
						? ((overallStats.averagePrice - externalAverage) / externalAverage) * 100
						: 0,
			},
			analysis: taskAnalysis ? {
				complexity: taskAnalysis.complexity,
				volume: taskAnalysis.volume,
				urgency: taskAnalysis.urgency,
				technologies: taskAnalysis.technologies,
				estimatedHours: taskAnalysis.estimatedHours,
				taskTypeId: taskAnalysis.taskTypeId,
			} : null,
			taskType: taskType ? {
				id: taskType.id,
				name: taskType.name,
				description: taskType.description,
				typicalPrice: knowledgeBasePrice,
				priceRange: knowledgeBaseRange,
			} : null,
			similarTasksCount: similarTasks.length,
			isAdaptive: useSimilarTasks || useKnowledgeBase || (taskAnalysis && priceMultiplier !== 1),
			priceMultiplier: priceMultiplier !== 1 ? priceMultiplier : undefined,
			source: useSimilarTasks ? 'similar_tasks' : useKnowledgeBase ? 'knowledge_base' : 'category_average',
		})
	} catch (error) {
		logger.error('Ошибка получения статистики цен', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

