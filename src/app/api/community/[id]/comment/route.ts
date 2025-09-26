import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { content } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Комментарий пустой' }, { status: 400 })

    const comment = await prisma.communityComment.create({
      data: { content: content.trim(), postId: params.id, authorId: me.id },
    })

    return NextResponse.json({ comment })
  } catch (err) {
    console.error('Ошибка добавления комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
