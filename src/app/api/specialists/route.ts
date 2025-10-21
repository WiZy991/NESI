import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/* ---------- шкала уровней (та же, что и в профиле) ---------- */
const BOUNDS = [0, 100, 300, 600, 1000, 1500, 2100]

function computeLevel(xpRaw: number) {
  const xp = Math.max(0, xpRaw ?? 0)
  let lvl = 0
  for (let i = 0; i < BOUNDS.length; i++) {
    if (xp >= BOUNDS[i]) lvl = i
    else break
  }
  const prev = BOUNDS[lvl] ?? 0
  const next = BOUNDS[lvl + 1] ?? prev + 400
  const progress = Math.min(100, Math.round(((xp - prev) / Math.max(1, next - prev)) * 100))
  const toNext = Math.max(0, next - xp)
  return { lvl, progress, toNext }
}

/**
 * GET /api/specialists
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // ── чтение/нормализация
    const qRaw = (searchParams.get('q') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    const skill = (searchParams.get('skill') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const sort = (searchParams.get('sort') || 'rating') as 'rating' | 'reviews' | 'xp' // 💡 новый параметр

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

    // ── получаем всех подходящих пользователей
    const users = await prisma.user.findMany({
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
        badges: { select: { badge: { select: { id: true, name: true, icon: true } } } },
        _count: { select: { reviewsReceived: true } },
      },
    })

    const ids = users.map((u) => u.id)

    // ── бонусный XP за сертификации
    let passedByUser: Record<string, number> = {}
    if (ids.length) {
      const grouped = await prisma.certificationAttempt.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, passed: true },
        _count: { _all: true },
      })
      passedByUser = Object.fromEntries(grouped.map((g) => [g.userId, g._count._all]))
    }

    // ── средний рейтинг по отзывам
    let ratingByUser: Record<string, number> = {}
    if (ids.length) {
      const ratings = await prisma.review.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: ids } },
        _avg: { rating: true },
      })
      ratingByUser = Object.fromEntries(ratings.map((r) => [r.toUserId, r._avg.rating ?? 0]))
    }

    // ── финальная подготовка данных
    const scored = users.map((u) => {
      const passed = passedByUser[u.id] || 0
      const xpComputed = (u.xp ?? 0) + passed * 10
      const { lvl, progress, toNext } = computeLevel(xpComputed)
      const avgRating = ratingByUser[u.id] ?? 0
      const reviews = u._count?.reviewsReceived ?? 0

      // 💎 три режима сортировки
      let score = 0
      if (sort === 'rating') {
        score = (avgRating || 0) * 1000 + (reviews || 0) * 10 + lvl * 10
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

    // ── сортировка
    scored.sort((a, b) => b.score - a.score)

    const total = scored.length
    const pages = Math.max(1, Math.ceil(total / take))
    const items = scored.slice(skip, skip + take)

    if (format === 'array') return NextResponse.json(items)
    return NextResponse.json({ items, total, page, pages, take })
  } catch (error) {
    console.error('Ошибка API /api/specialists:', error)
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
