// src/app/api/community/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    await prisma.communityView.create({
      data: { postId: params.id, userId: me?.id || null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка просмотра:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
