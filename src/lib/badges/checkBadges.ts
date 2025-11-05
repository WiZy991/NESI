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
          include: { 
            badge: {
              select: {
                id: true,
                name: true,
                icon: true,
                targetRole: true
              } as any // Обход проблемы с типами Prisma
            }
          }
        },
        level: {
          select: { slug: true }
        }
      }
    }) as any // Временный обход для типов

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
          createdAt: true,
          taskId: true
        }
      })
    ])

    // Получаем все бейджи из БД, СТРОГО фильтруя по роли пользователя
    // Для заказчиков - ТОЛЬКО достижения с targetRole = 'customer' или null
    // Для исполнителей - ТОЛЬКО достижения с targetRole = 'executor' или null
    const allBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { targetRole: user.role } as any, // Достижения для конкретной роли (приоритет)
          { targetRole: null } as any // Достижения для всех ролей (только если нет специфичных)
        ]
      }
    }) as Array<{ id: string; name: string; description: string; icon: string; condition: string; targetRole: string | null }>
    
    // Нормализуем targetRole: пустые строки и другие невалидные значения заменяем на null
    const normalizedBadges = allBadges.map(badge => ({
      ...badge,
      targetRole: badge.targetRole && (badge.targetRole === 'customer' || badge.targetRole === 'executor') 
        ? badge.targetRole 
        : null
    }))
    
    // Дополнительная фильтрация после нормализации для безопасности
    const filteredBadges = normalizedBadges.filter(badge => {
      // Если targetRole указан и не соответствует роли пользователя - исключаем
      if (badge.targetRole !== null && badge.targetRole !== user.role) {
        console.warn(`[Badges] ⚠️ Исключаем badge ${badge.id} (${badge.name}): targetRole="${badge.targetRole}", роль пользователя="${user.role}"`)
        return false
      }
      return true
    })
    
    console.log(`[Badges] Найдено бейджей в БД для роли ${user.role}:`, allBadges.length)
    console.log(`[Badges] После нормализации и фильтрации:`, filteredBadges.length)
    console.log(`[Badges] Детали бейджей:`, filteredBadges.map((b: any) => ({ id: b.id, name: b.name, targetRole: b.targetRole })))
    const earnedBadgeIds = (user.badges as any[]).map((b: any) => b.badgeId)
    console.log(`[Badges] Уже получено бейджей: ${earnedBadgeIds.length}`, earnedBadgeIds)
    
    // Очищаем неправильно присвоенные достижения (если роль пользователя не соответствует targetRole)
    // КРИТИЧНО: Если у достижения указана роль (targetRole !== null), она ДОЛЖНА совпадать с ролью пользователя
    const incorrectlyAwardedBadges = (user.badges as any[]).filter((ub: any) => {
      const badge = ub.badge
      // Если у достижения указана роль, она должна совпадать с ролью пользователя
      // targetRole = null означает "для всех ролей", такие достижения оставляем
      if (badge.targetRole !== null && badge.targetRole !== user.role) {
        console.log(`[Badges] 🧹 Найдено неправильно присвоенное достижение: "${badge.name}" (targetRole: ${badge.targetRole}, роль пользователя: ${user.role})`)
        return true
      }
      return false
    })
    
    if (incorrectlyAwardedBadges.length > 0) {
      console.log(`[Badges] 🧹 Найдено ${incorrectlyAwardedBadges.length} неправильно присвоенных достижений для пользователя ${userId} (роль: ${user.role})`)
      for (const incorrectBadge of incorrectlyAwardedBadges) {
        try {
          await prisma.userBadge.delete({
            where: { id: incorrectBadge.id }
          })
          console.log(`[Badges] ✅ Удалено неправильно присвоенное достижение "${incorrectBadge.badge.name}" (id: ${incorrectBadge.badge.id}, targetRole: ${incorrectBadge.badge.targetRole}, роль пользователя: ${user.role})`)
          // Удаляем из списка полученных достижений
          const index = earnedBadgeIds.indexOf(incorrectBadge.badgeId)
          if (index > -1) {
            earnedBadgeIds.splice(index, 1)
          }
        } catch (error) {
          console.error(`[Badges] ❌ Ошибка удаления неправильного достижения ${incorrectBadge.id}:`, error)
        }
      }
      // Обновляем список полученных достижений после очистки
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          badges: {
            select: { badgeId: true }
          }
        }
      })
      if (updatedUser) {
        // Очищаем и обновляем earnedBadgeIds
        earnedBadgeIds.length = 0
        earnedBadgeIds.push(...updatedUser.badges.map(b => b.badgeId))
      }
    }

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
    
    // Оплаченные задачи заказчика: считаем только завершенные задачи с транзакциями типа 'payment'
    // Транзакции типа 'payment' создаются при завершении задачи (см. tasks/[id]/complete/route.ts)
    // Используем оптимизированный запрос: получаем только транзакции для завершенных задач заказчика
    const completedTasksWithPayments = await prisma.task.findMany({
      where: {
        customerId: userId,
        status: 'completed',
        Transaction: {
          some: {
            type: 'payment',
            userId: userId
          }
        }
      },
      include: {
        Transaction: {
          where: {
            type: 'payment',
            userId: userId
          },
          select: {
            amount: true
          }
        }
      }
    })
    
    const paidTasks = completedTasksWithPayments.length
    // totalSpent считаем по абсолютному значению суммы (т.к. payment транзакции отрицательные)
    const totalSpent = completedTasksWithPayments.reduce((sum, task) => {
      const taskPayment = task.Transaction[0] // Берем первую транзакцию payment для задачи
      if (taskPayment) {
        return sum + Math.abs(taskPayment.amount ? Number(taskPayment.amount) : 0)
      }
      return sum
    }, 0)
    const reviewsGivenCount = reviewsGiven.length
    
    // Уникальные исполнители (для заказчиков): считаем только по завершенным задачам
    const uniqueExecutorsResult = await prisma.task.findMany({
      where: {
        customerId: userId,
        executorId: { not: null },
        status: 'completed' // Только завершенные задачи
      },
      select: {
        executorId: true
      },
      distinct: ['executorId']
    })
    const uniqueExecutors = uniqueExecutorsResult.length
    
    // Активность по месяцам (для заказчиков)
    // Проверяем, была ли активность (создание или завершение задач) в каждый из последних месяцев
    const now = new Date()
    const monthlyActiveMonths = []
    for (let i = 0; i < 12; i++) { // Проверяем до 12 месяцев для гибкости
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      
      // Проверяем активность: созданные задачи ИЛИ завершенные задачи в этом месяце
      const [createdInMonth, completedInMonth] = await Promise.all([
        prisma.task.count({
          where: {
            customerId: userId,
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        }),
        prisma.task.count({
        where: {
          customerId: userId,
          status: 'completed',
          completedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
      ])
      
      // Если есть активность (создание или завершение), месяц считается активным
      if (createdInMonth > 0 || completedInMonth > 0) {
        monthlyActiveMonths.push(i)
      }
    }
    const monthlyActive = monthlyActiveMonths.length // Количество активных месяцев
    
    // Детальное логирование статистики для заказчиков
    if (user.role === 'customer') {
      console.log(`[Badges] 📊 Статистика заказчика ${userId}:`, {
        completedTasksAsCustomer,
        completedTasksAsExecutor,
        createdTasks,
        paidTasks,
        totalSpent,
        reviewsGivenCount,
        uniqueExecutors,
        monthlyActive
      })
    }

    console.log(`[Badges] ========================================`)
    console.log(`[Badges] Проверка достижений для пользователя ${userId} (роль: ${user.role})`)
    console.log(`[Badges] Найдено бейджей для проверки: ${filteredBadges.length}`)
    console.log(`[Badges] Уже получено бейджей: ${earnedBadgeIds.length}`)
    
    if (filteredBadges.length === 0) {
      console.warn(`[Badges] ⚠️ ВНИМАНИЕ: Не найдено ни одного бейджа для роли ${user.role}!`)
      console.warn(`[Badges] Возможные причины:`)
      console.warn(`[Badges] 1. Достижения не созданы в БД (нужно запустить seed через POST /api/admin/badges/seed)`)
      console.warn(`[Badges] 2. Миграция не применена (поле targetRole не существует)`)
      console.warn(`[Badges] 3. Все достижения имеют targetRole, отличный от ${user.role}`)
      
      // Проверяем, есть ли вообще достижения в БД
      const totalBadgesInDb = await prisma.badge.count()
      if (totalBadgesInDb === 0) {
        console.error(`[Badges] ❌ КРИТИЧНО: В БД вообще нет достижений! Нужно запустить seed.`)
      } else {
        const badgesForRole = await prisma.badge.count({
          where: { targetRole: user.role } as any
        })
        const badgesForAll = await prisma.badge.count({
          where: { targetRole: null } as any
        })
        console.warn(`[Badges] Всего в БД: ${totalBadgesInDb}, для роли ${user.role}: ${badgesForRole}, для всех: ${badgesForAll}`)
      }
    }
    
    // Логируем статистику для диагностики
    const finalStats = {
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
    }
    console.log(`[Badges] 📊 Статистика пользователя ${userId} (${user.role}):`, finalStats)
    console.log(`[Badges] ========================================`)
    
    // Проверяем каждый бейдж
    for (const badge of filteredBadges) {
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

      // СТРОГАЯ проверка: убеждаемся, что достижение подходит для роли пользователя
      // КРИТИЧНО: Если у достижения указана роль, она ДОЛЖНА точно совпадать с ролью пользователя
      // Если targetRole = null, это достижение для всех ролей - но нужно быть осторожным
      if (badge.targetRole !== null && badge.targetRole !== user.role) {
        console.log(`[Badges] ⚠️ Пропускаем бейдж ${badge.id} (${badge.name}) - он предназначен для роли ${badge.targetRole}, а пользователь - ${user.role}`)
        continue
      }
      
      // Дополнительная проверка: для достижений с targetRole = null проверяем, что условие подходит для роли
      // Например, если условие использует completedTasks, то для заказчика должно быть completedTasksAsCustomer
      if (badge.targetRole === null) {
        console.log(`[Badges] ℹ️ Бейдж ${badge.id} (${badge.name}) предназначен для всех ролей (targetRole = null) - проверяем условие`)
      }

       // Дополнительная проверка: если условие использует поле, специфичное для одной роли,
       // то для универсальных badges (targetRole = null) нужно проверить, что условие применимо к роли пользователя
       // Поля, специфичные для исполнителей
       const executorOnlyFields: Array<BadgeCondition['type']> = ['passedTests']
       // Поля, специфичные для заказчиков  
       const customerOnlyFields: Array<BadgeCondition['type']> = ['createdTasks', 'paidTasks', 'totalSpent', 'monthlyActive', 'uniqueExecutors']
       
       // Если badge универсальный (targetRole = null), но условие использует поле, специфичное для другой роли - пропускаем
       if (badge.targetRole === null) {
         if (user.role === 'customer' && executorOnlyFields.includes(condition.type)) {
           console.log(`[Badges] Пропускаем универсальное достижение ${badge.id} (${badge.name}) - условие использует поле "${condition.type}", которое применимо только для исполнителей`)
           continue
         }
         if (user.role === 'executor' && customerOnlyFields.includes(condition.type)) {
           console.log(`[Badges] Пропускаем универсальное достижение ${badge.id} (${badge.name}) - условие использует поле "${condition.type}", которое применимо только для заказчиков`)
           continue
         }
      }

      // Подготавливаем статистику для проверки
       // ВАЖНО: Для заказчиков используем только статистику заказчика, для исполнителей - только исполнителя
      const stats = {
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
      }

      // Детальное логирование для заказчиков
      if (user.role === 'customer') {
        console.log(`[Badges] 📊 Статистика для проверки бейджа "${badge.name}":`, {
          condition: condition.type,
          operator: condition.operator,
          requiredValue: condition.value,
          actualValue: stats[condition.type as keyof typeof stats],
          stats
        })
      }

      // Проверяем условие
      const meetsCondition = checkCondition(condition, stats)

      console.log(`[Badges] Условие для бейджа ${badge.id} (${badge.name}):`, condition, 'Результат:', meetsCondition)
      
      // ФИНАЛЬНАЯ СТРОГАЯ проверка перед присвоением: убеждаемся, что роль совпадает
      // КРИТИЧНО: Если targetRole указан, он ДОЛЖЕН совпадать с ролью пользователя
      // Это последняя линия защиты от неправильного присвоения достижений
      if (badge.targetRole !== null && badge.targetRole !== user.role) {
        console.error(`[Badges] ❌ КРИТИЧЕСКАЯ ОШИБКА: Попытка присвоить бейдж ${badge.id} (${badge.name}) с targetRole="${badge.targetRole}" пользователю с ролью "${user.role}"! Пропускаем.`)
        continue
      }
      
      if (meetsCondition) {
        try {
          // Присваиваем бейдж
          await prisma.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badge.id
            }
          })

          console.log(`[Badges] ✅ Пользователь ${userId} (${user.role}) получил бейдж "${badge.name}" (targetRole: ${badge.targetRole || 'для всех'})`)

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
              message: `🏅 Новый бейдж! Вы получили бейдж "${badge.name}"!`,
              link: '/level'
            } as any // Обход проблемы с типами Prisma
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

