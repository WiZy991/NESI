// /api/reviews/me/route.ts
import { getUserFromRequest } from '@/lib/auth'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const reviews = await prisma.review.findMany({
      where: {
        toUserId: user.id, // Получатель отзыва
      },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const filtered = reviews.filter(r =>
      r.task.customerId === user.id || r.task.executorId === user.id
    )

    return NextResponse.json({ reviews: filtered })
  } catch (error) {
    console.error('❌ Ошибка получения отзывов:', error)
    return NextResponse.json(
      { error: 'Ошибка получения отзывов' },
      { status: 500 }
    )
  }
}
