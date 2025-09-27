import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    // Проверяем, лайкнут ли пост
    const existing = await prisma.communityLike.findUnique({
      where: { postId_userId: { postId: params.id, userId: me.id } },
    })

    if (existing) {
      // убираем лайк
      await prisma.communityLike.delete({ where: { id: existing.id } })
    } else {
      // ставим лайк
      await prisma.communityLike.create({
        data: { postId: params.id, userId: me.id },
      })
    }

    // ⚡ всегда возвращаем актуальное состояние
    const likesCount = await prisma.communityLike.count({
      where: { postId: params.id },
    })

    return NextResponse.json({ liked: !existing, likesCount })
  } catch (err) {
    console.error('Ошибка лайка:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
