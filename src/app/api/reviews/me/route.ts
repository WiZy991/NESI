// /api/reviews/me/route.ts
import { getUserFromRequest } from '@/lib/auth'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // "received" | "left" | null

  try {
    const whereClause =
      type === 'left'
        ? { fromUserId: user.id } // отзывы, которые пользователь оставил
        : { toUserId: user.id } // отзывы, которые пользователь получил

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            customerId: true,
            executorId: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    logger.debug('Получены отзывы пользователя', { userId: user.id, type, count: reviews.length })
    return NextResponse.json({ reviews })
  } catch (error) {
    logger.error('Ошибка получения отзывов', error, { userId: user.id, type })
    return NextResponse.json(
      { error: 'Ошибка получения отзывов' },
      { status: 500 }
    )
  }
}
