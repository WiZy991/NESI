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

    // ==== 1. Используем сохраненный XP из БД ====
    const xp = user.xp || 0

    // ==== 2. Получаем уровень из единой системы ====
    const currentLevel = await getLevelFromXP(xp)
    const nextLevelInfo = await getNextLevel(xp)

    // ==== 3. Рассчитываем прогресс ====
    const xpToNextLevel = nextLevelInfo ? nextLevelInfo.minScore - xp : 0
    const progressPercent = nextLevelInfo
      ? Math.max(0, Math.min(100, Math.floor(((xp - currentLevel.minScore) / (nextLevelInfo.minScore - currentLevel.minScore)) * 100)))
      : 100

    // ==== 4. Получаем статистику для подсказок ====
    const [passedTests, completedTasks, positiveReviews] = await Promise.all([
      prisma.certificationAttempt.count({
        where: { userId: user.id, passed: true }
      }),
      prisma.task.count({
        where: { executorId: user.id, status: 'completed' }
      }),
      prisma.review.count({
        where: { toUserId: user.id, rating: { gte: 4 } }
      })
    ])

    // ==== 5. Генерируем подсказки ====
    const suggestions: string[] = []

    if (passedTests < 5) suggestions.push('Пройди дополнительные тесты, чтобы набрать опыт')
    if (completedTasks < 10) suggestions.push('Выполни больше задач — это даст XP и поднимет рейтинг')
    if (positiveReviews < 5) suggestions.push('Собери больше отзывов с рейтингом 4+')

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
          }
        }
      },
      orderBy: { earnedAt: 'desc' },
    })

    // Фильтруем badges по targetRole - убираем достижения, которые не соответствуют роли пользователя
    const filteredBadges = badges.filter(entry => {
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

    // ==== 7. Формируем ответ ====
    return NextResponse.json({
      level: currentLevel.level,
      levelName: currentLevel.name,
      levelDescription: currentLevel.description,
      xp,
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
