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
            avatarUrl: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    })

    // помечаем лайки текущего юзера
    let withLikes = posts
    if (me) {
      const liked = await prisma.communityLike.findMany({
        where: { userId: me.id, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      })
      const likedIds = new Set(liked.map((l) => l.postId))
      withLikes = posts.map((p) => ({ ...p, liked: likedIds.has(p.id) }))
    }

    return NextResponse.json({ posts: withLikes })
  } catch (err: any) {
    console.error('❌ Ошибка получения постов:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Создать пост
export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { title, content, imageUrl } = await req.json()
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Заполни заголовок и текст' }, { status: 400 })
    }

    const post = await prisma.communityPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl || null,
        authorId: me.id,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    })

    return NextResponse.json({ ok: true, post: { ...post, liked: false } }, { status: 201 })
  } catch (err: any) {
    console.error('🔥 Ошибка создания поста:', err)
    return NextResponse.json({ error: 'Ошибка сервера', details: String(err) }, { status: 500 })
  }
}
