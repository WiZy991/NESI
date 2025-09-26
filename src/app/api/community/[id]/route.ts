import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { likes: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 })
    }

    // Проверяем, лайкал ли текущий пользователь
    let liked = false
    if (me) {
      const like = await prisma.communityLike.findUnique({
        where: { postId_userId: { postId: params.id, userId: me.id } },
      })
      liked = !!like
    }

    return NextResponse.json({ post, liked })
  } catch (err) {
    console.error('Ошибка /api/community/[id]:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
