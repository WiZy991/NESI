import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { testId } = await req.json()
    if (!testId) return NextResponse.json({ error: 'testId обязателен' }, { status: 400 })

    const test = await prisma.certificationTest.findUnique({ where: { id: testId } })
    if (!test) return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })

    // 1) Проверяем «висящую» попытку
    const active = await prisma.certificationAttempt.findFirst({
      where: { userId: user.id, testId, finishedAt: null },
      orderBy: { startedAt: 'desc' }
    })

    const now = new Date()

    if (active) {
      const expiresAt = new Date(active.startedAt.getTime() + test.timeLimitSec * 1000)

      // тест обновили после старта попытки → закрываем как устаревшую
      if (test.updatedAt && active.startedAt < test.updatedAt) {
        await prisma.certificationAttempt.update({
          where: { id: active.id },
          data: { finishedAt: now, score: 0, passed: false }
        })
      }
      // ещё не истекла → продолжаем
      else if (expiresAt > now) {
        return NextResponse.json({
          attemptId: active.id,
          startedAt: active.startedAt.toISOString(),
          timeLimitSec: test.timeLimitSec
        })
      }
      // истекла → закрываем
      else {
        await prisma.certificationAttempt.update({
          where: { id: active.id },
          data: { finishedAt: now, score: 0, passed: false }
        })
      }
    }

    // 2) Лимит 3/24ч — считаем с max(now-24h, test.updatedAt) → после обновления теста лимит «сброшен»
    const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const windowStart = test.updatedAt && test.updatedAt > window24h ? test.updatedAt : window24h

    const used = await prisma.certificationAttempt.count({
      where: { userId: user.id, testId, startedAt: { gte: windowStart } }
    })
    const limit = 3
    if (used >= limit) {
      return NextResponse.json(
        { error: 'Лимит попыток за 24 часа исчерпан', used, limit, windowStart: windowStart.toISOString() },
        { status: 429 }
      )
    }

    // 3) Создаём новую попытку
    const attempt = await prisma.certificationAttempt.create({
      data: { userId: user.id, testId: test.id }
    })

    return NextResponse.json({
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      timeLimitSec: test.timeLimitSec
    })
  } catch (e) {
    console.error('POST /api/cert/attempts/start error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
