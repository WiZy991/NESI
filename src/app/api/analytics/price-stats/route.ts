import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { analyzeTaskText, calculateSimilarity, type TaskAnalysis } from '@/lib/taskTextAnalysis'
import { findTaskType, getTypicalPrice, getPriceRange } from '@/lib/taskPriceKnowledge'
import { canUseAdaptiveStats } from '@/lib/textQualityCheck'

// Функция для расчета коэффициента на основе количественных данных из базы знаний
function calculateKnowledgeMultiplier(
	taskType: { typicalHours: number; complexity: 'simple' | 'medium' | 'complex' | 'very_complex' } | null,
	quantitativeData?: { pages?: number; modules?: number; hours?: number }
): number {
	if (!taskType || !quantitativeData) return 1
	
	let multiplier = 1
	
	if (quantitativeData.pages !== undefined && quantitativeData.pages >= 1 && quantitativeData.pages <= 100 && taskType.typicalHours > 0) {
		const complexity = taskType.complexity
		const hoursPerPage = complexity === 'simple' ? 2 : complexity === 'medium' ? 3 : 4
		const estimatedHours = quantitativeData.pages * hoursPerPage
		const pageMultiplier = estimatedHours / taskType.typicalHours
		multiplier *= Math.max(0.5, Math.min(3.0, pageMultiplier))
	}
	
	if (quantitativeData.modules !== undefined && quantitativeData.modules >= 1 && quantitativeData.modules <= 50 && taskType.typicalHours > 0) {
		const complexity = taskType.complexity
		const hoursPerModule = complexity === 'simple' ? 8 : complexity === 'medium' ? 12 : 16
		const estimatedHours = quantitativeData.modules * hoursPerModule
		const moduleMultiplier = estimatedHours / taskType.typicalHours
		multiplier *= Math.max(0.5, Math.min(3.0, moduleMultiplier))
	}
	
	if (quantitativeData.hours && quantitativeData.hours >= 1 && quantitativeData.hours <= 1000 && taskType.typicalHours > 0) {
		const hoursMultiplier = quantitativeData.hours / taskType.typicalHours
		multiplier *= Math.max(0.3, Math.min(3.0, hoursMultiplier))
	}
	
	return multiplier
}

