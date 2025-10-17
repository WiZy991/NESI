// src/app/api/community/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    // Если пользователь авторизован — создаём уникальную запись
    if (me) {
      await prisma.communityView.upsert({
        where: {
          postId_userId: {
            postId: params.id,
            userId: me.id,
          },
        },
        update: {}, // если запись уже есть — ничего не делаем
        create: {
          postId: params.id,
          userId: me.id,
        },
      })
    } else {
      // Для анонимных — просто создаём новую запись без userId
      await prisma.communityView.create({
        data: { postId: params.id, userId: null },
      })
    }

    // Вернём текущее количество просмотров
    const count = await prisma.communityView.count({
      where: { postId: params.id },
    })

    return NextResponse.json({ ok: true, views: count })
  } catch (err) {
    console.error('Ошибка записи просмотра:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
