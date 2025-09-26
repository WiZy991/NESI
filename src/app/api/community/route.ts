import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить список постов
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const posts = await prisma.communityPost.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        _count: { select: { comments: true, likes: true } },
      },
    })

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('Ошибка получения постов:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Создать пост
export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { title, content, imageUrl } = await req.json()

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Заполни заголовок и текст' },
        { status: 400 }
      )
    }

    const post = await prisma.communityPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl || null,
        authorId: me.id,
      },
    })

    return NextResponse.json({ ok: true, post }, { status: 201 })
  } catch (err) {
    console.error('Ошибка создания поста:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
