import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {

    const me = await getUserFromRequest(req).catch(() => null)

    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    const { type, postId, commentId, reason, description } = body

    if (!['post', 'comment'].includes(type)) {
      return NextResponse.json({ error: 'Неверный тип жалобы' }, { status: 400 })
    }

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Причина обязательна' }, { status: 400 })
    }

    // Создаём жалобу
    const report = await prisma.communityReport.create({
      data: {
        type,
        postId: type === 'post' ? postId : null,
        commentId: type === 'comment' ? commentId : null,
        reason,
        description: description?.trim() || null,
        reporterId: me.id,
      },
    })

    return NextResponse.json({ ok: true, report })
  } catch (err) {
    console.error('🔥 Ошибка отправки жалобы:', err)
    return NextResponse.json({ error: 'Ошибка сервера при обработке жалобы' }, { status: 500 })
  }
}
