import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { getLevelFromXP, getNextLevel } from '@/lib/level/calculate'

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

    // ==== 1. Используем сохраненный XP из БД + бонусный XP за сертификации ====
    const baseXp = user.xp || 0
    const passedTests = await prisma.certificationAttempt.count({
      where: { userId: user.id, passed: true }
    })
    const xpComputed = baseXp + passedTests * 10 // Бонусный XP за сертификации (10 XP за каждую)

    // ==== 2. Получаем уровень из единой системы (используем xpComputed) ====
    const currentLevel = await getLevelFromXP(xpComputed)
    const nextLevelInfo = await getNextLevel(xpComputed)

    // ==== 3. Рассчитываем прогресс (используем xpComputed) ====
    const xpToNextLevel = nextLevelInfo ? nextLevelInfo.minScore - xpComputed : 0
    const progressPercent = nextLevelInfo
      ? Math.max(0, Math.min(100, Math.floor(((xpComputed - currentLevel.minScore) / (nextLevelInfo.minScore - currentLevel.minScore)) * 100)))
      : 100

    // ==== 4. Получаем статистику для подсказок ====
    const [completedTasks, positiveReviews] = await Promise.all([
      prisma.task.count({
        where: { executorId: user.id, status: 'completed' }
      }),
      prisma.review.count({
        where: { toUserId: user.id, rating: { gte: 4 } }
      })
    ])

    // ==== 5. Генерируем подсказки ====
    // Всегда показываем 3 подсказки для улучшения уровня
    const suggestions: string[] = [
      'Пройди дополнительные тесты, чтобы набрать опыт',
      'Завершенные задачи дают опыт — выполняй больше задач для роста уровня',
      'Собери больше отзывов с рейтингом 4+'
    ]

    // ==== 6. Загружаем бейджи ====
    const badges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: {
        badge: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            targetRole: true, // Добавляем targetRole для фильтрации
            condition: true, // Добавляем condition для фильтрации XP-достижений
          }
        }
      },
      orderBy: { earnedAt: 'desc' },
    })

    // Фильтруем badges по targetRole - убираем достижения, которые не соответствуют роли пользователя
    let filteredBadges = badges.filter(entry => {
      const badge = entry.badge
      // Если у достижения указана роль, она должна совпадать с ролью пользователя
      // Если targetRole = null, достижение для всех ролей
      if (badge.targetRole === null || badge.targetRole === user.role) {
        return true
      }
      // Исключаем неправильно присвоенные достижения
      console.log(`[Level API] Исключаем достижение "${badge.name}" (targetRole: ${badge.targetRole}, роль пользователя: ${user.role})`)
      return false
    })

    // Для заказчиков исключаем достижения, связанные с XP и уровнями
    if (user.role === 'customer') {
      filteredBadges = filteredBadges.filter(entry => {
        const badge = entry.badge
        const condition = badge.condition?.toLowerCase() || ''
        const description = badge.description?.toLowerCase() || ''
        const name = badge.name?.toLowerCase() || ''
        
        // Исключаем достижения, связанные с XP, уровнями, опытом
        const xpKeywords = ['xp', 'опыт', 'уровень', 'level', 'очки опыта', 'totalXP']
        const hasXpReference = xpKeywords.some(keyword => 
          condition.includes(keyword) || 
          description.includes(keyword) || 
          name.includes(keyword)
        )
        
        return !hasXpReference
      })
    }

    // ==== 7. Формируем ответ ====
    return NextResponse.json({
      level: currentLevel.level,
      levelName: currentLevel.name,
      levelDescription: currentLevel.description,
      xp: xpComputed, // Возвращаем XP с учетом бонуса за сертификации
      nextLevelXP: nextLevelInfo?.minScore ?? null,
      nextLevelName: nextLevelInfo?.name ?? null,
      xpToNextLevel,
      progressPercent,
      suggestions,
      badges: filteredBadges.map(entry => ({
        id: entry.badge.id,
        name: entry.badge.name,
        description: entry.badge.description,
        icon: entry.badge.icon,
        earnedAt: entry.earnedAt,
      })),
      // Дополнительная статистика для отладки
      stats: {
        passedTests,
        completedTasks,
        positiveReviews
      }
    })
  } catch (e) {
    console.error('GET /api/users/me/level error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
