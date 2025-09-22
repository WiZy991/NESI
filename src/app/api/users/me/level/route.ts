import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

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

    // ==== 1. Получаем очки ====
    const passedTests = await prisma.certificationAttempt.count({
      where: { userId: user.id, passed: true }
    })

    // ✅ заменили performerId → executorId
    const completedTasks = await prisma.task.count({
      where: { executorId: user.id, status: 'done' }
    })

    const positiveReviews = await prisma.review.count({
      where: { toUserId: user.id, rating: { gte: 4 } }
    })

    const xp = passedTests * 10 + completedTasks * 20 + positiveReviews * 5

    // ==== 2. Определяем уровень ====
    const levels = [
      { level: 1, requiredXP: 0 },
      { level: 2, requiredXP: 100 },
      { level: 3, requiredXP: 300 },
      { level: 4, requiredXP: 700 },
      { level: 5, requiredXP: 1500 }
    ]

    let currentLevel = levels[0]
    for (const lvl of levels) {
      if (xp >= lvl.requiredXP) currentLevel = lvl
    }

    const nextLevel = levels.find(lvl => lvl.level === currentLevel.level + 1)
    const xpToNextLevel = nextLevel ? nextLevel.requiredXP - xp : 0
    const progressPercent = nextLevel
      ? Math.floor((xp - currentLevel.requiredXP) / (nextLevel.requiredXP - currentLevel.requiredXP) * 100)
      : 100

    // ==== 3. Подсказки ====
    const suggestions: string[] = []

    if (passedTests < 5) suggestions.push('Пройди дополнительные тесты, чтобы набрать опыт')
    if (completedTasks < 10) suggestions.push('Выполни больше задач — это даст XP и поднимет рейтинг')
    if (positiveReviews < 5) suggestions.push('Собери больше отзывов с рейтингом 4+')

    // ==== 4. Ответ ====
    return NextResponse.json({
      level: currentLevel.level,
      xp,
      nextLevelXP: nextLevel?.requiredXP ?? null,
      xpToNextLevel,
      progressPercent,
      suggestions
    })
  } catch (e) {
    console.error('GET /api/users/me/level error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
