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
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true, // ✅ аватарка
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    })

    return NextResponse.json({ posts })
  } catch (err: any) {
    console.error('❌ Ошибка получения постов:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Создать пост
export async function POST(req: NextRequest) {
  try {
    console.log('📩 Создание поста...')

    const me = await getUserFromRequest(req).catch((e) => {
      console.error('❌ Ошибка getUserFromRequest:', e)
      return null
    })

    console.log('👤 Пользователь:', me)

    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON:', e)
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      )
    }

    console.log('📦 Данные body:', body)

    const { title, content, imageUrl } = body || {}

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

    console.log('✅ Пост создан:', post.id)

    return NextResponse.json({ ok: true, post }, { status: 201 })
  } catch (err: any) {
    console.error('🔥 Ошибка создания поста:', err)
    return NextResponse.json(
      { error: 'Ошибка сервера', details: String(err) },
      { status: 500 }
    )
  }
}
