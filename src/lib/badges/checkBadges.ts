import prisma from '@/lib/prisma'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'

export interface BadgeCondition {
  type: 'completedTasks' | 'passedTests' | 'avgRating' | 'positiveReviews' | 'totalXP' | 'level' | 'createdTasks' | 'paidTasks' | 'totalSpent' | 'reviewsGiven' | 'monthlyActive' | 'uniqueExecutors'
  operator: 'gte' | 'eq' | 'lte'
  value: number
}

/**
 * Проверяет и присваивает бейджи пользователю
 * @returns Массив полученных бейджей
 */
export async function checkAndAwardBadges(userId: string): Promise<Array<{ id: string; name: string; icon: string }>> {
  const awardedBadges: Array<{ id: string; name: string; icon: string }> = []
  try {
    // Получаем пользователя со всей статистикой
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: { badge: true }
        },
        level: {
          select: { slug: true }
        }
      }
    })

    if (!user) {
      console.warn(`[Badges] Пользователь ${userId} не найден`)
      return []
    }

    // Получаем статистику отдельными запросами
    const [completedTasksAsExecutor, completedTasksAsCustomer, createdTasks, certifications, reviewsReceived, reviewsGiven, transactions] = await Promise.all([
      // Для исполнителя - выполненные задачи
      prisma.task.count({
        where: { executorId: userId, status: 'completed' }
      }),
      // Для заказчика - завершенные задачи
      prisma.task.count({
        where: { customerId: userId, status: 'completed' }
      }),
      // Для заказчика - созданные задачи
      prisma.task.count({
        where: { customerId: userId }
      }),
      // Сертификации (только для исполнителей)
      prisma.userCertification.findMany({
        where: { userId },
        select: { id: true }
      }),
      // Полученные отзывы (только для исполнителей)
      prisma.review.findMany({
        where: { toUserId: userId },
        select: { rating: true }
      }),
      // Оставленные отзывы (для заказчиков)
      prisma.review.findMany({
        where: { fromUserId: userId },
        select: { id: true }
      }),
      // Транзакции для расчета потраченных средств (для заказчиков)
      prisma.transaction.findMany({
        where: {
          userId: userId
        },
        select: {
          amount: true,
          type: true,
          createdAt: true
        }
      })
    ])

    // Получаем все бейджи из БД, фильтруя по роли пользователя
    const allBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { targetRole: null }, // Достижения для всех ролей
          { targetRole: user.role } // Достижения для конкретной роли
        ]
      }
    })
    
    console.log(`[Badges] Найдено бейджей в БД:`, allBadges.map(b => ({ id: b.id, name: b.name, targetRole: b.targetRole })))
    const earnedBadgeIds = user.badges.map(b => b.badgeId)

    // Статистика пользователя
    const passedTests = certifications.length
    const avgRating = reviewsReceived.length > 0
      ? reviewsReceived.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsReceived.length
      : 0
    const positiveReviews = reviewsReceived.filter(r => (r.rating || 0) >= 4).length
    const totalXP = user.xp || 0
    const levelNumber = user.level?.slug ? parseInt(user.level.slug) || 0 : 0
    
    // Статистика для заказчиков
    const completedTasks = user.role === 'customer' ? completedTasksAsCustomer : completedTasksAsExecutor
    // Платежи заказчика (транзакции типа payment или связанные с задачами)
    const paymentTransactions = transactions.filter(t => 
      t.type === 'payment' || (t.type && t.type.toLowerCase().includes('payment'))
    )
    const paidTasks = paymentTransactions.length
    const totalSpent = paymentTransactions.reduce((sum, t) => sum + (t.amount ? Number(t.amount) : 0), 0)
    const reviewsGivenCount = reviewsGiven.length
    
    // Уникальные исполнители (для заказчиков)
    const uniqueExecutorsResult = await prisma.task.findMany({
      where: {
        customerId: userId,
        executorId: { not: null }
      },
      select: {
        executorId: true
      },
      distinct: ['executorId']
    })
    const uniqueExecutors = uniqueExecutorsResult.length
    
    // Активность по месяцам (для заказчиков)
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const monthlyActiveTasks = await prisma.task.count({
      where: {
        customerId: userId,
        status: 'completed',
        completedAt: {
          gte: threeMonthsAgo
        }
      }
    })
    const monthlyActive = monthlyActiveTasks > 0 ? 1 : 0 // Упрощенная логика - если есть завершенные задачи за последние 3 месяца

    console.log(`[Badges] ========================================`)
    console.log(`[Badges] Проверка достижений для пользователя ${userId} (роль: ${user.role})`)
    console.log(`[Badges] Найдено бейджей для проверки: ${allBadges.length}`)
    console.log(`[Badges] Уже получено бейджей: ${earnedBadgeIds.length}`)
    
    if (allBadges.length === 0) {
      console.warn(`[Badges] ⚠️ ВНИМАНИЕ: Не найдено ни одного бейджа для роли ${user.role}!`)
      console.warn(`[Badges] Возможные причины:`)
      console.warn(`[Badges] 1. Достижения не созданы в БД (нужно запустить seed)`)
      console.warn(`[Badges] 2. Миграция не применена (поле targetRole не существует)`)
      console.warn(`[Badges] 3. Все достижения имеют targetRole, отличный от ${user.role}`)
    }
    
    // Логируем статистику для диагностики
    console.log(`[Badges] Статистика пользователя:`, {
      role: user.role,
      completedTasksAsExecutor,
      completedTasksAsCustomer,
      createdTasks,
      completedTasks: user.role === 'customer' ? completedTasksAsCustomer : completedTasksAsExecutor,
      paidTasks,
      totalSpent,
      reviewsGiven: reviewsGivenCount,
      monthlyActive,
      uniqueExecutors,
      passedTests,
      avgRating,
      positiveReviews,
      totalXP,
      level: levelNumber
    })
    console.log(`[Badges] ========================================`)
    
    // Проверяем каждый бейдж
    for (const badge of allBadges) {
      // Пропускаем уже полученные
      if (earnedBadgeIds.includes(badge.id)) {
        console.log(`[Badges] Бейдж ${badge.id} (${badge.name}) уже получен, пропускаем`)
        continue
      }

      // Парсим условие
      const condition = parseCondition(badge.condition)
      if (!condition) {
        console.warn(`[Badges] Не удалось распарсить условие для бейджа ${badge.id}: ${badge.condition}`)
        continue
      }
      
      console.log(`[Badges] Проверка бейджа ${badge.id} (${badge.name}) для роли ${user.role}, targetRole: ${badge.targetRole}`)

      // Проверяем условие
      const meetsCondition = checkCondition(condition, {
        completedTasks: user.role === 'customer' ? completedTasksAsCustomer : completedTasksAsExecutor,
        createdTasks,
        passedTests,
        avgRating,
        positiveReviews,
        totalXP,
        level: levelNumber,
        paidTasks,
        totalSpent,
        reviewsGiven: reviewsGivenCount,
        monthlyActive,
        uniqueExecutors
      })

      console.log(`[Badges] Условие для бейджа ${badge.id}:`, condition, 'Результат:', meetsCondition)
      
      if (meetsCondition) {
        try {
          // Присваиваем бейдж
          await prisma.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badge.id
            }
          })

          console.log(`[Badges] ✅ Пользователь ${userId} (${user.role}) получил бейдж "${badge.name}"`)

          // Добавляем в список полученных
          awardedBadges.push({
            id: badge.id,
            name: badge.name,
            icon: badge.icon
          })
        } catch (error: any) {
          // Если бейдж уже существует (дубликат), пропускаем
          if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            console.log(`[Badges] Бейдж ${badge.id} уже присвоен пользователю ${userId}`)
          } else {
            console.error(`[Badges] Ошибка присвоения бейджа ${badge.id}:`, error)
          }
        }

        // Отправляем уведомление
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'badge',
              title: '🏅 Новый бейдж!',
              message: `Вы получили бейдж "${badge.name}"!`,
              link: '/level'
            }
          })

          sendNotificationToUser(userId, {
            id: `badge-${Date.now()}-${badge.id}`,
            userId,
            type: 'badge',
            title: '🏅 Новый бейдж!',
            message: `Вы получили бейдж "${badge.name}"!`,
            link: '/level',
            isRead: false,
            createdAt: new Date(),
            playSound: true
          })
        } catch (error) {
          console.error('[Badges] Ошибка отправки уведомления:', error)
        }
      }
    }
  } catch (error) {
    console.error(`[Badges] Ошибка проверки бейджей для пользователя ${userId}:`, error)
  }

  return awardedBadges
}

