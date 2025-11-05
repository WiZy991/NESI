import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Получаем статистику пользователя
    const [completedTasksAsExecutor, completedTasksAsCustomer, createdTasks, certifications, reviewsReceived, reviewsGiven, transactions, earnedBadges, allBadgesForRole] = await Promise.all([
      prisma.task.count({
        where: { executorId: user.id, status: 'completed' }
      }),
      prisma.task.count({
        where: { customerId: user.id, status: 'completed' }
      }),
      prisma.task.count({
        where: { customerId: user.id }
      }),
      prisma.userCertification.findMany({
        where: { userId: user.id },
        select: { id: true }
      }),
      prisma.review.findMany({
        where: { toUserId: user.id },
        select: { rating: true }
      }),
      prisma.review.findMany({
        where: { fromUserId: user.id },
        select: { id: true }
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        select: { amount: true, type: true, createdAt: true }
      }),
      prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true }
      }),
      prisma.badge.findMany({
        where: {
          OR: [
            { targetRole: null },
            { targetRole: user.role }
          ]
        }
      })
    ])

    const paymentTransactions = transactions.filter(t => 
      t.type === 'payment' || (t.type && t.type.toLowerCase().includes('payment'))
    )
    const paidTasks = paymentTransactions.length
    const totalSpent = paymentTransactions.reduce((sum, t) => sum + (t.amount ? Number(t.amount) : 0), 0)

    const uniqueExecutorsResult = await prisma.task.findMany({
      where: {
        customerId: user.id,
        executorId: { not: null }
      },
      select: {
        executorId: true
      },
      distinct: ['executorId']
    })

    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const monthlyActiveTasks = await prisma.task.count({
      where: {
        customerId: user.id,
        status: 'completed',
        completedAt: {
          gte: threeMonthsAgo
        }
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      },
      stats: {
        completedTasksAsExecutor,
        completedTasksAsCustomer,
        createdTasks,
        completedTasks: user.role === 'customer' ? completedTasksAsCustomer : completedTasksAsExecutor,
        paidTasks,
        totalSpent,
        reviewsGiven: reviewsGiven.length,
        monthlyActive: monthlyActiveTasks > 0 ? 1 : 0,
        uniqueExecutors: uniqueExecutorsResult.length,
        passedTests: certifications.length,
        avgRating: reviewsReceived.length > 0
          ? reviewsReceived.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsReceived.length
          : 0,
        positiveReviews: reviewsReceived.filter(r => (r.rating || 0) >= 4).length,
        totalXP: user.xp || 0
      },
      badges: {
        earned: earnedBadges.map(ub => ({
          id: ub.badge.id,
          name: ub.badge.name,
          targetRole: ub.badge.targetRole,
          earnedAt: ub.earnedAt
        })),
        available: allBadgesForRole.map(b => ({
          id: b.id,
          name: b.name,
          targetRole: b.targetRole,
          condition: b.condition
        }))
      }
    })
  } catch (error) {
    console.error('[Badges Debug] Ошибка:', error)
    return NextResponse.json({ error: 'Ошибка сервера', details: String(error) }, { status: 500 })
  }
}

