import prisma from '@/lib/prisma'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'

export interface BadgeCondition {
  type: 'completedTasks' | 'passedTests' | 'avgRating' | 'positiveReviews' | 'totalXP' | 'level'
  operator: 'gte' | 'eq' | 'lte'
  value: number
}

/**
 * Проверяет и присваивает бейджи пользователю
 */
export async function checkAndAwardBadges(userId: string): Promise<void> {
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
      return
    }

    // Получаем статистику отдельными запросами
    const [completedTasks, certifications, reviews] = await Promise.all([
      prisma.task.count({
        where: { executorId: userId, status: 'completed' }
      }),
      prisma.userCertification.findMany({
        where: { userId },
        select: { id: true }
      }),
      prisma.review.findMany({
        where: { toUserId: userId },
        select: { rating: true }
      })
    ])

    // Получаем все бейджи из БД
    const allBadges = await prisma.badge.findMany()
    const earnedBadgeIds = user.badges.map(b => b.badgeId)

    // Статистика пользователя
    const passedTests = certifications.length
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0
    const positiveReviews = reviews.filter(r => (r.rating || 0) >= 4).length
    const totalXP = user.xp || 0
    const levelNumber = user.level?.slug ? parseInt(user.level.slug) || 0 : 0

    // Проверяем каждый бейдж
    for (const badge of allBadges) {
      // Пропускаем уже полученные
      if (earnedBadgeIds.includes(badge.id)) continue

      // Парсим условие
      const condition = parseCondition(badge.condition)
      if (!condition) {
        console.warn(`[Badges] Не удалось распарсить условие для бейджа ${badge.id}: ${badge.condition}`)
        continue
      }

      // Проверяем условие
      const meetsCondition = checkCondition(condition, {
        completedTasks,
        passedTests,
        avgRating,
        positiveReviews,
        totalXP,
        level: levelNumber
      })

      if (meetsCondition) {
        // Присваиваем бейдж
        await prisma.userBadge.create({
          data: {
            userId: user.id,
            badgeId: badge.id
          }
        })

        console.log(`[Badges] Пользователь ${userId} получил бейдж "${badge.name}"`)

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
            id: `badge-${Date.now()}`,
            userId,
            type: 'badge',
            title: '🏅 Новый бейдж!',
            message: `Вы получили бейдж "${badge.name}"!`,
            link: '/level',
            isRead: false,
            createdAt: new Date()
          })
        } catch (error) {
          console.error('[Badges] Ошибка отправки уведомления:', error)
        }
      }
    }
  } catch (error) {
    console.error(`[Badges] Ошибка проверки бейджей для пользователя ${userId}:`, error)
  }
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
    passedTests: number
    avgRating: number
    positiveReviews: number
    totalXP: number
    level: number
  }
): boolean {
  let value: number

  switch (condition.type) {
    case 'completedTasks':
      value = stats.completedTasks
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