/**
 * Парсит условие бейджа из строки
 * Формат: "type:operator:value" или JSON
 */
function parseCondition(conditionStr: string): BadgeCondition | null {
  try {
    // Пытаемся распарсить как JSON
    const json = JSON.parse(conditionStr)
    if (json.type && json.operator && json.value !== undefined) {
      return json as BadgeCondition
    }
  } catch {
    // Если не JSON, пытаемся распарсить как строку
    const parts = conditionStr.split(':')
    if (parts.length === 3) {
      const [type, operator, value] = parts
      return {
        type: type as BadgeCondition['type'],
        operator: operator as BadgeCondition['operator'],
        value: parseInt(value, 10)
      }
    }
  }

  return null
}

/**
 * Проверяет условие бейджа
 */
function checkCondition(
  condition: BadgeCondition,
  stats: {
    completedTasks: number
    createdTasks: number
    passedTests: number
    avgRating: number
    positiveReviews: number
    totalXP: number
    level: number
    paidTasks: number
    totalSpent: number
    reviewsGiven: number
    monthlyActive: number
    uniqueExecutors: number
  }
): boolean {
  let value: number

  switch (condition.type) {
    case 'completedTasks':
      value = stats.completedTasks
      break
    case 'createdTasks':
      value = stats.createdTasks
      break
    case 'passedTests':
      value = stats.passedTests
      break
    case 'avgRating':
      value = stats.avgRating
      break
    case 'positiveReviews':
      value = stats.positiveReviews
      break
    case 'totalXP':
      value = stats.totalXP
      break
    case 'level':
      value = stats.level
      break
    case 'paidTasks':
      value = stats.paidTasks
      break
    case 'totalSpent':
      value = stats.totalSpent
      break
    case 'reviewsGiven':
      value = stats.reviewsGiven
      break
    case 'monthlyActive':
      value = stats.monthlyActive
      break
    case 'uniqueExecutors':
      value = stats.uniqueExecutors
      break
    default:
      return false
  }

  switch (condition.operator) {
    case 'gte':
      return value >= condition.value
    case 'eq':
      return value === condition.value
    case 'lte':
      return value <= condition.value
    default:
      return false
  }
}

