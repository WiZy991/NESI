import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить список постов
export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const posts = await prisma.communityPost.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
        likes: me
          ? { where: { userId: me.id }, select: { id: true } }
          : false,
      },
    })

    const formatted = posts.map((p) => ({
      ...p,
      liked: me ? p.likes.length > 0 : false,
      author: {
        ...p.author,
        avatarUrl: p.author.avatarFileId
          ? `/api/files/${p.author.avatarFileId}`
          : null,
      },
    }))

    return NextResponse.json({ posts: formatted })
  } catch (err: any) {
    console.error('❌ Ошибка получения постов:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Создать пост (без заголовка)
export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      )
    }

    const { content, imageUrl } = body || {}
    if (!content?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: 'Пост не может быть пустым' },
        { status: 400 }
      )
    }

    const post = await prisma.communityPost.create({
      data: {
        title: '',
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        authorId: me.id,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    })

    const formattedPost = {
      ...post,
      author: {
        ...post.author,
        avatarUrl: post.author.avatarFileId
          ? `/api/files/${post.author.avatarFileId}`
          : null,
      },
    }

    return NextResponse.json({ ok: true, post: formattedPost }, { status: 201 })
  } catch (err: any) {
    console.error('🔥 Ошибка создания поста:', err)
    return NextResponse.json(
      { error: 'Ошибка сервера', details: String(err) },
      { status: 500 }
    )
  }
}
