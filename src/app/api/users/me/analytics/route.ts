import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

type RawChartPoint = { period: string; total: unknown; count: unknown }
type ChartPoint = { period: string; total: number; count: number }

function generatePeriodLabels(period: string): string[] {
  const now = new Date()

  switch (period) {
    case 'day': {
      const labels: string[] = []
      const end = new Date(now)
      end.setMinutes(0, 0, 0)

      for (let i = 23; i >= 0; i--) {
        const point = new Date(end)
        point.setHours(end.getHours() - i)
        const hours = point.getHours().toString().padStart(2, '0')
        labels.push(`${hours}:00`)
      }

      return labels
    }

    case 'week':
    case 'month': {
      const labels: string[] = []
      const days = period === 'week' ? 7 : 30
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      for (let i = days - 1; i >= 0; i--) {
        const point = new Date(startOfDay)
        point.setDate(startOfDay.getDate() - i)
        const year = point.getFullYear()
        const month = (point.getMonth() + 1).toString().padStart(2, '0')
        const day = point.getDate().toString().padStart(2, '0')
        labels.push(`${year}-${month}-${day}`)
      }

      return labels
    }

    case 'year': {
      const labels: string[] = []
      const base = new Date(now.getFullYear(), now.getMonth(), 1)

      for (let i = 11; i >= 0; i--) {
        const point = new Date(base.getFullYear(), base.getMonth() - i, 1)
        const year = point.getFullYear()
        const month = (point.getMonth() + 1).toString().padStart(2, '0')
        labels.push(`${year}-${month}`)
      }

      return labels
    }

    default:
      return []
  }
}

function fillMissingPeriods(rawData: RawChartPoint[], period: string): ChartPoint[] {
  const labels = generatePeriodLabels(period)
  const dataMap = new Map<string, ChartPoint>()

  rawData.forEach((item) => {
    const totalValue = Number(item.total ?? 0)
    const countValue = Number(item.count ?? 0)

    dataMap.set(item.period, {
      period: item.period,
      total: Number.isFinite(totalValue) ? totalValue : 0,
      count: Number.isFinite(countValue) ? countValue : 0,
    })
  })

  if (labels.length === 0) {
    return Array.from(dataMap.values()).sort((a, b) => a.period.localeCompare(b.period))
  }

  return labels.map((label) => dataMap.get(label) ?? { period: label, total: 0, count: 0 })
}

