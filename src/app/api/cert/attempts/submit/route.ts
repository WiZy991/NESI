import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import crypto from 'crypto'

type Answer = { questionId: string; optionId: string }

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { attemptId, answers, correctAnswers } = (await req.json()) as { 
      attemptId: string; 
      answers: Answer[];
      correctAnswers?: Record<string, string>;
    }
    if (!attemptId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const attempt = await prisma.certificationAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { include: { subcategory: true } } }
    })
    if (!attempt || attempt.userId !== user.id) {
      return NextResponse.json({ error: 'Попытка не найдена' }, { status: 404 })
    }
    if (attempt.finishedAt) {
      return NextResponse.json({ error: 'Попытка уже завершена' }, { status: 400 })
    }

    const test = await prisma.certificationTest.findUnique({
      where: { id: attempt.testId },
      include: { subcategory: true }
    })
    if (!test) return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })

    // дедлайн
    const deadline = new Date(attempt.startedAt.getTime() + test.timeLimitSec * 1000)
    const outOfTime = new Date() > deadline

    // Используем переданные правильные ответы или вычисляем из хеша
    if (!correctAnswers) {
      return NextResponse.json({ error: 'Отсутствуют данные для проверки ответов' }, { status: 400 })
    }

    // Проверяем ответы
    let correct = 0
    const total = answers.length

    for (const a of answers) {
      if (correctAnswers[a.questionId] === a.optionId) {
        correct++
      }
    }

    // Если прислали меньше ответов, чем total — считаем как есть (оставшиеся — неверные)
    const score = Math.round((correct / total) * 100)
    const passed = !outOfTime && score >= test.passScore

    await prisma.certificationAttempt.update({
      where: { id: attempt.id },
      data: { finishedAt: new Date(), score, passed }
    })

    if (passed) {
      await prisma.userCertification.upsert({
        where: {
          userId_subcategoryId: { userId: user.id, subcategoryId: test.subcategoryId }
        },
        create: {
          userId: user.id,
          subcategoryId: test.subcategoryId,
          level: 'CERTIFIED'
        },
        update: {} // при повторной сдаче просто сохраним дату выше, если нужно
      })
    }

    return NextResponse.json({
      score,
      passed,
      outOfTime,
      passScore: test.passScore
    })
  } catch (e) {
    console.error('POST /api/cert/attempts/submit error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
