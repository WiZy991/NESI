import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

/**
 * GET /api/badges/all
 * Получает все достижения (достигнутые и недостигнутые) для текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован: нет токена' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Неверный токен или пользователь не найден' }, { status: 401 })
    }

    // Получаем все достижения, подходящие для роли пользователя
    let allBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { targetRole: null }, // Достижения для всех ролей
          { targetRole: user.role }, // Достижения для роли пользователя
        ],
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Для заказчиков исключаем достижения для исполнителей и связанные с XP
    if (user.role === 'customer') {
      allBadges = allBadges.filter(badge => {
        // Проверяем targetRole - если явно для исполнителя, исключаем
        if (badge.targetRole === 'executor') {
          return false
        }
        
        // Парсим условие из JSON для проверки типа
        try {
          const conditionObj = JSON.parse(badge.condition)
          const conditionType = conditionObj.type as string
          
          // Типы условий, специфичные для исполнителей
          const executorOnlyTypes = ['completedTasks', 'passedTests', 'avgRating', 'positiveReviews', 'totalXP', 'level']
          
          if (executorOnlyTypes.includes(conditionType)) {
            return false
          }
        } catch (error) {
          // Если не удалось распарсить, проверяем по тексту
          const condition = badge.condition.toLowerCase()
          const description = badge.description.toLowerCase()
          const name = badge.name.toLowerCase()
          
          // Исключаем достижения, связанные с XP, уровнями, опытом
          const xpKeywords = ['xp', 'опыт', 'уровень', 'level', 'очки опыта', 'totalxp']
          const executorKeywords = ['исполнитель', 'executor', 'выполнил', 'задач покорены', 'вступил в ряды профессионалов']
          
          const hasXpReference = xpKeywords.some(keyword => 
            condition.includes(keyword) || 
            description.includes(keyword) || 
            name.includes(keyword)
          )
          
          const hasExecutorReference = executorKeywords.some(keyword => 
            description.includes(keyword) || 
            name.includes(keyword)
          )
          
          if (hasXpReference || hasExecutorReference) {
            return false
          }
        }
        
        return true
      })
    }

    // Получаем достижения пользователя с информацией о badge
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: {
        badge: {
          select: {
            id: true,
            targetRole: true,
            condition: true,
            name: true,
            description: true,
          },
        },
      },
    })

    // Фильтруем достижения пользователя по роли и исключаем XP-достижения для заказчиков
    const filteredUserBadges = userBadges.filter(ub => {
      const badge = ub.badge
      
      // Если badge специально для другой роли - исключаем
      if (badge.targetRole === 'executor' && user.role === 'customer') {
        return false
      }
      if (badge.targetRole === 'customer' && user.role === 'executor') {
        return false
      }
      
      // Для заказчиков исключаем достижения для исполнителей
      if (user.role === 'customer') {
        // Парсим условие из JSON для проверки типа
        try {
          const conditionObj = JSON.parse(badge.condition || '{}')
          const conditionType = conditionObj.type as string
          
          // Типы условий, специфичные для исполнителей
          const executorOnlyTypes = ['completedTasks', 'passedTests', 'avgRating', 'positiveReviews', 'totalXP', 'level']
          
          if (executorOnlyTypes.includes(conditionType)) {
            return false
          }
        } catch (error) {
          // Если не удалось распарсить, проверяем по тексту
          const condition = badge.condition?.toLowerCase() || ''
          const description = badge.description?.toLowerCase() || ''
          const name = badge.name?.toLowerCase() || ''
          
          const xpKeywords = ['xp', 'опыт', 'уровень', 'level', 'очки опыта', 'totalxp']
          const executorKeywords = ['исполнитель', 'executor', 'выполнил', 'задач покорены', 'вступил в ряды профессионалов', 'быстрый удар']
          
          const hasXpReference = xpKeywords.some(keyword => 
            condition.includes(keyword) || 
            description.includes(keyword) || 
            name.includes(keyword)
          )
          
          const hasExecutorReference = executorKeywords.some(keyword => 
            description.includes(keyword) || 
            name.includes(keyword)
          )
          
          if (hasXpReference || hasExecutorReference) {
            return false
          }
        }
      }
      
      return true
    })

    const earnedBadgeIds = new Set(filteredUserBadges.map(ub => ub.badgeId))

    // Разделяем на достигнутые и недостигнутые
    const earned = allBadges
      .filter(badge => earnedBadgeIds.has(badge.id))
      .map(badge => ({
        ...badge,
        earned: true,
      }))

    const locked = allBadges
      .filter(badge => !earnedBadgeIds.has(badge.id))
      .map(badge => ({
        ...badge,
        earned: false,
      }))

    return NextResponse.json({
      earned,
      locked,
      total: allBadges.length,
      earnedCount: earned.length,
      lockedCount: locked.length,
    })
  } catch (error) {
    console.error('Ошибка получения всех достижений:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

