import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    await prisma.communityPost.update({
      where: { id: params.id },
      data: {
        content: '[Пост удалён администрацией]',
        title: '',
        imageUrl: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('🔥 Ошибка удаления поста админом:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
