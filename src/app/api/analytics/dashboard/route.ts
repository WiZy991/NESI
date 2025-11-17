import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
	let user: { id: string; role: string } | null = null
	try {
		user = await getUserFromRequest(req).catch(() => null)

		// Разрешаем доступ только заказчикам
		if (!user || user.role !== 'customer') {
			return NextResponse.json(
				{ error: 'Доступно только для заказчиков' },
				{ status: 403 }
			)
		}

		// После проверки user гарантированно не null
		const currentUser = user

		const { searchParams } = new URL(req.url)
		const period = searchParams.get('period') || '30' // дни
		const periodNum = parseInt(period) || 30
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - periodNum)
		startDate.setHours(0, 0, 0, 0) // Начало дня для корректной фильтрации
		
		// Всегда используем фильтрацию по датам
		const useDateFilter = true

		const endDate = new Date()
		endDate.setHours(23, 59, 59, 999)
		
		logger.debug('Начало получения аналитики дашборда', {
			userId: currentUser.id,
			period: periodNum,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			useDateFilter: true,
		})

		// Для отладки: получаем все задачи пользователя
		try {
			const allUserTasks = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
				},
				select: {
					id: true,
					status: true,
					price: true,
					escrowAmount: true,
					createdAt: true,
					completedAt: true,
				},
				take: 10,
				orderBy: {
					createdAt: 'desc',
				},
			})

			logger.debug('Все задачи пользователя (первые 10)', {
				userId: currentUser.id,
				totalTasks: allUserTasks.length,
				tasks: allUserTasks.map(t => ({
					id: t.id,
					status: t.status,
					price: t.price?.toString(),
					escrowAmount: t.escrowAmount?.toString(),
					createdAt: t.createdAt.toISOString(),
					completedAt: t.completedAt?.toISOString(),
				})),
			})
		} catch (err) {
			logger.warn('Ошибка получения всех задач для отладки', { error: err })
		}

		// Основные метрики
		let totalTasks = 0
		let completedTasks = 0
		let inProgressTasks = 0
		let openTasks = 0
		let totalSpent = { _sum: { price: null as any } }
		let totalResponses = 0
		let hiredExecutors = 0

		try {
			const [
				totalTasksResult,
				completedTasksResult,
				inProgressTasksResult,
				openTasksResult,
				totalSpentResult,
				totalResponsesResult,
				hiredExecutorsResult,
			] = await Promise.all([
			// Всего задач - задачи, созданные в период ИЛИ завершенные в период
			useDateFilter
				? prisma.task.count({
						where: {
							customerId: currentUser.id,
							OR: [
								{ createdAt: { gte: startDate } },
								{
									status: 'completed',
									completedAt: { not: null, gte: startDate },
								},
							],
						},
					})
				: prisma.task.count({
						where: {
							customerId: currentUser.id,
						},
					}),
			// Завершенных задач - учитываем задачи, завершенные в период (независимо от даты создания)
			prisma.task.count({
				where: {
					customerId: currentUser.id,
					status: 'completed',
					completedAt: useDateFilter 
						? { not: null, gte: startDate }
						: { not: null },
				},
			}),
			// В работе
			prisma.task.count({
				where: {
					customerId: currentUser.id,
					status: 'in_progress',
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
			}),
			// Открытых
			prisma.task.count({
				where: {
					customerId: currentUser.id,
					status: 'open',
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
			}),
			// Потрачено средств - учитываем все завершенные задачи, завершенные в период
			// Используем price, если есть, иначе escrowAmount, иначе транзакции
			prisma.task.aggregate({
				where: {
					customerId: currentUser.id,
					status: 'completed',
					completedAt: useDateFilter 
						? { not: null, gte: startDate }
						: { not: null },
				},
				_sum: { 
					price: true,
					escrowAmount: true,
				},
			}),
			// Всего откликов
			prisma.taskResponse.count({
				where: {
					task: {
						customerId: currentUser.id,
						...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
					},
				},
			}),
			// Нанято исполнителей - задачи с исполнителем, созданные в период ИЛИ завершенные в период
			useDateFilter
				? prisma.task.count({
						where: {
							customerId: currentUser.id,
							executorId: { not: null },
							OR: [
								{ createdAt: { gte: startDate } },
								{
									status: 'completed',
									completedAt: { not: null, gte: startDate },
								},
							],
						},
					})
				: prisma.task.count({
						where: {
							customerId: currentUser.id,
							executorId: { not: null },
						},
					}),
			])

			totalTasks = totalTasksResult
			completedTasks = completedTasksResult
			inProgressTasks = inProgressTasksResult
			openTasks = openTasksResult
			// Используем price, если есть, иначе escrowAmount
			let spentFromPrice = Number(totalSpentResult._sum.price || 0)
			const spentFromEscrow = Number(totalSpentResult._sum.escrowAmount || 0)
			
			// Если price = 0, но есть escrowAmount, используем его
			if (spentFromPrice === 0 && spentFromEscrow > 0) {
				spentFromPrice = spentFromEscrow
			}
			
			// Если все еще 0, пытаемся получить из транзакций
			if (spentFromPrice === 0) {
				try {
					// Сначала получаем ID завершенных задач
					const completedTaskIds = await prisma.task.findMany({
						where: {
							customerId: currentUser.id,
							status: 'completed',
							completedAt: useDateFilter 
								? { not: null, gte: startDate }
								: { not: null },
						},
						select: { id: true },
					})

					if (completedTaskIds.length > 0) {
						const taskIds = completedTaskIds.map(t => t.id)
						
						const paymentTransactions = await prisma.transaction.aggregate({
							where: {
								userId: currentUser.id,
								type: 'payment',
								amount: { lt: 0 }, // Отрицательные суммы = платежи
								taskId: { in: taskIds },
							},
							_sum: { amount: true },
						})
						
						const spentFromTransactions = Math.abs(Number(paymentTransactions._sum.amount || 0))
						if (spentFromTransactions > 0) {
							spentFromPrice = spentFromTransactions
							logger.debug('Получена сумма из транзакций', {
								userId: currentUser.id,
								spentFromTransactions,
								taskIdsCount: taskIds.length,
							})
						}
					}
				} catch (err) {
					logger.warn('Ошибка получения суммы из транзакций', { error: err })
				}
			}
			
			totalSpent = {
				_sum: {
					price: spentFromPrice > 0 ? new Prisma.Decimal(spentFromPrice) : null,
				},
			}
			totalResponses = totalResponsesResult
			hiredExecutors = hiredExecutorsResult
		} catch (err) {
			logger.error('Ошибка получения основных метрик', { error: err })
			// Продолжаем с нулевыми значениями
		}

		// Конверсия откликов в найм
		const conversionRate =
			totalResponses > 0 ? (hiredExecutors / totalResponses) * 100 : 0

		// Средняя цена задачи - учитываем все завершенные задачи, завершенные в период
		// Используем price, если есть, иначе escrowAmount, иначе транзакции
		let avgPriceResult = { _avg: { price: null as any } }
		try {
			const completedTasksForAvg = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
					status: 'completed',
					completedAt: useDateFilter 
						? { not: null, gte: startDate }
						: { not: null },
				},
				select: {
					id: true,
					price: true,
					escrowAmount: true,
				},
			})

			if (completedTasksForAvg.length > 0) {
				const prices: number[] = []
				
				for (const task of completedTasksForAvg) {
					let taskPrice = Number(task.price || 0)
					
					// Если price = 0, используем escrowAmount
					if (taskPrice === 0) {
						taskPrice = Number(task.escrowAmount || 0)
					}
					
					// Если все еще 0, пытаемся получить из транзакций
					if (taskPrice === 0 && task.id) {
						try {
							const paymentTransaction = await prisma.transaction.findFirst({
								where: {
									userId: currentUser.id,
									taskId: task.id,
									type: 'payment',
									amount: { lt: 0 },
								},
								orderBy: {
									createdAt: 'desc',
								},
							})
							
							if (paymentTransaction) {
								taskPrice = Math.abs(Number(paymentTransaction.amount))
							}
						} catch (err) {
							// Игнорируем ошибки для отдельных задач
						}
					}
					
					if (taskPrice > 0) {
						prices.push(taskPrice)
					}
				}
				
				if (prices.length > 0) {
					const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
					avgPriceResult = { _avg: { price: new Prisma.Decimal(avgPrice) } }
				}
			}
		} catch (err) {
			logger.warn('Ошибка получения средней цены', { error: err })
		}

		// Дополнительная проверка: получаем все завершенные задачи для отладки
		try {
			const allCompletedTasks = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
					status: 'completed',
					completedAt: { not: null },
				},
				select: {
					id: true,
					price: true,
					completedAt: true,
					createdAt: true,
				},
				orderBy: {
					completedAt: 'desc',
				},
				take: 10,
			})

			logger.debug('Завершенные задачи для отладки', {
				userId: currentUser.id,
				totalCompleted: allCompletedTasks.length,
				tasksWithPrice: allCompletedTasks.filter(t => t.price !== null).length,
				tasksInPeriod: allCompletedTasks.filter(t => 
					t.completedAt && new Date(t.completedAt) >= startDate
				).length,
				sampleTasks: allCompletedTasks.slice(0, 3).map(t => ({
					id: t.id,
					price: t.price,
					completedAt: t.completedAt?.toISOString(),
					createdAt: t.createdAt.toISOString(),
				})),
			})
		} catch (err) {
			logger.warn('Ошибка получения завершенных задач для отладки', { error: err })
		}

		// Среднее время выполнения
		let avgCompletionTime = 0
		try {
			const completedTasksWithDates = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
					status: 'completed',
					completedAt: useDateFilter 
						? { not: null, gte: startDate }
						: { not: null },
				},
				select: {
					createdAt: true,
					completedAt: true,
				},
			})

			avgCompletionTime =
				completedTasksWithDates.length > 0
					? completedTasksWithDates.reduce((sum, task) => {
							const duration =
								new Date(task.completedAt!).getTime() -
								new Date(task.createdAt).getTime()
							return sum + duration
						}, 0) / completedTasksWithDates.length
					: 0
		} catch (err) {
			logger.warn('Ошибка получения среднего времени выполнения', { error: err })
		}

		// Средний рейтинг исполнителей (отзывы за период)
		let avgExecutorRating = 0
		try {
			const executorRatings = await prisma.review.findMany({
				where: {
					task: {
						customerId: currentUser.id,
						...(useDateFilter ? { completedAt: { not: null, gte: startDate } } : {}),
					},
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
				select: {
					rating: true,
				},
			})

			avgExecutorRating =
				executorRatings.length > 0
					? executorRatings.reduce((sum, r) => sum + r.rating, 0) /
						executorRatings.length
					: 0
			
			// Если рейтинг за период = 0, используем общий рейтинг всех отзывов
			if (avgExecutorRating === 0 && useDateFilter) {
				const allExecutorRatings = await prisma.review.findMany({
					where: {
						task: {
							customerId: currentUser.id,
						},
					},
					select: {
						rating: true,
					},
				})
				
				if (allExecutorRatings.length > 0) {
					avgExecutorRating = allExecutorRatings.reduce((sum, r) => sum + r.rating, 0) / allExecutorRatings.length
				}
			}
		} catch (err) {
			logger.warn('Ошибка получения среднего рейтинга исполнителей', { error: err })
		}

		// Динамика по дням
		let dailyStats: Array<{
			date: Date
			tasks: number
			spent: number
			responses: number
		}> = []

		try {
			// Получаем задачи, созданные ИЛИ завершенные в период
			const allTasks = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
					...(useDateFilter ? {
						OR: [
							{ createdAt: { gte: startDate } },
							{ completedAt: { not: null, gte: startDate } }
						]
					} : {}),
				},
				select: {
					id: true,
					createdAt: true,
					completedAt: true,
					status: true,
					price: true,
					escrowAmount: true,
				},
			})

			// Группируем по дням
			const dailyMap = new Map<string, { tasks: number; spent: number; responses: number }>()
			
			// Получаем отклики для динамики
			const allResponses = await prisma.taskResponse.findMany({
				where: {
					task: {
						customerId: currentUser.id,
						...(useDateFilter ? {
							OR: [
								{ createdAt: { gte: startDate } },
								{ completedAt: { not: null, gte: startDate } }
							]
						} : {}),
					},
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
				select: {
					createdAt: true,
				},
			})

			// Получаем транзакции для завершенных задач
			const completedTaskIds = allTasks
				.filter(t => t.status === 'completed')
				.map(t => t.id)
			
			let paymentTransactionsMap = new Map<string, number>()
			if (completedTaskIds.length > 0) {
				try {
					const paymentTransactions = await prisma.transaction.findMany({
						where: {
							userId: currentUser.id,
							type: 'payment',
							amount: { lt: 0 },
							taskId: { in: completedTaskIds },
						},
						select: {
							taskId: true,
							amount: true,
							createdAt: true,
						},
					})
					
					paymentTransactions.forEach(t => {
						if (t.taskId) {
							paymentTransactionsMap.set(t.taskId, Math.abs(Number(t.amount)))
						}
					})
				} catch (err) {
					logger.warn('Ошибка получения транзакций для динамики', { error: err })
				}
			}
			
			// Фильтруем задачи по дате ПЕРЕД добавлением в dailyMap
			allTasks.forEach(task => {
				// Учитываем дату создания задачи только если она в периоде
				const createdDate = new Date(task.createdAt)
				if (createdDate >= startDate && createdDate <= endDate) {
					const createdDateKey = task.createdAt.toISOString().split('T')[0]
					const createdExisting = dailyMap.get(createdDateKey) || { tasks: 0, spent: 0, responses: 0 }
					createdExisting.tasks += 1
					dailyMap.set(createdDateKey, createdExisting)
				}
				
				// Если задача завершена, учитываем траты по дате завершения только если она в периоде
				if (task.status === 'completed' && task.completedAt) {
					const completedDate = new Date(task.completedAt)
					if (completedDate >= startDate && completedDate <= endDate) {
						const completedDateKey = task.completedAt.toISOString().split('T')[0]
						const completedExisting = dailyMap.get(completedDateKey) || { tasks: 0, spent: 0, responses: 0 }
						
						let taskPrice = Number(task.price || 0)
						
						// Если price = 0, используем escrowAmount
						if (taskPrice === 0) {
							taskPrice = Number(task.escrowAmount || 0)
						}
						
						// Если все еще 0, используем транзакции
						if (taskPrice === 0 && task.id) {
							taskPrice = paymentTransactionsMap.get(task.id) || 0
						}
						
						if (taskPrice > 0) {
							completedExisting.spent += taskPrice
						}
						dailyMap.set(completedDateKey, completedExisting)
					}
				}
			})

			// Фильтруем отклики по дате ПЕРЕД добавлением в dailyMap
			allResponses.forEach(response => {
				const responseDate = new Date(response.createdAt)
				if (responseDate >= startDate && responseDate <= endDate) {
					const dateKey = response.createdAt.toISOString().split('T')[0]
					const existing = dailyMap.get(dateKey) || { tasks: 0, spent: 0, responses: 0 }
					existing.responses += 1
					dailyMap.set(dateKey, existing)
				}
			})

			// Данные уже отфильтрованы при добавлении в dailyMap, просто преобразуем в массив
			const rawDailyStats = Array.from(dailyMap.entries())
				.map(([date, data]) => ({
					date: new Date(date),
					tasks: data.tasks,
					spent: data.spent,
					responses: data.responses,
				}))
				.sort((a, b) => a.date.getTime() - b.date.getTime())
			
			// Заполняем пропущенные дни нулями для коротких периодов (неделя, месяц)
			// Для квартала и года оставляем только дни с данными (группировка будет на клиенте)
			if (periodNum <= 30 && rawDailyStats.length > 0) {
				const filledStats: typeof rawDailyStats = []
				const currentDate = new Date(startDate)
				const lastDate = new Date(endDate)
				
				while (currentDate <= lastDate) {
					const dateKey = currentDate.toISOString().split('T')[0]
					const existing = rawDailyStats.find(s => s.date.toISOString().split('T')[0] === dateKey)
					
					if (existing) {
						filledStats.push(existing)
					} else {
						filledStats.push({
							date: new Date(currentDate),
							tasks: 0,
							spent: 0,
							responses: 0,
						})
					}
					
					currentDate.setDate(currentDate.getDate() + 1)
				}
				
				dailyStats = filledStats
			} else {
				// Для квартала и года возвращаем только дни с данными
				// Группировка по неделям/месяцам будет на клиенте
				dailyStats = rawDailyStats
			}
			
			logger.debug('Динамика по дням', {
				period: periodNum,
				totalDays: dailyStats.length,
				firstDate: dailyStats[0]?.date.toISOString(),
				lastDate: dailyStats[dailyStats.length - 1]?.date.toISOString(),
			})
		} catch (err) {
			logger.warn('Ошибка получения динамики по дням', { error: err })
		}

		// Статистика по категориям
		let categoryStats: Array<{
			subcategoryId: string | null
			_count: { id: number }
			_avg: { price: number | null }
		}> = []

		try {
			categoryStats = await prisma.task.groupBy({
				by: ['subcategoryId'],
				where: {
					customerId: currentUser.id,
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
				_count: { id: true },
				_avg: { price: true },
			})
		} catch (err) {
			logger.warn('Ошибка получения статистики по категориям', { error: err })
		}

		// Получаем названия подкатегорий и дополнительную статистику
		const subcategoryIds = categoryStats
			.map(s => s.subcategoryId)
			.filter(Boolean) as string[]
		
		let subcategories: Array<{
			id: string
			name: string
			category: { id: string; name: string }
		}> = []
		
		if (subcategoryIds.length > 0) {
			subcategories = await prisma.subcategory.findMany({
				where: { id: { in: subcategoryIds } },
				include: { category: true },
			})
		}

		// Дополнительная статистика по категориям
		const categoryStatsWithDetails = categoryStats.length > 0
			? await Promise.all(
				categoryStats.map(async stat => {
					try {
						const subcategory = subcategories.find(s => s.id === stat.subcategoryId)
						if (!subcategory) return null

					// Получаем задачи этой категории
					const categoryTasks = await prisma.task.findMany({
						where: {
							customerId: currentUser.id,
							subcategoryId: stat.subcategoryId,
							...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
						},
						select: {
							id: true,
							createdAt: true,
							completedAt: true,
							status: true,
							price: true,
							escrowAmount: true,
						},
					})
					
					// Получаем транзакции для завершенных задач этой категории
					const completedCategoryTaskIds = categoryTasks
						.filter(t => t.status === 'completed' && t.completedAt)
						.map(t => t.id)
					
					let categoryPaymentTransactionsMap = new Map<string, number>()
					if (completedCategoryTaskIds.length > 0) {
						try {
							const categoryPaymentTransactions = await prisma.transaction.findMany({
								where: {
									userId: currentUser.id,
									type: 'payment',
									amount: { lt: 0 },
									taskId: { in: completedCategoryTaskIds },
								},
								select: {
									taskId: true,
									amount: true,
								},
							})
							
							categoryPaymentTransactions.forEach(t => {
								if (t.taskId) {
									categoryPaymentTransactionsMap.set(t.taskId, Math.abs(Number(t.amount)))
								}
							})
						} catch (err) {
							// Игнорируем ошибки
						}
					}

					// Средний срок выполнения
					const completedCategoryTasks = categoryTasks.filter(
						t => t.status === 'completed' && t.completedAt
					)
					const avgCompletionTime =
						completedCategoryTasks.length > 0
							? completedCategoryTasks.reduce((sum, task) => {
									const duration =
										new Date(task.completedAt!).getTime() -
										new Date(task.createdAt).getTime()
									return sum + duration
								}, 0) / completedCategoryTasks.length
							: 0
					
					// Исправляем среднюю цену - используем транзакции если price = 0
					let avgPrice = Number(stat._avg.price || 0)
					if (avgPrice === 0 && completedCategoryTasks.length > 0) {
						const pricesWithTransactions = completedCategoryTasks.map(task => {
							let taskPrice = Number(task.price || 0)
							if (taskPrice === 0) {
								taskPrice = Number(task.escrowAmount || 0)
							}
							if (taskPrice === 0 && task.id) {
								taskPrice = categoryPaymentTransactionsMap.get(task.id) || 0
							}
							return taskPrice
						}).filter(p => p > 0)
						
						if (pricesWithTransactions.length > 0) {
							avgPrice = pricesWithTransactions.reduce((sum, p) => sum + p, 0) / pricesWithTransactions.length
						}
					}

					// Количество откликов
					const responsesCount = await prisma.taskResponse.count({
						where: {
							task: {
								customerId: currentUser.id,
								subcategoryId: stat.subcategoryId,
								...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
							},
						},
					})

					// Успешность (процент завершенных)
					const successRate =
						categoryTasks.length > 0
							? (completedCategoryTasks.length / categoryTasks.length) * 100
							: 0

					return {
						categoryName: subcategory.category.name,
						subcategoryName: subcategory.name,
						subcategoryId: stat.subcategoryId,
						taskCount: stat._count.id,
						avgPrice: avgPrice,
						avgCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60 * 24)), // в днях
						responsesCount,
						successRate: Math.round(successRate * 100) / 100,
					}
				} catch (err) {
					logger.warn('Ошибка получения статистики по категории', {
						subcategoryId: stat.subcategoryId,
						error: err,
					})
					return null
				}
			})
			)
			: []

		const categoryStatsWithNames = categoryStatsWithDetails.filter(Boolean) as Array<{
			categoryName: string
			subcategoryName: string
			subcategoryId: string
			taskCount: number
			avgPrice: number
			avgCompletionTime: number
			responsesCount: number
			successRate: number
		}>

		// Топ исполнителей
		let topExecutors: Array<{
			executorId: string | null
			_count: { id: number }
			_avg: { price: number | null }
		}> = []

		try {
			topExecutors = await prisma.task.groupBy({
				by: ['executorId'],
				where: {
					customerId: currentUser.id,
					executorId: { not: null },
					...(useDateFilter
						? {
								OR: [
									{ createdAt: { gte: startDate } },
									{
										status: 'completed',
										completedAt: { not: null, gte: startDate },
									},
								],
							}
						: {}),
				},
				_count: { id: true },
				_avg: { price: true },
			})
		} catch (err) {
			logger.warn('Ошибка получения топ исполнителей', { error: err })
		}

		const executorIds = topExecutors
			.map(e => e.executorId)
			.filter(Boolean) as string[]
		
		let executors: Array<{
			id: string
			fullName: string | null
			email: string
			avgRating: number | null
		}> = []
		
		if (executorIds.length > 0) {
			executors = await prisma.user.findMany({
				where: { id: { in: executorIds } },
				select: {
					id: true,
					fullName: true,
					email: true,
					avgRating: true,
				},
			})
		}

		// Дополнительная статистика по исполнителям
		const topExecutorsWithDetails = topExecutors.length > 0
			? await Promise.all(
				topExecutors.map(async stat => {
					try {
						const executor = executors.find(e => e.id === stat.executorId)
						if (!executor) return null

					// Получаем задачи исполнителя для расчета скорости
					const executorTasksForSpeed = await prisma.task.findMany({
						where: {
							customerId: currentUser.id,
							executorId: stat.executorId,
							...(useDateFilter
								? {
										OR: [
											{ createdAt: { gte: startDate } },
											{
												status: 'completed',
												completedAt: { not: null, gte: startDate },
											},
										],
									}
								: {}),
						},
						select: {
							createdAt: true,
							completedAt: true,
							status: true,
						},
					})

					// Средняя скорость выполнения
					const completedTasks = executorTasksForSpeed.filter(
						t => t.status === 'completed' && t.completedAt
					)
					const avgSpeed =
						completedTasks.length > 0
							? completedTasks.reduce((sum, task) => {
									const duration =
										new Date(task.completedAt!).getTime() -
										new Date(task.createdAt).getTime()
									return sum + duration
								}, 0) / completedTasks.length
							: 0

					// Получаем реальные цены для задач этого исполнителя
					const executorTasksForPrice = await prisma.task.findMany({
						where: {
							customerId: currentUser.id,
							executorId: stat.executorId,
							status: 'completed',
							completedAt: useDateFilter 
								? { not: null, gte: startDate }
								: { not: null },
						},
						select: {
							id: true,
							price: true,
							escrowAmount: true,
						},
					})
					
					// Получаем транзакции для этих задач
					const executorTaskIds = executorTasksForPrice.map(t => t.id)
					let executorPaymentTransactionsMap = new Map<string, number>()
					if (executorTaskIds.length > 0) {
						try {
							const executorPaymentTransactions = await prisma.transaction.findMany({
								where: {
									userId: currentUser.id,
									type: 'payment',
									amount: { lt: 0 },
									taskId: { in: executorTaskIds },
								},
								select: {
									taskId: true,
									amount: true,
								},
							})
							
							executorPaymentTransactions.forEach(t => {
								if (t.taskId) {
									executorPaymentTransactionsMap.set(t.taskId, Math.abs(Number(t.amount)))
								}
							})
						} catch (err) {
							// Игнорируем ошибки
						}
					}
					
					// Вычисляем реальную среднюю цену и общую сумму
					const executorPrices: number[] = []
					executorTasksForPrice.forEach(task => {
						let taskPrice = Number(task.price || 0)
						if (taskPrice === 0) {
							taskPrice = Number(task.escrowAmount || 0)
						}
						if (taskPrice === 0 && task.id) {
							taskPrice = executorPaymentTransactionsMap.get(task.id) || 0
						}
						if (taskPrice > 0) {
							executorPrices.push(taskPrice)
						}
					})
					
					const realAvgPrice = executorPrices.length > 0
						? executorPrices.reduce((sum, p) => sum + p, 0) / executorPrices.length
						: 0
					const realTotalSpent = executorPrices.reduce((sum, p) => sum + p, 0)
					
					// Получаем рейтинг исполнителя - если avgRating null или 0, вычисляем из отзывов
					let executorRating = Number(executor.avgRating || 0)
					if (executorRating === 0) {
						try {
							const executorReviews = await prisma.review.findMany({
								where: {
									toUserId: executor.id,
								},
								select: {
									rating: true,
								},
							})
							
							if (executorReviews.length > 0) {
								executorRating = executorReviews.reduce((sum, r) => sum + r.rating, 0) / executorReviews.length
							}
						} catch (err) {
							logger.warn('Ошибка получения рейтинга исполнителя из отзывов', {
								executorId: executor.id,
								error: err,
							})
						}
					}
					
					return {
						executorId: stat.executorId,
						executorName: executor.fullName || executor.email || 'Неизвестно',
						executorEmail: executor.email,
						executorRating: Math.round(executorRating * 10) / 10, // Округляем до 1 знака после запятой
						taskCount: stat._count.id,
						avgPrice: realAvgPrice,
						totalSpent: realTotalSpent,
						avgSpeed: Math.round(avgSpeed / (1000 * 60 * 60 * 24)), // в днях
					}
				} catch (err) {
					logger.warn('Ошибка получения статистики по исполнителю', {
						executorId: stat.executorId,
						error: err,
					})
					return null
				}
			})
			)
			: []

		const topExecutorsWithNames = topExecutorsWithDetails
			.filter(Boolean)
			.sort((a, b) => b!.taskCount - a!.taskCount)
			.slice(0, 5)

		// Финансовая аналитика - разбивка по категориям
		const financialByCategory = subcategoryIds.length > 0
			? await Promise.all(
				subcategoryIds.map(async subcategoryId => {
					try {
						const subcategory = subcategories.find(s => s.id === subcategoryId)
						if (!subcategory) return null

						const categorySpent = await prisma.task.aggregate({
							where: {
								customerId: currentUser.id,
								subcategoryId,
								status: 'completed',
								completedAt: useDateFilter 
									? { not: null, gte: startDate }
									: { not: null },
							},
							_sum: { price: true, escrowAmount: true },
							_avg: { price: true },
						})
						
						// Используем price, если есть, иначе escrowAmount
						let totalSpent = Number(categorySpent._sum.price || 0)
						if (totalSpent === 0) {
							totalSpent = Number(categorySpent._sum.escrowAmount || 0)
						}
						
						// Получаем количество задач для расчета средней цены
						const categoryTaskCount = await prisma.task.count({
							where: {
								customerId: currentUser.id,
								subcategoryId,
								status: 'completed',
								completedAt: useDateFilter 
									? { not: null, gte: startDate }
									: { not: null },
							},
						})
						
						// Если все еще 0, пытаемся получить из транзакций
						if (totalSpent === 0) {
							try {
								const categoryTaskIds = await prisma.task.findMany({
									where: {
										customerId: currentUser.id,
										subcategoryId,
										status: 'completed',
										completedAt: useDateFilter 
											? { not: null, gte: startDate }
											: { not: null },
									},
									select: { id: true },
								})
								
								if (categoryTaskIds.length > 0) {
									const taskIds = categoryTaskIds.map(t => t.id)
									const transactions = await prisma.transaction.aggregate({
										where: {
											userId: currentUser.id,
											type: 'payment',
											amount: { lt: 0 },
											taskId: { in: taskIds },
										},
										_sum: { amount: true },
									})
									
									totalSpent = Math.abs(Number(transactions._sum.amount || 0))
								}
							} catch (err) {
								// Игнорируем ошибки
							}
						}

						return {
							categoryName: subcategory.category.name,
							subcategoryName: subcategory.name,
							totalSpent: totalSpent,
							avgPrice: Number(categorySpent._avg.price || 0) || (totalSpent > 0 && categoryTaskCount > 0 ? totalSpent / categoryTaskCount : 0),
						}
					} catch (err) {
						logger.warn('Ошибка получения финансовой статистики по категории', {
							subcategoryId,
							error: err,
						})
						return null
					}
				})
			)
			: []

		const financialByCategoryFiltered = financialByCategory.filter(
			Boolean
		) as Array<{
			categoryName: string
			subcategoryName: string
			totalSpent: number
			avgPrice: number
		}>

		// KPI по месяцам (рост/падение)
		let monthlyKPIsWithGrowth: Array<{
			month: string
			tasks: number
			spent: number
			tasksGrowth: number
			spentGrowth: number
		}> = []

		try {
			const monthlyKPIs = await prisma.task.findMany({
				where: {
					customerId: currentUser.id,
					...(useDateFilter ? { createdAt: { gte: startDate } } : {}),
				},
				select: {
					id: true,
					createdAt: true,
					status: true,
					price: true,
					escrowAmount: true,
					completedAt: true,
				},
			})

			const monthlyMap = new Map<string, { tasks: number; spent: number }>()
			
			// Получаем все транзакции платежей для завершенных задач
			const completedTaskIds = monthlyKPIs
				.filter(t => t.status === 'completed' && t.completedAt)
				.map(t => t.id)
			
			let paymentTransactionsMap = new Map<string, number>()
			if (completedTaskIds.length > 0) {
				try {
					const paymentTransactions = await prisma.transaction.findMany({
						where: {
							userId: currentUser.id,
							type: 'payment',
							amount: { lt: 0 },
							taskId: { in: completedTaskIds },
						},
						select: {
							taskId: true,
							amount: true,
						},
					})
					
					paymentTransactions.forEach(t => {
						if (t.taskId) {
							paymentTransactionsMap.set(t.taskId, Math.abs(Number(t.amount)))
						}
					})
				} catch (err) {
					logger.warn('Ошибка получения транзакций для KPI', { error: err })
				}
			}
			
			monthlyKPIs.forEach(task => {
				const monthKey = task.createdAt.toISOString().substring(0, 7) // YYYY-MM
				const existing = monthlyMap.get(monthKey) || { tasks: 0, spent: 0 }
				existing.tasks += 1
				
				if (task.status === 'completed') {
					let taskPrice = Number(task.price || 0)
					
					// Если price = 0, используем escrowAmount
					if (taskPrice === 0) {
						taskPrice = Number(task.escrowAmount || 0)
					}
					
					// Если все еще 0, используем транзакции
					if (taskPrice === 0 && task.id) {
						taskPrice = paymentTransactionsMap.get(task.id) || 0
					}
					
					if (taskPrice > 0) {
						existing.spent += taskPrice
					}
				}
				monthlyMap.set(monthKey, existing)
			})

			const monthlyStats = Array.from(monthlyMap.entries())
				.map(([month, data]) => ({
					month,
					tasks: data.tasks,
					spent: data.spent,
				}))
				.sort((a, b) => a.month.localeCompare(b.month))

			// Вычисляем рост/падение
			monthlyKPIsWithGrowth = monthlyStats.map((stat, index) => {
				const prevStat = index > 0 ? monthlyStats[index - 1] : null
				const tasksGrowth =
					prevStat && prevStat.tasks > 0
						? ((stat.tasks - prevStat.tasks) / prevStat.tasks) * 100
						: 0
				const spentGrowth =
					prevStat && prevStat.spent > 0
						? ((stat.spent - prevStat.spent) / prevStat.spent) * 100
						: 0

				return {
					...stat,
					tasksGrowth: Math.round(tasksGrowth * 100) / 100,
					spentGrowth: Math.round(spentGrowth * 100) / 100,
				}
			})
		} catch (err) {
			logger.warn('Ошибка получения KPI по месяцам', { error: err })
		}

		logger.debug('Аналитика дашборда успешно получена', {
			userId: currentUser.id,
			dailyStatsCount: dailyStats.length,
			categoryStatsCount: categoryStatsWithNames.length,
			topExecutorsCount: topExecutorsWithNames.length,
		})

		return NextResponse.json({
			period: periodNum,
			metrics: {
				totalTasks,
				completedTasks,
				inProgressTasks,
				openTasks,
				totalSpent: Number(totalSpent._sum.price || 0),
				totalResponses,
				hiredExecutors,
				conversionRate: Math.round(conversionRate * 100) / 100,
				avgPrice: Number(avgPriceResult._avg.price || 0),
				avgCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60 * 24)), // в днях
				avgExecutorRating: Math.round(avgExecutorRating * 100) / 100,
			},
			dailyStats: dailyStats.map(d => ({
				date: d.date.toISOString().split('T')[0],
				tasks: d.tasks,
				spent: d.spent,
				responses: d.responses,
			})),
			categoryStats: categoryStatsWithNames,
			topExecutors: topExecutorsWithNames,
			financialByCategory: financialByCategoryFiltered,
			monthlyKPIs: monthlyKPIsWithGrowth,
		})
	} catch (error: any) {
		const errorDetails = {
			errorMessage: error?.message,
			errorStack: error?.stack?.substring(0, 500),
			errorName: error?.name,
			userId: user ? user.id : 'unknown',
		}

		logger.error('Ошибка получения аналитики дашборда', error, errorDetails)

		// Более детальное сообщение об ошибке для отладки
		const errorMessage = error?.message || 'Ошибка сервера'
		return NextResponse.json(
			{
				error: 'Ошибка сервера',
				details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
				...(process.env.NODE_ENV === 'development' && {
					stack: error?.stack?.substring(0, 200),
				}),
			},
			{ status: 500 }
		)
	}
}
