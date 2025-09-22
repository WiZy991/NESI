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
      where: { toUserId: user.id },
      include: {
        task: {
          select: {
            title: true,
          },
        },
        fromUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('❌ Ошибка получения отзывов:', error)
    return NextResponse.json({ error: 'Ошибка получения отзывов' }, { status: 500 })
  }
}
