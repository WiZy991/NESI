import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Пагинация для ограничения количества загружаемых откликов
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = (page - 1) * limit

    // Оптимизированный запрос: используем select вместо include для избежания N+1
    const [responses, total] = await Promise.all([
      prisma.taskResponse.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          taskId: true,
          userId: true,
          message: true,
          createdAt: true,
          price: true,
          status: true,
          updatedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              status: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              subcategory: {
                select: {
                  id: true,
                  name: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          statusHistory: {
            select: {
              id: true,
              responseId: true,
              status: true,
              note: true,
              changedById: true,
              createdAt: true,
              changedBy: {
                select: { id: true, fullName: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.taskResponse.count({
        where: { userId: user.id },
      }),
    ])

    return NextResponse.json({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Ошибка при получении откликов пользователя', error, { userId: user?.id })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
