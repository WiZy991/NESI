import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

type EnsureBody = {
  subcategoryId: string
  title?: string
  timeLimitSec?: number
  passScore?: number
  questionCount?: number
  replace?: boolean
  questions: {
    text: string
    options: { text: string; isCorrect?: boolean }[] // ровно 1 true
  }[]
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const body = (await req.json()) as EnsureBody
    if (!body?.subcategoryId) return NextResponse.json({ error: 'subcategoryId обязателен' }, { status: 400 })
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json({ error: 'Нужен непустой массив questions' }, { status: 400 })
    }

    const sub = await prisma.subcategory.findUnique({ where: { id: body.subcategoryId } })
    if (!sub) return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 })

    const title = body.title ?? `Тест по: ${sub.name}`
    const timeLimitSec = body.timeLimitSec ?? 420
    const passScore = body.passScore ?? 80
    const qc = Math.max(1, Math.min(body.questionCount ?? body.questions.length, body.questions.length))
    const replace = body.replace ?? true

    let test = await prisma.certificationTest.findUnique({ where: { subcategoryId: body.subcategoryId } })
    if (!test) {
      test = await prisma.certificationTest.create({
        data: { subcategoryId: body.subcategoryId, title, timeLimitSec, passScore, questionCount: qc }
      })
    } else {
      test = await prisma.certificationTest.update({
        where: { id: test.id },
        data: { title, timeLimitSec, passScore, questionCount: qc }
      })
      if (replace) {
        const oldQs = await prisma.certificationQuestion.findMany({ where: { testId: test.id } })
        const ids = oldQs.map(q => q.id)
        if (ids.length) {
          await prisma.certificationOption.deleteMany({ where: { questionId: { in: ids } } })
          await prisma.certificationQuestion.deleteMany({ where: { id: { in: ids } } })
        }
      }
    }

    for (const q of body.questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2) {
        return NextResponse.json({ error: 'Каждый вопрос: text + минимум 2 options' }, { status: 400 })
      }
      const correct = q.options.filter(o => o.isCorrect).length
      if (correct !== 1) {
        return NextResponse.json({ error: 'В каждом вопросе должна быть ровно 1 правильная опция' }, { status: 400 })
      }
      const createdQ = await prisma.certificationQuestion.create({
        data: { testId: test.id, text: q.text }
      })
      await prisma.certificationOption.createMany({
        data: q.options.map(o => ({ questionId: createdQ.id, text: o.text, isCorrect: !!o.isCorrect }))
      })
    }

    const totalQuestions = await prisma.certificationQuestion.count({ where: { testId: test.id } })
    return NextResponse.json({
      ok: true,
      test: {
        id: test.id,
        subcategoryId: body.subcategoryId,
        title,
        timeLimitSec,
        passScore,
        questionCount: qc,
        totalQuestions
      }
    })
  } catch (e) {
    console.error('POST /api/cert/test/ensure error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
