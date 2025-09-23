import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        skills: true,
        location: true,
        description: true,
        avatarFileId: true, // используем новое поле
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

    // Добавляем avatarUrl, чтобы фронту было удобно
    const userWithAvatar = {
      ...user,
      avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}` : null,
    }

    return NextResponse.json({ user: userWithAvatar })
  } catch (error) {
    console.error('[USER_API_ERROR]', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
