import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/tasks/favorites - Получить все избранные задачи пользователя
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = (page - 1) * limit

    // Получаем закладки с задачами
    const [favorites, total] = await Promise.all([
      prisma.userFavoriteTask.findMany({
        where: {
          userId: user.id,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              deadline: true,
              status: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avgRating: true,
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
              _count: {
                select: {
                  responses: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.userFavoriteTask.count({
        where: {
          userId: user.id,
        },
      }),
    ])

    const tasks = favorites.map((f) => ({
      ...f.task,
      favoritedAt: f.createdAt,
    }))

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    logger.error('Ошибка при получении избранных задач', error, {
      userId: user?.id,
    })
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении избранных задач' },
      { status: 500 }
    )
  }
}

