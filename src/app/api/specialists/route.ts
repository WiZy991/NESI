import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/specialists
 * Оптимизированная версия: убраны N+1 запросы, добавлена пагинация на уровне БД
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // ── чтение/нормализация
    const qRaw = (searchParams.get('q') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    const skill = (searchParams.get('skill') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const sort = (searchParams.get('sort') || 'rating') as 'rating' | 'reviews' | 'xp'

    const minXp = toInt(searchParams.get('minXp'))
    const maxXp = toInt(searchParams.get('maxXp'))
    const minRating = toFloat(searchParams.get('minRating'))

    const page = Math.max(1, toInt(searchParams.get('page')) ?? 1)
    const take = clamp(Math.max(1, toInt(searchParams.get('take')) ?? 12), 1, 50)
    const skip = (page - 1) * take

    const format = (searchParams.get('format') || 'object') as 'array' | 'object'

    // ── where
    const where: any = { role: 'executor' }

    if (qRaw) {
      const words = qRaw.split(/\s+/).filter(Boolean)
      if (words.length) {
        where.OR = [
          { fullName: { contains: qRaw, mode: 'insensitive' } },
          { email: { contains: qRaw, mode: 'insensitive' } },
          ...words.flatMap((w) => [
            { fullName: { contains: w, mode: 'insensitive' } },
            { email: { contains: w, mode: 'insensitive' } },
          ]),
        ]
      }
    }

    if (city) where.location = { contains: city, mode: 'insensitive' }

    if (skill) where.skills = { has: skill }
    if (category) where.skills = { has: category }

    if (minXp != null || maxXp != null) {
      where.xp = {}
      if (minXp != null) where.xp.gte = minXp
      if (maxXp != null) where.xp.lte = maxXp
    }

    if (minRating != null) where.avgRating = { gte: minRating }

    // Оптимизация: загружаем уровни один раз вместо N+1 запросов
    const [dbLevels, total] = await Promise.all([
      prisma.userLevel.findMany({
        orderBy: { minScore: 'asc' }
      }),
      prisma.user.count({ where })
    ])

    // Функция для расчета уровня в памяти (без запросов к БД)
    const calculateLevel = (xp: number) => {
      if (dbLevels.length > 0) {
        let currentLevel = dbLevels[0]
        for (const lvl of dbLevels) {
          if (xp >= lvl.minScore) {
            currentLevel = lvl
          } else {
            break
          }
        }
        const nextLevel = dbLevels.find(lvl => lvl.minScore > xp)
        return {
          level: parseInt(currentLevel.slug) || 1,
          name: currentLevel.name,
          minScore: currentLevel.minScore,
          nextLevel: nextLevel ? {
            level: parseInt(nextLevel.slug) || 1,
            minScore: nextLevel.minScore,
          } : null
        }
      }
      // Fallback на дефолтные уровни
      const defaultLevels = [
        { level: 1, requiredXP: 0 },
        { level: 2, requiredXP: 100 },
        { level: 3, requiredXP: 300 },
        { level: 4, requiredXP: 700 },
        { level: 5, requiredXP: 1500 }
      ]
      let currentLevel = defaultLevels[0]
      for (const lvl of defaultLevels) {
        if (xp >= lvl.requiredXP) {
          currentLevel = lvl
        } else {
          break
        }
      }
      const nextLevel = defaultLevels.find(lvl => lvl.requiredXP > xp)
      return {
        level: currentLevel.level,
        name: `Уровень ${currentLevel.level}`,
        minScore: currentLevel.requiredXP,
        nextLevel: nextLevel ? {
          level: nextLevel.level,
          minScore: nextLevel.requiredXP,
        } : null
      }
    }

    // Оптимизация: получаем пользователей с пагинацией на уровне БД
    // Сначала получаем ID всех подходящих пользователей для агрегаций
    const allUserIds = await prisma.user.findMany({
      where,
      select: { id: true },
    })
    const ids = allUserIds.map(u => u.id)

    // Параллельно загружаем данные
    const [users, passedByUserGroup, ratingByUserGroup] = await Promise.all([
      // Получаем пользователей с пагинацией
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarFileId: true,
          location: true,
          skills: true,
          xp: true,
          completedTasksCount: true,
          level: { select: { id: true, name: true } },
          badges: { 
            select: { badge: { select: { id: true, name: true, icon: true } } },
            take: 6 // Ограничиваем количество badges
          },
          _count: { select: { reviewsReceived: true } },
        },
        skip,
        take,
      }),
      // Бонусный XP за сертификации (один запрос для всех)
      ids.length > 0 ? prisma.certificationAttempt.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, passed: true },
        _count: { _all: true },
      }) : [],
      // Средний рейтинг по отзывам (один запрос для всех)
      ids.length > 0 ? prisma.review.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: ids } },
        _avg: { rating: true },
      }) : [],
    ])

    // Создаем мапы для быстрого доступа
    const passedByUser = Object.fromEntries(
      passedByUserGroup.map((g) => [g.userId, g._count._all])
    )
    const ratingByUser = Object.fromEntries(
      ratingByUserGroup.map((r) => [r.toUserId, r._avg.rating ?? 0])
    )

    // Рассчитываем уровни в памяти (без дополнительных запросов)
    const scored = users.map((u) => {
      const passed = passedByUser[u.id] || 0
      const xpComputed = (u.xp ?? 0) + passed * 10
      
      const levelInfo = calculateLevel(xpComputed)
      const lvl = levelInfo.level
      const progress = levelInfo.nextLevel 
        ? Math.max(0, Math.min(100, Math.floor(((xpComputed - levelInfo.minScore) / (levelInfo.nextLevel.minScore - levelInfo.minScore)) * 100)))
        : 100
      const toNext = levelInfo.nextLevel ? Math.max(0, levelInfo.nextLevel.minScore - xpComputed) : 0
      
      const avgRating = ratingByUser[u.id] ?? 0
      const reviews = u._count?.reviewsReceived ?? 0

      // 💎 три режима сортировки
      let score = 0
      if (sort === 'rating') {
        // Приоритет рейтингу: если отзывов нет, рейтинг = 0
        // Если отзывов мало, рейтинг имеет меньший вес
        const ratingWeight = reviews > 0 ? 10000 : 0
        score = (avgRating || 0) * ratingWeight + (reviews || 0) * 10 + lvl * 1
      } else if (sort === 'reviews') {
        score = (reviews || 0) * 1000 + (avgRating || 0) * 50 + lvl * 5
      } else {
        // sort === 'xp'
        score = lvl * 1000 + progress * 3 + avgRating * 20 + reviews * 1.5
      }

      return {
        ...u,
        avatarUrl: u.avatarFileId ? `/api/files/${u.avatarFileId}` : null,
        xpComputed,
        lvl,
        progress,
        toNext,
        avgRating,
        reviewsCount: reviews,
        score,
      }
    })

    // Сортировка по вычисленному score (всегда)
    scored.sort((a, b) => b.score - a.score)

    const pages = Math.max(1, Math.ceil(total / take))

    if (format === 'array') return NextResponse.json(scored)
    return NextResponse.json({ items: scored, total, page, pages, take })
  } catch (error) {
    logger.error('Ошибка API /api/specialists', error)
    return NextResponse.json({ error: 'Ошибка загрузки исполнителей' }, { status: 500 })
  }
}

/* ───────────────── helpers ───────────────── */
function toInt(v: string | null): number | null {
  if (v == null) return null
  const n = Number.parseInt(v)
  return Number.isFinite(n) ? n : null
}
function toFloat(v: string | null): number | null {
  if (v == null) return null
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}
