import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { analyzeTaskText, calculateSimilarity, type TaskAnalysis } from '@/lib/taskTextAnalysis'
import { findTaskType, getTypicalPrice, getPriceRange, isPriceReasonable, TASK_PRICE_KNOWLEDGE } from '@/lib/taskPriceKnowledge'
import { canUseAdaptiveStats } from '@/lib/textQualityCheck'

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
		
		// Проверяем, можно ли использовать адаптивную статистику
		const canUseAdaptive = taskTitle && taskDescription 
			? canUseAdaptiveStats(taskTitle, taskDescription)
			: false
		
		if (taskTitle && taskDescription && canUseAdaptive) {
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
		
		// Улучшенный расчет коэффициента цены с учетом множества факторов
		// Применяем коэффициенты только если текст осмысленный и нет достаточного количества похожих задач
		let priceMultiplier = 1
		if (taskAnalysis && similarTasks.length < 3 && !useKnowledgeBase && canUseAdaptive) {
			// Базовые коэффициенты по сложности
			const complexityMultipliers = {
				simple: 0.6,
				medium: 1.0,
				complex: 1.4,
				very_complex: 2.2
			}
			
			// Базовые коэффициенты по объему
			const volumeMultipliers = {
				small: 0.7,
				medium: 1.0,
				large: 1.3,
				very_large: 1.8
			}
			
			// Коэффициенты по срочности (срочные задачи стоят дороже)
			const urgencyMultipliers = {
				normal: 1.0,
				urgent: 1.15,
				very_urgent: 1.3
			}
			
			// Начинаем с базового коэффициента по сложности
			let multiplier = complexityMultipliers[taskAnalysis.complexity] || 1.0
			
			// Умножаем на коэффициент объема
			multiplier *= volumeMultipliers[taskAnalysis.volume] || 1.0
			
			// Учитываем срочность
			multiplier *= urgencyMultipliers[taskAnalysis.urgency] || 1.0
			
			// Учитываем количество технологий (больше технологий = сложнее = дороже)
			if (taskAnalysis.technologies.length > 0) {
				const techMultiplier = 1 + (taskAnalysis.technologies.length * 0.05)
				multiplier *= Math.min(techMultiplier, 1.3) // Максимум +30% за технологии
			}
			
			// Учитываем оценку времени (больше часов = больше работа = дороже)
			if (taskAnalysis.estimatedHours > 0) {
				if (taskAnalysis.estimatedHours > 200) {
					multiplier *= 1.2 // Для очень долгих проектов
				} else if (taskAnalysis.estimatedHours > 100) {
					multiplier *= 1.1 // Для долгих проектов
				} else if (taskAnalysis.estimatedHours < 5) {
					multiplier *= 0.9 // Для быстрых задач немного дешевле
				}
			}
			
			// Специальные случаи для комбинаций
			// Очень сложная + очень большой объем = максимальный коэффициент
			if (taskAnalysis.complexity === 'very_complex' && taskAnalysis.volume === 'very_large') {
				multiplier = Math.max(multiplier, 2.5)
			}
			
			// Простая + маленький объем = минимальный коэффициент
			if (taskAnalysis.complexity === 'simple' && taskAnalysis.volume === 'small') {
				multiplier = Math.min(multiplier, 0.4)
			}
			
			// Ограничиваем диапазон коэффициента (от 0.3 до 3.0)
			priceMultiplier = Math.max(0.3, Math.min(3.0, multiplier))
		}
		
		// Определяем источник цены
		// Для похожих задач используем взвешенное среднее по схожести
		const priceStats = useSimilarTasks
			? (() => {
					// Вычисляем взвешенное среднее, где вес = схожесть
					const totalWeight = similarTasks.reduce((sum, t) => sum + t.similarity, 0)
					const weightedSum = similarTasks.reduce((sum, t) => sum + (t.price * t.similarity), 0)
					const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0
					
					// Для min/max берем значения из самых похожих задач (топ 30% по схожести)
					const topSimilar = similarTasks
						.sort((a, b) => b.similarity - a.similarity)
						.slice(0, Math.max(1, Math.floor(similarTasks.length * 0.3)))
					
					return {
						_avg: { price: weightedAvg },
						_min: { price: Math.min(...topSimilar.map(t => t.price)) },
						_max: { price: Math.max(...topSimilar.map(t => t.price)) },
						_count: { price: similarTasks.length },
					}
				})()
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
		// Если используем базу знаний или текст не осмысленный, не применяем коэффициент к внешним данным
		const externalAverage = (useKnowledgeBase || !canUseAdaptive)
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
			isAdaptive: canUseAdaptive && (useSimilarTasks || useKnowledgeBase || (taskAnalysis && priceMultiplier !== 1)),
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

