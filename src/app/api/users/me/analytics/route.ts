import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
    
    // Определяем интервал для SQL запросов
    let interval = '30 days'
    let dateFormat = 'YYYY-MM-DD'
    let groupBy = 'day'
    
    switch(period) {
      case 'day':
        interval = '24 hours'
        dateFormat = 'HH24:00'
        groupBy = 'hour'
        break
      case 'week':
        interval = '7 days'
        dateFormat = 'YYYY-MM-DD'
        groupBy = 'day'
        break
      case 'month':
        interval = '30 days'
        dateFormat = 'YYYY-MM-DD'
        groupBy = 'day'
        break
      case 'year':
        interval = '12 months'
        dateFormat = 'YYYY-MM'
        groupBy = 'month'
        break
    }

    const intervalFragment = Prisma.raw(`INTERVAL '${interval}'`)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        createdAt: true,
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
        prisma.$queryRaw`
          SELECT 
            TO_CHAR(DATE_TRUNC(${groupBy}::text, "createdAt"), ${dateFormat}) as period,
            SUM(CAST(amount AS NUMERIC)) as total,
            COUNT(*)::int as count
          FROM "Transaction"
          WHERE "userId" = ${user.id}
            AND type = 'payment'
            AND "createdAt" >= NOW() - ${intervalFragment}
          GROUP BY period
          ORDER BY period
        ` as Array<RawChartPoint>,

        // Средний рейтинг по отзывам
        prisma.review.aggregate({
          where: { toUserId: user.id },
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
      const [
        tasksExecuted,
        tasksInProgress,
        tasksCompleted,
        totalEarned,
        avgTaskPrice,
        responseRate,
        topCustomers,
        earningsRaw,
        avgCompletionTime,
        ratingAggregate,
      ] = await Promise.all([
        // Всего задач взято в работу
        prisma.task.count({
          where: { executorId: user.id },
        }),

        // Задач в работе сейчас
        prisma.task.count({
          where: { executorId: user.id, status: 'in_progress' },
        }),

        // Завершенных задач
        prisma.task.count({
          where: { executorId: user.id, status: 'completed' },
        }),

        // Всего заработано
        prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'earn',
          },
          _sum: {
            amount: true,
          },
        }),

        // Средняя цена задачи
        prisma.task.aggregate({
          where: {
            executorId: user.id,
            price: { not: null },
            status: 'completed',
          },
          _avg: {
            price: true,
          },
        }),

        // Конверсия откликов
        (async () => {
          const responses = await prisma.taskResponse.count({
            where: { userId: user.id },
          })
          const accepted = await prisma.task.count({
            where: { executorId: user.id },
          })
          return responses > 0 ? (accepted / responses) * 100 : 0
        })(),

        // Топ заказчики
        prisma.task.groupBy({
          by: ['customerId'],
          where: {
            executorId: user.id,
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

        // График заработка за выбранный период
        prisma.$queryRaw`
          SELECT 
            TO_CHAR(DATE_TRUNC(${groupBy}::text, "createdAt"), ${dateFormat}) as period,
            SUM(CAST(amount AS NUMERIC)) as total,
            COUNT(*)::int as count
          FROM "Transaction"
          WHERE "userId" = ${user.id}
            AND type = 'earn'
            AND "createdAt" >= NOW() - ${intervalFragment}
          GROUP BY period
          ORDER BY period
        ` as Array<RawChartPoint>,

        // Среднее время выполнения задачи
        prisma.$queryRaw<
          Array<{ avg_hours: number }>
        >`
          SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600)::numeric as avg_hours
          FROM "Task"
          WHERE "executorId" = ${user.id}
            AND status = 'completed'
            AND "completedAt" IS NOT NULL
        `,

        // Средний рейтинг по отзывам
        prisma.review.aggregate({
          where: { toUserId: user.id },
          _avg: { rating: true },
        }),
      ])

      // Получаем информацию о топ заказчиках
      const customerIds = topCustomers.map((t: any) => t.customerId)
      
      const customers = await prisma.user.findMany({
        where: { id: { in: customerIds } },
        select: {
          id: true,
          fullName: true,
          avgRating: true,
        },
      })

      const topCustomersWithInfo = topCustomers.map((t: any) => {
        const customer = customers.find((c) => c.id === t.customerId)
        return {
          customer,
          tasksCount: t._count.id,
        }
      })

      const chartData = fillMissingPeriods(earningsRaw, period)
      const avgRatingValue = Number(ratingAggregate._avg?.rating ?? 0)
      const totalEarnedValue = Number(totalEarned._sum.amount || 0)
      const avgCompletionHours = Math.round(Number(avgCompletionTime[0]?.avg_hours || 0) * 10) / 10
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
  } catch (err) {
    console.error('❌ Ошибка получения аналитики:', err)
    return NextResponse.json(
      { error: 'Ошибка получения аналитики' },
      { status: 500 }
    )
  }
}