// Функция для расчета медианы
function calculateMedian(numbers: number[]): number {
	if (numbers.length === 0) return 0
	const sorted = [...numbers].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Функция для расчета перцентилей
function calculatePercentile(numbers: number[], percentile: number): number {
	if (numbers.length === 0) return 0
	const sorted = [...numbers].sort((a, b) => a - b)
	const index = Math.ceil((percentile / 100) * sorted.length) - 1
	return sorted[Math.max(0, index)]
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
		const taskId = searchParams.get('taskId') || undefined // ID текущей задачи
		const taskTitle = searchParams.get('title') || undefined
		const taskDescription = searchParams.get('description') || undefined

		// Определяем период для актуальных данных (последние 6 месяцев)
		const sixMonthsAgo = new Date()
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
		
		const threeMonthsAgo = new Date()
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

		// ========== НОВОЕ: Статистика по откликам на текущую задачу ==========
		let currentTaskResponses: {
			count: number
			prices: number[]
			min: number
			max: number
			average: number
			median: number
			byLevel: Record<number, { count: number; avgPrice: number }>
		} | null = null

		if (taskId) {
			const responses = await prisma.taskResponse.findMany({
				where: {
					taskId,
					price: { not: null, gt: 0 },
				},
				select: {
					price: true,
					user: {
						select: {
							level: true,
						}
					}
				}
			})

			if (responses.length > 0) {
				const prices = responses.map(r => Number(r.price))
				const byLevel: Record<number, { count: number; totalPrice: number }> = {}
				
				responses.forEach(r => {
					const level = r.user?.level || 1
					if (!byLevel[level]) {
						byLevel[level] = { count: 0, totalPrice: 0 }
					}
					byLevel[level].count++
					byLevel[level].totalPrice += Number(r.price)
				})

				const byLevelFormatted: Record<number, { count: number; avgPrice: number }> = {}
				Object.entries(byLevel).forEach(([level, data]) => {
					byLevelFormatted[Number(level)] = {
						count: data.count,
						avgPrice: Math.round(data.totalPrice / data.count)
					}
				})

				currentTaskResponses = {
					count: prices.length,
					prices,
					min: Math.min(...prices),
					max: Math.max(...prices),
					average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
					median: Math.round(calculateMedian(prices)),
					byLevel: byLevelFormatted
				}
			}
		}

		// ========== НОВОЕ: Статистика по всем откликам в категории ==========
		const responseStats = await prisma.taskResponse.aggregate({
			where: {
				task: {
					...(subcategoryId && { subcategoryId }),
					...(categoryId && !subcategoryId && {
						subcategory: { categoryId },
					}),
					createdAt: { gte: sixMonthsAgo },
				},
				price: { not: null, gt: 500 }, // Минимум 500₽
				createdAt: { gte: sixMonthsAgo },
			},
			_avg: { price: true },
			_min: { price: true },
			_max: { price: true },
			_count: { price: true },
		})

		// Получаем все цены откликов для расчета медианы и перцентилей
		const allResponsePrices = await prisma.taskResponse.findMany({
			where: {
				task: {
					...(subcategoryId && { subcategoryId }),
					...(categoryId && !subcategoryId && {
						subcategory: { categoryId },
					}),
					createdAt: { gte: sixMonthsAgo },
				},
				price: { not: null, gt: 500 },
				createdAt: { gte: sixMonthsAgo },
			},
			select: { price: true },
			take: 1000, // Ограничиваем для производительности
		})

		const responsePricesArray = allResponsePrices.map(r => Number(r.price))
		const responseMedian = calculateMedian(responsePricesArray)
		const responseP25 = calculatePercentile(responsePricesArray, 25)
		const responseP75 = calculatePercentile(responsePricesArray, 75)

		// ========== Статистика по завершённым задачам ==========
		let taskAnalysis: TaskAnalysis | null = null
		let similarTasks: Array<{ id: string; price: number; similarity: number; completedAt: Date | null }> = []
		
		const canUseAdaptive = taskTitle && taskDescription 
			? canUseAdaptiveStats(taskTitle, taskDescription)
			: false
		
		const taskType = taskTitle && taskDescription ? findTaskType(taskTitle, taskDescription) : null
		
		let minReasonablePrice = 500
		
		if (taskType) {
			const { min } = getPriceRange(taskType)
			minReasonablePrice = Math.max(500, Math.floor(min * 0.1))
		}

		if (taskTitle && taskDescription && canUseAdaptive) {
			taskAnalysis = analyzeTaskText(taskTitle, taskDescription)
			
			try {
				const allTasks = await prisma.task.findMany({
					where: {
						status: 'completed',
						price: { not: null, gte: minReasonablePrice },
						completedAt: { not: null, gte: sixMonthsAgo },
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
					take: 500,
				})
				
				for (const task of allTasks) {
					if (!task.title || !task.description || !task.price) continue
					
					const otherAnalysis = analyzeTaskText(task.title, task.description)
					const similarity = calculateSimilarity(taskAnalysis, otherAnalysis)
					
					if (similarity >= 50) {
						similarTasks.push({
							id: task.id,
							price: Number(task.price),
							similarity,
							completedAt: task.completedAt,
						})
					}
				}
				
				similarTasks.sort((a, b) => b.similarity - a.similarity)
				similarTasks = similarTasks.slice(0, 50)
			} catch (err) {
				logger.warn('Ошибка поиска похожих задач', { error: err })
			}
		}

		// Статистика по завершённым задачам
		const completedTaskStats = await prisma.task.aggregate({
			where: {
				status: 'completed',
				price: { not: null, gte: minReasonablePrice },
				completedAt: { not: null, gte: sixMonthsAgo },
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

		// ========== Формируем итоговую статистику ==========
		// ПРИОРИТЕТ 1: Отклики на текущую задачу (самые релевантные данные!)
		// ПРИОРИТЕТ 2: Похожие завершённые задачи
		// ПРИОРИТЕТ 3: Отклики в категории
		// ПРИОРИТЕТ 4: Завершённые задачи в категории
		// ПРИОРИТЕТ 5: База знаний

		let marketPrice = 0
		let marketMin = 0
		let marketMax = 0
		let source = 'no_data'
		let confidence = 0
		let sampleSize = 0
		let dataQuality: 'high' | 'medium' | 'low' | 'estimate' = 'estimate'

		// ПРИОРИТЕТ 1: Отклики на текущую задачу
		if (currentTaskResponses && currentTaskResponses.count >= 2) {
			marketPrice = currentTaskResponses.median // Используем медиану, она устойчивее к выбросам
			marketMin = currentTaskResponses.min
			marketMax = currentTaskResponses.max
			source = 'current_task_responses'
			sampleSize = currentTaskResponses.count
			confidence = Math.min(0.95, 0.7 + (currentTaskResponses.count / 20) * 0.25)
			dataQuality = currentTaskResponses.count >= 5 ? 'high' : 'medium'
		}
		// ПРИОРИТЕТ 2: Похожие завершённые задачи
		else if (similarTasks.length >= 3) {
			const totalWeight = similarTasks.reduce((sum, t) => sum + t.similarity, 0)
			const weightedSum = similarTasks.reduce((sum, t) => sum + (t.price * t.similarity), 0)
			marketPrice = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
			
			const prices = similarTasks.map(t => t.price)
			marketMin = Math.min(...prices)
			marketMax = Math.max(...prices)
			source = 'similar_completed_tasks'
			sampleSize = similarTasks.length
			
			const avgSimilarity = similarTasks.reduce((sum, t) => sum + t.similarity, 0) / similarTasks.length
			confidence = Math.min(0.9, 0.6 + (similarTasks.length / 30) * 0.2 + (avgSimilarity / 100) * 0.1)
			dataQuality = similarTasks.length >= 10 ? 'high' : 'medium'
		}
		// ПРИОРИТЕТ 3: Отклики в категории
		else if (responseStats._count.price >= 5) {
			marketPrice = Math.round(responseMedian) // Медиана откликов
			marketMin = Math.round(responseP25)
			marketMax = Math.round(responseP75)
			source = 'category_responses'
			sampleSize = responseStats._count.price
			confidence = Math.min(0.8, 0.5 + (sampleSize / 100) * 0.3)
			dataQuality = sampleSize >= 20 ? 'medium' : 'low'
		}
		// ПРИОРИТЕТ 4: Завершённые задачи в категории
		else if (completedTaskStats._count.price >= 3) {
			marketPrice = Math.round(Number(completedTaskStats._avg.price || 0))
			marketMin = Math.round(Number(completedTaskStats._min.price || 0))
			marketMax = Math.round(Number(completedTaskStats._max.price || 0))
			source = 'category_completed_tasks'
			sampleSize = completedTaskStats._count.price
			confidence = Math.min(0.75, 0.4 + (sampleSize / 50) * 0.35)
			dataQuality = sampleSize >= 10 ? 'medium' : 'low'
		}
		// ПРИОРИТЕТ 5: База знаний
		else if (taskType) {
			let knowledgePrice = getTypicalPrice(taskType)
			let knowledgeRange = getPriceRange(taskType)
			
			if (taskAnalysis?.quantitativeData) {
				const multiplier = calculateKnowledgeMultiplier(taskType, taskAnalysis.quantitativeData)
				knowledgePrice = Math.round(knowledgePrice * multiplier)
				knowledgeRange = {
					min: Math.round(knowledgeRange.min * multiplier),
					max: Math.round(knowledgeRange.max * multiplier)
				}
			}
			
			marketPrice = knowledgePrice
			marketMin = knowledgeRange.min
			marketMax = knowledgeRange.max
			source = 'knowledge_base'
			sampleSize = 0
			confidence = 0.5
			dataQuality = 'estimate'
		}

		// Проверяем достаточность данных
		const hasEnoughData = sampleSize >= 3 || source === 'knowledge_base'
		const isReliable = confidence >= 0.6 && (dataQuality === 'high' || dataQuality === 'medium')

		return NextResponse.json({
			// Основная статистика для виджета
			market: {
				price: marketPrice,
				min: marketMin,
				max: marketMax,
				source,
				confidence: Math.round(confidence * 100) / 100,
				sampleSize,
				dataQuality,
				hasEnoughData,
				isReliable,
			},
			
			// Статистика по откликам на текущую задачу (если есть)
			currentTaskResponses: currentTaskResponses ? {
				count: currentTaskResponses.count,
				min: currentTaskResponses.min,
				max: currentTaskResponses.max,
				average: currentTaskResponses.average,
				median: currentTaskResponses.median,
				byLevel: currentTaskResponses.byLevel,
			} : null,

			// Статистика по откликам в категории
			categoryResponses: responseStats._count.price > 0 ? {
				count: responseStats._count.price,
				average: Math.round(Number(responseStats._avg.price || 0)),
				median: Math.round(responseMedian),
				p25: Math.round(responseP25),
				p75: Math.round(responseP75),
				min: Math.round(Number(responseStats._min.price || 0)),
				max: Math.round(Number(responseStats._max.price || 0)),
			} : null,

			// Статистика по завершённым задачам
			completedTasks: completedTaskStats._count.price > 0 ? {
				count: completedTaskStats._count.price,
				average: Math.round(Number(completedTaskStats._avg.price || 0)),
				min: Math.round(Number(completedTaskStats._min.price || 0)),
				max: Math.round(Number(completedTaskStats._max.price || 0)),
			} : null,

			// Похожие задачи
			similarTasks: similarTasks.length > 0 ? {
				count: similarTasks.length,
				avgSimilarity: Math.round(similarTasks.reduce((sum, t) => sum + t.similarity, 0) / similarTasks.length),
			} : null,

			// Анализ задачи
			analysis: taskAnalysis ? {
				complexity: taskAnalysis.complexity,
				volume: taskAnalysis.volume,
				urgency: taskAnalysis.urgency,
				technologies: taskAnalysis.technologies,
				estimatedHours: taskAnalysis.estimatedHours,
			} : null,

			// Тип задачи из базы знаний
			taskType: taskType ? {
				id: taskType.id,
				name: taskType.name,
				description: taskType.description,
				typicalPrice: getTypicalPrice(taskType),
				priceRange: getPriceRange(taskType),
			} : null,

			// Для обратной совместимости
			internal: {
				overall: {
					averagePrice: marketPrice,
					minPrice: marketMin,
					maxPrice: marketMax,
					taskCount: sampleSize,
				},
			},
			comparison: {
				internalAverage: marketPrice,
				externalAverage: 0, // Убрали фейковые данные
			},
			source,
			confidence: Math.round(confidence * 100) / 100,
			sampleSize,
		})
	} catch (error) {
		logger.error('Ошибка получения статистики цен', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}
