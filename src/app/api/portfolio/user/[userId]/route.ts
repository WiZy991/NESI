import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portfolio/user/[userId]
 * Получить портфолио другого пользователя (публичный просмотр)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // В Next.js 15+ params - это промис, нужно await'ить
    const { userId } = await params
    
    // Используем select вместо include, чтобы избежать проблем с отсутствующим полем mediaType
    const portfolio = await prisma.portfolio.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        imageUrl: true,
        externalUrl: true,
        taskId: true,
        createdAt: true,
        updatedAt: true,
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

    // Убеждаемся, что у всех элементов есть mediaType (добавляем по умолчанию, если поле отсутствует в БД)
    const result = portfolio.map((item: any) => ({
      ...item,
      mediaType: item.mediaType || 'image',
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('❌ Ошибка получения портфолио пользователя:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    })
    return NextResponse.json(
      { error: 'Ошибка получения портфолио', details: process.env.NODE_ENV === 'development' ? err?.message : undefined },
      { status: 500 }
    )
  }
}

