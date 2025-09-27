import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить комментарии для поста
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.communityComment.findMany({
      where: { postId: params.id, parentId: null }, // только верхний уровень
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarFileId: true },
        },
        replies: {   // 👈 self-relation alias (children)
          include: {
            author: {
              select: { id: true, fullName: true, email: true, avatarFileId: true },
            },
          },
        },
        _count: { select: { replies: true, likes: true } },
      },
    })

    return NextResponse.json({ comments })
  } catch (err) {
    console.error('🔥 Ошибка загрузки комментариев:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Добавить комментарий
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const { content, parentId } = body || {}

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Комментарий пустой' }, { status: 400 })
    }

    const comment = await prisma.communityComment.create({
      data: {
        content: content.trim(),
        postId: params.id,
        authorId: me.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarFileId: true },
        },
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('🔥 Ошибка добавления комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