/**
 * GET /api/users/me/analytics
 * Получить персональную аналитику пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    
    // Получаем период из query параметров (day, week, month, year)
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    
    // Определяем интервал для SQL запросов и дату начала периода
    let interval = '30 days'
    let dateFormat = 'YYYY-MM-DD'
    let groupBy = 'day'
    const startDate = new Date()
    
    switch(period) {
      case 'day':
        interval = '24 hours'
        dateFormat = 'HH24:00'
        groupBy = 'hour'
        startDate.setHours(startDate.getHours() - 24)
        break
      case 'week':
        interval = '7 days'
        dateFormat = 'YYYY-MM-DD'
        groupBy = 'day'
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        interval = '30 days'
        dateFormat = 'YYYY-MM-DD'
        groupBy = 'day'
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'year':
        interval = '12 months'
        dateFormat = 'YYYY-MM'
        groupBy = 'month'
        startDate.setMonth(startDate.getMonth() - 12)
        break
    }
    
    startDate.setHours(0, 0, 0, 0)

    const intervalFragment = Prisma.raw(`INTERVAL '${interval}'`)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        avgRating: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Базовая статистика
    const baseStats = {
      userId: user.id,
      role: user.role,
      createdAt: user.createdAt,
    }

    // Аналитика для заказчиков
    if (user.role === 'customer') {
      const [
        tasksCreated,
        tasksInProgress,
        tasksCompleted,
        tasksCancelled,
        totalSpent,
        avgTaskPrice,
        topExecutors,
        spendingRaw,
        ratingAggregate,
      ] = await Promise.all([
        // Всего задач создано
        prisma.task.count({
          where: { customerId: user.id },
        }),

        // Задач в работе
        prisma.task.count({
          where: { customerId: user.id, status: 'in_progress' },
        }),

        // Завершенных задач
        prisma.task.count({
          where: { customerId: user.id, status: 'completed' },
        }),

        // Отмененных задач
        prisma.task.count({
          where: { customerId: user.id, status: 'cancelled' },
        }),

        // Всего потрачено
        prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'payment',
          },
          _sum: {
            amount: true,
          },
        }),

        // Средняя цена задачи
        prisma.task.aggregate({
          where: {
            customerId: user.id,
            price: { not: null },
          },
          _avg: {
            price: true,
          },
        }),

        // Топ исполнители
        prisma.task.groupBy({
          by: ['executorId'],
          where: {
            customerId: user.id,
            executorId: { not: null },
            status: 'completed',
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        }),

        // График трат за выбранный период
        (async () => {
          try {
            return await prisma.$queryRawUnsafe(`
              SELECT 
                TO_CHAR(DATE_TRUNC('${groupBy}', "createdAt"), '${dateFormat}') as period,
                SUM(CAST(amount AS NUMERIC)) as total,
                COUNT(*)::int as count
              FROM "Transaction"
              WHERE "userId" = '${user.id}'
                AND type = 'payment'
                AND "createdAt" >= NOW() - INTERVAL '${interval}'
              GROUP BY period
              ORDER BY period
            `) as Array<RawChartPoint>
          } catch (err) {
            logger.warn('Ошибка получения графика трат', { error: err })
            return [] as Array<RawChartPoint>
          }
        })(),

        // Средний рейтинг по отзывам (за период)
        prisma.review.aggregate({
          where: { 
            toUserId: user.id,
            createdAt: { gte: startDate },
          },
          _avg: { rating: true },
        }),
      ])

      // Получаем информацию о топ исполнителях
      const executorIds = topExecutors
        .map((t: any) => t.executorId)
        .filter(Boolean)
      
      const executors = await prisma.user.findMany({
        where: { id: { in: executorIds } },
        select: {
          id: true,
          fullName: true,
          avgRating: true,
        },
      })

      const topExecutorsWithInfo = topExecutors.map((t: any) => {
        const executor = executors.find((e) => e.id === t.executorId)
        return {
          executor,
          tasksCount: t._count.id,
        }
      })

      const chartData = fillMissingPeriods(spendingRaw, period)
      const avgRatingValue = Number(ratingAggregate._avg?.rating ?? 0)

      return NextResponse.json({
        ...baseStats,
        completedTasksCount: tasksCompleted,
        avgRating: avgRatingValue,
        type: 'customer',
        period,
        stats: {
          tasksCreated,
          tasksInProgress,
          tasksCompleted,
          tasksCancelled,
          totalSpent: Math.abs(Number(totalSpent._sum.amount || 0)),
          avgTaskPrice: Number(avgTaskPrice._avg.price || 0),
          topExecutors: topExecutorsWithInfo,
          chartData,
        },
      })
    }

    // Аналитика для исполнителей
    if (user.role === 'executor') {
      let tasksExecuted = 0
      let tasksInProgress = 0
      let tasksCompleted = 0
      let totalEarned = { _sum: { amount: null } }
      let avgTaskPrice = { _avg: { price: null } }
      let responseRate = 0
      let topCustomers: any[] = []
      let earningsRaw: Array<RawChartPoint> = []
      let avgCompletionTime: Array<{ avg_hours: number }> = [{ avg_hours: 0 }]
      let ratingAggregate = { _avg: { rating: null } }

      try {
        const results = await Promise.all([
        // Всего задач взято в работу (за период)
        prisma.task.count({
          where: { 
            executorId: user.id,
            createdAt: { gte: startDate },
          },
        }),

        // Задач в работе сейчас (за период)
        prisma.task.count({
          where: { 
            executorId: user.id, 
            status: 'in_progress',
            createdAt: { gte: startDate },
          },
        }),

        // Завершенных задач (завершены в период)
        prisma.task.count({
          where: { 
            executorId: user.id, 
            status: 'completed',
            completedAt: { not: null, gte: startDate },
          },
        }),

        // Всего заработано (за период)
        prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'earn',
            createdAt: { gte: startDate },
          },
          _sum: {
            amount: true,
          },
        }),

        // Средняя цена задачи (завершены в период)
        prisma.task.aggregate({
          where: {
            executorId: user.id,
            price: { not: null },
            status: 'completed',
            completedAt: { not: null, gte: startDate },
          },
          _avg: {
            price: true,
          },
        }),

        // Конверсия откликов (за период)
        (async () => {
          const responses = await prisma.taskResponse.count({
            where: { 
              userId: user.id,
              createdAt: { gte: startDate },
            },
          })
          const accepted = await prisma.task.count({
            where: { 
              executorId: user.id,
              createdAt: { gte: startDate },
            },
          })
          return responses > 0 ? (accepted / responses) * 100 : 0
        })(),

        // Топ заказчики (завершены в период)
        prisma.task.groupBy({
          by: ['customerId'],
          where: {
            executorId: user.id,
            status: 'completed',
            completedAt: { not: null, gte: startDate },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        }),

        // График заработка за выбранный период
        (async () => {
          try {
            return await prisma.$queryRawUnsafe(`
              SELECT 
                TO_CHAR(DATE_TRUNC('${groupBy}', "createdAt"), '${dateFormat}') as period,
                SUM(CAST(amount AS NUMERIC)) as total,
                COUNT(*)::int as count
              FROM "Transaction"
              WHERE "userId" = '${user.id}'
                AND type = 'earn'
                AND "createdAt" >= NOW() - INTERVAL '${interval}'
              GROUP BY period
              ORDER BY period
            `) as Array<RawChartPoint>
          } catch (err) {
            logger.warn('Ошибка получения графика заработка', { error: err })
            return [] as Array<RawChartPoint>
          }
        })(),

        // Среднее время выполнения задачи (завершены в период)
        (async () => {
          try {
            return await prisma.$queryRawUnsafe<Array<{ avg_hours: number }>>(`
              SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600)::numeric as avg_hours
              FROM "Task"
              WHERE "executorId" = '${user.id}'
                AND status = 'completed'
                AND "completedAt" IS NOT NULL
                AND "completedAt" >= '${startDate.toISOString()}'
            `)
          } catch (err) {
            logger.warn('Ошибка получения среднего времени выполнения', { error: err })
            return [{ avg_hours: 0 }] as Array<{ avg_hours: number }>
          }
        })(),

        // Средний рейтинг по отзывам (за период)
        prisma.review.aggregate({
          where: { 
            toUserId: user.id,
            createdAt: { gte: startDate },
          },
          _avg: { rating: true },
        }),
        ])
        
        // Распаковываем результаты
        tasksExecuted = results[0] as number
        tasksInProgress = results[1] as number
        tasksCompleted = results[2] as number
        totalEarned = results[3] as { _sum: { amount: null | number } }
        avgTaskPrice = results[4] as { _avg: { price: null | number } }
        responseRate = results[5] as number
        topCustomers = results[6] as any[]
        earningsRaw = (results[7] || []) as Array<RawChartPoint>
        avgCompletionTime = (results[8] || [{ avg_hours: 0 }]) as Array<{ avg_hours: number }>
        ratingAggregate = results[9] as { _avg: { rating: null | number } }
      } catch (promiseError: any) {
        logger.error('Ошибка в Promise.all для аналитики исполнителя', promiseError, {
          userId: user.id,
          errorMessage: promiseError?.message,
          errorStack: promiseError?.stack?.substring(0, 500),
        })
        // Продолжаем с дефолтными значениями
      }

      // Получаем информацию о топ заказчиках
      let topCustomersWithInfo: Array<{
        customer: { id: string; fullName: string | null; avgRating: number | null } | null
        tasksCount: number
      }> = []
      
      try {
        const customerIds = topCustomers.map((t: any) => t.customerId).filter(Boolean)
        
        if (customerIds.length > 0) {
          const customers = await prisma.user.findMany({
            where: { id: { in: customerIds } },
            select: {
              id: true,
              fullName: true,
              avgRating: true,
            },
          })

          topCustomersWithInfo = topCustomers.map((t: any) => {
            const customer = customers.find((c) => c.id === t.customerId)
            return {
              customer: customer || null,
              tasksCount: t._count.id,
            }
          })
        }
      } catch (err) {
        logger.warn('Ошибка получения информации о топ заказчиках', { error: err })
        // Продолжаем с пустым массивом
      }

      // Обрабатываем earningsRaw - результат Promise.all уже разрешен
      // earningsRaw - это результат асинхронной функции, который уже разрешен в Promise.all
      const earningsData = (earningsRaw || []) as Array<RawChartPoint>
      const chartData = fillMissingPeriods(earningsData, period)
      
      // Если рейтинг за период = 0 или null, используем общий рейтинг из всех отзывов
      let avgRatingValue = Number(ratingAggregate._avg?.rating ?? 0)
      if (avgRatingValue === 0 || !ratingAggregate._avg?.rating) {
        try {
          // Получаем общий рейтинг из всех отзывов
          const allRatingAggregate = await prisma.review.aggregate({
            where: { 
              toUserId: user.id,
            },
            _avg: { rating: true },
          })
          
          avgRatingValue = Number(allRatingAggregate._avg?.rating ?? 0)
          
          // Если все еще 0, используем рейтинг из профиля пользователя
          if (avgRatingValue === 0 && user.avgRating) {
            avgRatingValue = Number(user.avgRating)
          }
        } catch (err) {
          logger.warn('Ошибка получения общего рейтинга', { error: err })
          // Используем рейтинг из профиля пользователя как fallback
          if (user.avgRating) {
            avgRatingValue = Number(user.avgRating)
          }
        }
      }
      
      const totalEarnedValue = Number(totalEarned._sum.amount || 0)
      
      // Обрабатываем avgCompletionTime - результат Promise.all уже разрешен
      // avgCompletionTime - это результат асинхронной функции, который уже разрешен в Promise.all
      const completionTimeData = (avgCompletionTime || [{ avg_hours: 0 }]) as Array<{ avg_hours: number }>
      const avgCompletionHours = Math.round(Number(completionTimeData[0]?.avg_hours || 0) * 10) / 10
      
      const responseRateValue = Math.round(responseRate * 100) / 100

      return NextResponse.json({
        ...baseStats,
        completedTasksCount: tasksCompleted,
        avgRating: avgRatingValue,
        type: 'executor',
        period,
        stats: {
          tasksExecuted,
          tasksInProgress,
          tasksCompleted,
          totalEarned: totalEarnedValue,
          avgTaskPrice: Number(avgTaskPrice._avg.price || 0),
          responseRate: responseRateValue,
          avgCompletionTime: avgCompletionHours,
          topCustomers: topCustomersWithInfo,
          chartData,
        },
      })
    }

    // Для обычных пользователей
    const [completedTasksCount, ratingAggregate] = await Promise.all([
      prisma.task.count({
        where: { executorId: user.id, status: 'completed' },
      }),
      prisma.review.aggregate({
        where: { toUserId: user.id },
        _avg: { rating: true },
      }),
    ])

    return NextResponse.json({
      ...baseStats,
      completedTasksCount,
      avgRating: Number(ratingAggregate._avg?.rating ?? 0),
      type: 'user',
      period,
      stats: {},
    })
  } catch (err: any) {
    logger.error('Ошибка получения аналитики', err)
    const errorMessage = err?.message || 'Ошибка получения аналитики'
    const errorStack = err?.stack?.substring(0, 500)
    
    logger.error('Детали ошибки аналитики', {
      message: errorMessage,
      stack: errorStack,
      name: err?.name,
    })
    
    return NextResponse.json(
      { 
        error: 'Ошибка получения аналитики',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    )
  }
}

