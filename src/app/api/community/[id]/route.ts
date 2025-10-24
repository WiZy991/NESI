import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить один пост по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        comments: {
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
        },
        _count: { select: { likes: true } },
      },
    })

    if (!post) {
  // возвращаем "виртуальный пост", чтобы фронт не падал
  return NextResponse.json({
    post: {
      id: params.id,
      title: '[Пост удалён]',
      content: '🚫 Этот пост был удалён администрацией',
      createdAt: new Date().toISOString(),
      author: {
        id: 'deleted',
        fullName: 'Администратор',
        email: 'hidden',
        avatarUrl: null,
      },
      comments: [],
      _count: { likes: 0 },
    },
    liked: false,
  })
}

    // Проверяем, лайкал ли текущий пользователь
    let liked = false
    if (me) {
      const like = await prisma.communityLike.findUnique({
        where: { postId_userId: { postId: params.id, userId: me.id } },
      })
      liked = !!like
    }

    // Формируем корректные ссылки на аватарки
    const formatted = {
      ...post,
      liked,
      author: {
        ...post.author,
        avatarUrl: post.author.avatarFileId
          ? `/api/files/${post.author.avatarFileId}`
          : null,
      },
      comments: post.comments.map((c) => ({
        ...c,
        author: {
          ...c.author,
          avatarUrl: c.author.avatarFileId
            ? `/api/files/${c.author.avatarFileId}`
            : null,
        },
      })),
    }

    return NextResponse.json({ post: formatted, liked })
  } catch (err) {
    console.error('Ошибка /api/community/[id]:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 🗑 Удалить пост
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
    })
    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 })
    }

    if (post.authorId !== me.id) {
      return NextResponse.json(
        { error: 'Нет прав на удаление этого поста' },
        { status: 403 }
      )
    }

    await prisma.communityPost.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка удаления поста:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
