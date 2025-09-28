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
        select: { id: true, fullName: true, email: true, avatarFileId: true },
      },
    },
  })

  // Рекурсивно добавляем replies в каждый ответ
  for (const reply of replies) {
    (reply as any).replies = await getReplies(reply.id)
  }

  return replies
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.communityComment.findMany({
      where: {
        postId: params.id,
        parentId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarFileId: true },
        },
      },
    })

    // рекурсивно добавляем вложенные ответы
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        replies: await getReplies(comment.id),
      }))
    )

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (err) {
    console.error('🔥 Ошибка загрузки комментариев:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Добавление комментария — остаётся как у тебя, без изменений
