import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { content, parentId } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Комментарий пустой' }, { status: 400 })

    const comment = await prisma.communityComment.create({
      data: {
        content: content.trim(),
        postId: params.id,
        authorId: me.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        _count: {
          select: { children: true, likes: true },
        },
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('🔥 Ошибка добавления комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера', details: String(err) }, { status: 500 })
  }
}
