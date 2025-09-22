// src/app/api/user/[id]/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        skills: true,
        location: true,
        description: true,
        reviewsReceived: { select: { rating: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // ТОТ ЖЕ ФОРМАТ, ЧТО И /api/users/[id]
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Ошибка получения пользователя:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
