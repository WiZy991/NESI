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
		
		// Получаем базовую статистику по категории (всегда нужна как fallback)
		const categoryStats = await prisma.task.aggregate({
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
		
		const baseCategoryPrice = Number(categoryStats._avg.price || 0)
		const baseCategoryMin = Number(categoryStats._min.price || 0)
		const baseCategoryMax = Number(categoryStats._max.price || 0)
		
		// Улучшенная логика формирования статистики с комбинированием источников
		let finalPrice = baseCategoryPrice
		let finalMin = baseCategoryMin
		let finalMax = baseCategoryMax
		let source = 'category_average'
		let confidence = 0.5 // Уверенность в результате (0-1)
		
		// ПРИОРИТЕТ 1: Похожие задачи (если их достаточно)
		if (similarTasks.length >= 3) {
			const totalWeight = similarTasks.reduce((sum, t) => sum + t.similarity, 0)
			const weightedSum = similarTasks.reduce((sum, t) => sum + (t.price * t.similarity), 0)
			const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0
			
			const topSimilar = similarTasks
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, Math.max(1, Math.floor(similarTasks.length * 0.3)))
			
			finalPrice = weightedAvg
			finalMin = Math.min(...topSimilar.map(t => t.price))
			finalMax = Math.max(...topSimilar.map(t => t.price))
			source = 'similar_tasks'
			// Уверенность зависит от количества и схожести
			const avgSimilarity = similarTasks.reduce((sum, t) => sum + t.similarity, 0) / similarTasks.length
			confidence = Math.min(0.95, 0.6 + (similarTasks.length / 50) * 0.2 + (avgSimilarity / 100) * 0.15)
		}
		// ПРИОРИТЕТ 2: База знаний с коррекцией на количественные данные
		else if (taskType) {
			let knowledgePrice = getTypicalPrice(taskType)
			let knowledgeMin = getPriceRange(taskType).min
			let knowledgeMax = getPriceRange(taskType).max
			
			// Корректируем цену из базы знаний на основе количественных данных
			if (taskAnalysis?.quantitativeData) {
				const qData = taskAnalysis.quantitativeData
				
				// Если есть количество страниц - корректируем цену пропорционально
				// Предполагаем, что для верстки: 2-4 часа на страницу (в зависимости от сложности)
				if (qData.pages !== undefined && taskType.typicalHours > 0) {
					const complexity = taskType.complexity
					const hoursPerPage = complexity === 'simple' ? 2 : complexity === 'medium' ? 3 : 4
					const estimatedHours = qData.pages * hoursPerPage
					
					// Корректируем цену пропорционально времени
					const priceMultiplier = estimatedHours / taskType.typicalHours
					
					knowledgePrice = knowledgePrice * priceMultiplier
					knowledgeMin = knowledgeMin * priceMultiplier
					knowledgeMax = knowledgeMax * priceMultiplier
				}
				
				// Аналогично для модулей: 8-16 часов на модуль
				if (qData.modules !== undefined && taskType.typicalHours > 0) {
					const complexity = taskType.complexity
					const hoursPerModule = complexity === 'simple' ? 8 : complexity === 'medium' ? 12 : 16
					const estimatedHours = qData.modules * hoursPerModule
					const priceMultiplier = estimatedHours / taskType.typicalHours
					
					knowledgePrice = knowledgePrice * priceMultiplier
					knowledgeMin = knowledgeMin * priceMultiplier
					knowledgeMax = knowledgeMax * priceMultiplier
				}
				
				// Если есть явно указанное время - используем его
				if (qData.hours) {
					const priceMultiplier = qData.hours / taskType.typicalHours
					knowledgePrice = knowledgePrice * priceMultiplier
					knowledgeMin = knowledgeMin * priceMultiplier
					knowledgeMax = knowledgeMax * priceMultiplier
				}
			}
			
			// Комбинируем с категорийной статистикой (взвешенное среднее)
			// Если база знаний более специфична - даем ей больший вес
			const knowledgeWeight = 0.7
			const categoryWeight = 0.3
			
			finalPrice = knowledgePrice * knowledgeWeight + baseCategoryPrice * categoryWeight
			finalMin = Math.min(knowledgeMin, baseCategoryMin)
			finalMax = Math.max(knowledgeMax, baseCategoryMax)
			source = 'knowledge_base'
			confidence = 0.75
		}
		// ПРИОРИТЕТ 3: Анализ текста с коэффициентами (если есть анализ)
		else if (taskAnalysis && canUseAdaptive) {
			// Используем категорийную статистику как базу и применяем коэффициенты
			source = 'category_average_adjusted'
			confidence = 0.6
		}
		
		// Улучшенный расчет коэффициента цены с учетом множества факторов
		// Применяем коэффициенты для корректировки категорийной статистики
		let priceMultiplier = 1
		if (taskAnalysis && canUseAdaptive && source === 'category_average_adjusted') {
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
		
		// Применяем коэффициент к финальной цене (если используется категорийная статистика с корректировкой)
		if (source === 'category_average_adjusted' && priceMultiplier !== 1) {
			finalPrice = finalPrice * priceMultiplier
			finalMin = finalMin * priceMultiplier
			finalMax = finalMax * priceMultiplier
		}
		
		// Формируем финальную статистику
		const priceStats = {
			_avg: { price: finalPrice },
			_min: { price: finalMin },
			_max: { price: finalMax },
			_count: { price: source === 'similar_tasks' ? similarTasks.length : categoryStats._count.price },
		}

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

		// Вычисляем общую статистику (уже с примененными корректировками)
		const overallStats = {
			averagePrice: Math.round(Number(priceStats._avg.price || 0)),
			minPrice: Math.round(Number(priceStats._min.price || 0)),
			maxPrice: Math.round(Number(priceStats._max.price || 0)),
			taskCount: priceStats._count.price,
		}

		// Вычисляем среднюю цену из внешних источников
		const baseExternalAverage =
			externalData.length > 0
				? externalData.reduce((sum, d) => sum + d.averagePrice, 0) / externalData.length
				: 0
		
		// Применяем коэффициент к внешней средней цене, если используется корректировка
		const externalAverage = (source === 'category_average_adjusted' && priceMultiplier !== 1)
			? Math.round(baseExternalAverage * priceMultiplier)
			: Math.round(baseExternalAverage)

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
				typicalPrice: getTypicalPrice(taskType),
				priceRange: getPriceRange(taskType),
			} : null,
			similarTasksCount: similarTasks.length,
			isAdaptive: canUseAdaptive && (similarTasks.length >= 3 || taskType || (taskAnalysis && priceMultiplier !== 1)),
			priceMultiplier: priceMultiplier !== 1 ? priceMultiplier : undefined,
			source: source,
			confidence: confidence, // Уверенность в результате (0-1)
		})
	} catch (error) {
		logger.error('Ошибка получения статистики цен', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

