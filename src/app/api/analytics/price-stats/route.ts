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

// Функция для расчета коэффициента на основе количественных данных из базы знаний
function calculateKnowledgeMultiplier(
	taskType: { typicalHours: number; complexity: 'simple' | 'medium' | 'complex' | 'very_complex' } | null,
	quantitativeData?: { pages?: number; modules?: number; hours?: number }
): number {
	if (!taskType || !quantitativeData) return 1
	if (!quantitativeData) return 1
	
	let multiplier = 1
	
	// Если есть количество страниц
	if (quantitativeData.pages !== undefined && quantitativeData.pages >= 1 && quantitativeData.pages <= 100 && taskType.typicalHours > 0) {
		const complexity = taskType.complexity
		const hoursPerPage = complexity === 'simple' ? 2 : complexity === 'medium' ? 3 : 4
		const estimatedHours = quantitativeData.pages * hoursPerPage
		const pageMultiplier = estimatedHours / taskType.typicalHours
		multiplier *= Math.max(0.5, Math.min(3.0, pageMultiplier))
	}
	
	// Если есть количество модулей
	if (quantitativeData.modules !== undefined && quantitativeData.modules >= 1 && quantitativeData.modules <= 50 && taskType.typicalHours > 0) {
		const complexity = taskType.complexity
		const hoursPerModule = complexity === 'simple' ? 8 : complexity === 'medium' ? 12 : 16
		const estimatedHours = quantitativeData.modules * hoursPerModule
		const moduleMultiplier = estimatedHours / taskType.typicalHours
		multiplier *= Math.max(0.5, Math.min(3.0, moduleMultiplier))
	}
	
	// Если есть явно указанное время
	if (quantitativeData.hours && quantitativeData.hours >= 1 && quantitativeData.hours <= 1000 && taskType.typicalHours > 0) {
		const hoursMultiplier = quantitativeData.hours / taskType.typicalHours
		multiplier *= Math.max(0.3, Math.min(3.0, hoursMultiplier))
	}
	
	return multiplier
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

		// Определяем период для актуальных данных (последние 6 месяцев)
		const sixMonthsAgo = new Date()
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

		// Анализируем текст задачи, если передан
		let taskAnalysis: TaskAnalysis | null = null
		let similarTasks: Array<{ id: string; price: number; similarity: number; completedAt: Date | null }> = []
		
		// Проверяем, можно ли использовать адаптивную статистику
		const canUseAdaptive = taskTitle && taskDescription 
			? canUseAdaptiveStats(taskTitle, taskDescription)
			: false
		
		if (taskTitle && taskDescription && canUseAdaptive) {
			taskAnalysis = analyzeTaskText(taskTitle, taskDescription)
			
			// Ищем похожие ЗАВЕРШЕННЫЕ задачи в базе данных (только актуальные данные)
			try {
				const allTasks = await prisma.task.findMany({
					where: {
						status: 'completed', // Только завершенные задачи
						price: { not: null },
						completedAt: { 
							not: null,
							gte: sixMonthsAgo // Только за последние 6 месяцев
						},
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
						completedAt: true,
					},
					take: 500, // Ограничиваем для производительности
				})
				
				// Анализируем каждую задачу и вычисляем схожесть
				for (const task of allTasks) {
					if (!task.title || !task.description || !task.price) continue
					
					const otherAnalysis = analyzeTaskText(task.title, task.description)
					const similarity = calculateSimilarity(taskAnalysis, otherAnalysis)
					
					// Берем задачи с схожестью >= 50% (повышенный порог для точности)
					if (similarity >= 50) {
						similarTasks.push({
							id: task.id,
							price: Number(task.price),
							similarity,
							completedAt: task.completedAt,
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
		
		// Получаем базовую статистику по категории (ТОЛЬКО ЗАВЕРШЕННЫЕ задачи за последние 6 месяцев)
		const categoryStats = await prisma.task.aggregate({
			where: {
				status: 'completed', // Только завершенные задачи
				price: { not: null },
				completedAt: { 
					not: null,
					gte: sixMonthsAgo // Только за последние 6 месяцев
				},
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
		
		// Улучшенная логика формирования статистики с правильным приоритетом
		// ПРИОРИТЕТ: Похожие задачи → Внутренняя средняя (завершенные) → База знаний → Внешняя средняя
		let finalPrice = baseCategoryPrice
		let finalMin = baseCategoryMin
		let finalMax = baseCategoryMax
		let source = 'category_average'
		let confidence = 0.5 // Уверенность в результате (0-1)
		let sampleSize = categoryStats._count.price || 0
		
		// ПРИОРИТЕТ 1: Похожие задачи (если их достаточно и они достаточно похожи)
		if (similarTasks.length >= 5) { // Увеличили минимум до 5 для большей точности
			const totalWeight = similarTasks.reduce((sum, t) => sum + t.similarity, 0)
			const weightedSum = similarTasks.reduce((sum, t) => sum + (t.price * t.similarity), 0)
			const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0
			
			// Берем топ-30% для min/max, но не менее 3 задач
			const topCount = Math.max(3, Math.floor(similarTasks.length * 0.3))
			const topSimilar = similarTasks.slice(0, topCount)
			
			finalPrice = weightedAvg
			finalMin = Math.min(...topSimilar.map(t => t.price))
			finalMax = Math.max(...topSimilar.map(t => t.price))
			source = 'similar_tasks'
			sampleSize = similarTasks.length
			
			// Уверенность зависит от количества, схожести и свежести данных
			const avgSimilarity = similarTasks.reduce((sum, t) => sum + t.similarity, 0) / similarTasks.length
			const recentCount = similarTasks.filter(t => 
				t.completedAt && new Date(t.completedAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
			).length
			const freshnessBonus = Math.min(0.1, (recentCount / similarTasks.length) * 0.1)
			
			confidence = Math.min(0.95, 
				0.7 + // Базовая уверенность для похожих задач
				(similarTasks.length / 50) * 0.15 + // Бонус за количество
				(avgSimilarity / 100) * 0.1 + // Бонус за схожесть
				freshnessBonus // Бонус за свежесть данных
			)
		}
		// ПРИОРИТЕТ 2: Внутренняя средняя по завершенным задачам (если есть данные)
		else if (baseCategoryPrice > 0 && sampleSize >= 3) {
			finalPrice = baseCategoryPrice
			finalMin = baseCategoryMin
			finalMax = baseCategoryMax
			source = 'completed_tasks_average'
			
			// Уверенность зависит от размера выборки
			confidence = Math.min(0.85, 0.5 + (sampleSize / 100) * 0.35)
		}
		// ПРИОРИТЕТ 3: База знаний с коррекцией на количественные данные
		else if (taskType) {
			let knowledgePrice = getTypicalPrice(taskType)
			let knowledgeMin = getPriceRange(taskType).min
			let knowledgeMax = getPriceRange(taskType).max
			
			// Корректируем цену из базы знаний на основе количественных данных (с валидацией)
			if (taskAnalysis?.quantitativeData) {
				const knowledgeMultiplier = calculateKnowledgeMultiplier(taskType, taskAnalysis.quantitativeData)
				
				// Применяем общий множитель
				if (knowledgeMultiplier !== 1) {
					knowledgePrice = knowledgePrice * knowledgeMultiplier
					knowledgeMin = knowledgeMin * knowledgeMultiplier
					knowledgeMax = knowledgeMax * knowledgeMultiplier
				}
			}
			
			// Комбинируем с категорийной статистикой (взвешенное среднее)
			// Если есть реальные данные - даем им больший вес
			if (baseCategoryPrice > 0 && sampleSize >= 3) {
				const knowledgeWeight = 0.4
				const categoryWeight = 0.6
				finalPrice = knowledgePrice * knowledgeWeight + baseCategoryPrice * categoryWeight
				finalMin = Math.min(knowledgeMin, baseCategoryMin)
				finalMax = Math.max(knowledgeMax, baseCategoryMax)
				confidence = 0.7
			} else {
				// Если нет реальных данных - используем только базу знаний
				finalPrice = knowledgePrice
				finalMin = knowledgeMin
				finalMax = knowledgeMax
				confidence = 0.65 // Немного ниже, так как нет реальных данных
			}
			source = 'knowledge_base'
		}
		// ПРИОРИТЕТ 4: Анализ текста с коэффициентами (если есть анализ и нет других данных)
		let priceMultiplier = 1
		if (taskAnalysis && canUseAdaptive && (source === 'category_average' || source === 'completed_tasks_average')) {
			// Используем категорийную статистику как базу и применяем коэффициенты
			source = 'category_average_adjusted'
			
			// Базовые коэффициенты по сложности (более консервативные)
			const complexityMultipliers = {
				simple: 0.7,    // Было 0.6
				medium: 1.0,
				complex: 1.3,   // Было 1.4
				very_complex: 1.8 // Было 2.2, ограничено до 2.0 ниже
			}
			
			// Базовые коэффициенты по объему (более консервативные)
			const volumeMultipliers = {
				small: 0.8,      // Было 0.7
				medium: 1.0,
				large: 1.2,      // Было 1.3
				very_large: 1.5  // Было 1.8
			}
			
			// Коэффициенты по срочности (срочные задачи стоят дороже)
			const urgencyMultipliers = {
				normal: 1.0,
				urgent: 1.1,      // Было 1.15
				very_urgent: 1.2  // Было 1.3
			}
			
			// Начинаем с базового коэффициента по сложности
			let multiplier = complexityMultipliers[taskAnalysis.complexity] || 1.0
			
			// Умножаем на коэффициент объема
			multiplier *= volumeMultipliers[taskAnalysis.volume] || 1.0
			
			// Учитываем срочность
			multiplier *= urgencyMultipliers[taskAnalysis.urgency] || 1.0
			
			// Учитываем количество технологий (более консервативно)
			if (taskAnalysis.technologies.length > 0) {
				const techMultiplier = 1 + (taskAnalysis.technologies.length * 0.03) // Было 0.05
				multiplier *= Math.min(techMultiplier, 1.2) // Максимум +20% за технологии (было 1.3)
			}
			
			// Учитываем оценку времени (более консервативно)
			if (taskAnalysis.estimatedHours > 0) {
				if (taskAnalysis.estimatedHours > 200) {
					multiplier *= 1.15 // Было 1.2
				} else if (taskAnalysis.estimatedHours > 100) {
					multiplier *= 1.05 // Было 1.1
				} else if (taskAnalysis.estimatedHours < 5) {
					multiplier *= 0.95 // Было 0.9
				}
			}
			
			// Ограничиваем диапазон коэффициента (от 0.5 до 2.0 - более консервативно)
			priceMultiplier = Math.max(0.5, Math.min(2.0, multiplier))
			
			// Применяем коэффициент к финальной цене
			if (priceMultiplier !== 1) {
				finalPrice = finalPrice * priceMultiplier
				finalMin = finalMin * priceMultiplier
				finalMax = finalMax * priceMultiplier
				confidence = 0.6 // Немного ниже, так как используем коэффициенты
			}
		}
		
		// Формируем финальную статистику
		const priceStats = {
			_avg: { price: finalPrice },
			_min: { price: finalMin },
			_max: { price: finalMax },
			_count: { price: sampleSize },
		}

		// Получаем статистику по подкатегориям (только завершенные за последние 6 месяцев)
		const subcategoryStats = await prisma.task.groupBy({
			by: ['subcategoryId'],
			where: {
				status: 'completed', // Только завершенные
				price: { not: null },
				completedAt: { 
					not: null,
					gte: sixMonthsAgo // Только за последние 6 месяцев
				},
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
		
		// Применяем адаптивные коэффициенты к внешней средней цене
		// Используем те же коэффициенты, что и для внутренних данных
		let externalAverage = baseExternalAverage
		
		// Применяем коэффициент, если он был рассчитан (для всех источников, кроме похожих задач)
		if (priceMultiplier !== 1 && source !== 'similar_tasks') {
			externalAverage = baseExternalAverage * priceMultiplier
		}
		
		// Применяем адаптивные коэффициенты к внешним данным
		// Сначала применяем коэффициент из анализа текста (сложность, объем и т.д.)
		if (priceMultiplier !== 1 && source !== 'similar_tasks') {
			externalAverage = baseExternalAverage * priceMultiplier
		}
		
		// Затем применяем корректировку из базы знаний (количественные данные)
		if (taskType && taskAnalysis?.quantitativeData) {
			const knowledgeMultiplier = calculateKnowledgeMultiplier(taskType, taskAnalysis.quantitativeData)
			if (knowledgeMultiplier !== 1) {
				externalAverage = externalAverage * knowledgeMultiplier
			}
		}
		
		externalAverage = Math.round(externalAverage)
		
		// Адаптируем отдельные внешние источники
		const adaptedExternalData = externalData.map(source => {
			let adaptedPrice = source.averagePrice
			let adaptedMin = source.minPrice
			let adaptedMax = source.maxPrice
			let isAdapted = false
			
			// Применяем коэффициент из анализа текста (сложность, объем и т.д.)
			if (priceMultiplier !== 1 && source !== 'similar_tasks') {
				adaptedPrice = source.averagePrice * priceMultiplier
				adaptedMin = source.minPrice * priceMultiplier
				adaptedMax = source.maxPrice * priceMultiplier
				isAdapted = true
			}
			
			// Применяем корректировку из базы знаний (количественные данные)
			if (taskType && taskAnalysis?.quantitativeData) {
				const knowledgeMultiplier = calculateKnowledgeMultiplier(taskType, taskAnalysis.quantitativeData)
				if (knowledgeMultiplier !== 1) {
					adaptedPrice = adaptedPrice * knowledgeMultiplier
					adaptedMin = adaptedMin * knowledgeMultiplier
					adaptedMax = adaptedMax * knowledgeMultiplier
					isAdapted = true
				}
			}
			
			return {
				...source,
				averagePrice: Math.round(adaptedPrice),
				minPrice: Math.round(adaptedMin),
				maxPrice: Math.round(adaptedMax),
				isAdapted,
			}
		})

		return NextResponse.json({
			internal: {
				overall: overallStats,
				bySubcategory: detailedSubcategoryStats,
			},
			external: adaptedExternalData, // Возвращаем адаптированные внешние данные
			comparison: {
				internalAverage: overallStats.averagePrice,
				externalAverage,
				baseExternalAverage: baseExternalAverage, // Оригинальная средняя без адаптации
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
			isAdaptive: canUseAdaptive && (similarTasks.length >= 5 || taskType || (taskAnalysis && priceMultiplier !== 1)),
			priceMultiplier: priceMultiplier !== 1 ? priceMultiplier : undefined,
			source: source,
			confidence: Math.round(confidence * 100) / 100, // Округляем до 2 знаков
			sampleSize: sampleSize, // Размер выборки для отображения
		})
	} catch (error) {
		logger.error('Ошибка получения статистики цен', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}


