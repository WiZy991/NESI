import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portfolio/user/[userId]
 * Получить портфолио другого пользователя (публичный просмотр)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: params.userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(portfolio)
  } catch (err) {
    console.error('❌ Ошибка получения портфолио пользователя:', err)
    return NextResponse.json(
      { error: 'Ошибка получения портфолио' },
      { status: 500 }
    )
  }
}

