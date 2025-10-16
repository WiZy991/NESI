import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Рекурсивная функция для получения всех уровней replies
async function getReplies(commentId: string) {
  const replies = await prisma.communityComment.findMany({
    where: { parentId: commentId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarFileId: true,
        },
      },
    },
  })

  for (const reply of replies) {
    ;(reply as any).replies = await getReplies(reply.id)
  }

  // добавляем avatarUrl для каждого ответа
  return replies.map((r) => ({
    ...r,
    author: {
      ...r.author,
      avatarUrl: r.author.avatarFileId
        ? `/api/files/${r.author.avatarFileId}`
        : null,
    },
  }))
}

// 📌 Получить комментарии к посту
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.communityComment.findMany({
      where: { postId: params.id, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
      },
    })

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        author: {
          ...comment.author,
          avatarUrl: comment.author.avatarFileId
            ? `/api/files/${comment.author.avatarFileId}`
            : null,
        },
        replies: await getReplies(comment.id),
      }))
    )

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (err) {
    console.error('🔥 Ошибка загрузки комментариев:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Добавить комментарий (текст или imageUrl, либо оба)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      )
    }

    const { content, parentId, imageUrl } = body || {}

    if (!content?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: 'Комментарий или файл обязателен' },
        { status: 400 }
      )
    }

    const data: any = {
      content: content?.trim() || '',
      parentId: parentId || null,
      postId: params.id,
      authorId: me.id,
    }

    if (imageUrl) {
      data.imageUrl = imageUrl
    }

    const comment = await prisma.communityComment.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
      },
    })

    const formattedComment = {
      ...comment,
      author: {
        ...comment.author,
        avatarUrl: comment.author.avatarFileId
          ? `/api/files/${comment.author.avatarFileId}`
          : null,
      },
    }

    return NextResponse.json({ ok: true, comment: formattedComment }, { status: 201 })
  } catch (err) {
    console.error('🔥 Ошибка создания комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// ✏️ PATCH — редактировать комментарий
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { commentId, content } = await req.json()
    if (!commentId || !content?.trim())
      return NextResponse.json(
        { error: 'Некорректные данные' },
        { status: 400 }
      )

    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
    })
    if (!comment)
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    if (comment.authorId !== me.id)
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 })

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка PATCH комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 🗑 DELETE — удалить комментарий
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { commentId } = await req.json()
    if (!commentId)
      return NextResponse.json({ error: 'Не указан commentId' }, { status: 400 })

    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
    })
    if (!comment)
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    if (comment.authorId !== me.id)
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 })

    await prisma.communityComment.delete({ where: { id: commentId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка DELETE комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
