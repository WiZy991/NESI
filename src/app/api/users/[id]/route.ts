// src/app/api/users/[id]/route.ts
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
        level: true,
        badges: { include: { badge: true } },
        reviewsReceived: { select: { rating: true } },
        tasks: {
          include: {
            executor: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // ЕДИНЫЙ ФОРМАТ
    return NextResponse.json({ user })
  } catch (error) {
    console.error('[USER_API_ERROR]', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
