// app/api/my-tasks/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)

    // --- Проверка авторизации ---
    if (!user) {
      logger.warn('Пользователь не найден в токене при запросе /api/my-tasks')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    logger.debug('Запрос задач исполнителя', {
      userId: user.id,
      role: user.role,
    })

    // --- Проверяем роль ---
    if (user.role !== 'executor') {
      logger.warn('Доступ запрещён для роли', { role: user.role, userId: user.id })
      return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
    }

    // --- Пагинация ---
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100) // Максимум 100 задач
    const skip = (page - 1) * limit

    // --- Получаем задачи с пагинацией ---
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: {
          executorId: user.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          status: true,
          deadline: true,
          createdAt: true,
          executorKanbanColumn: true,
          executorKanbanOrder: true,
          customer: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: [
          { executorKanbanColumn: 'asc' },
          { executorKanbanOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.task.count({
        where: {
          executorId: user.id,
        },
      }),
    ])

    logger.debug('Найдено задач для исполнителя', {
      userId: user.id,
      tasksCount: tasks.length,
      total,
      page,
    })

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: unknown) {
    logger.error('Ошибка при получении задач исполнителя', err)
    return NextResponse.json(
      {
        error: 'Ошибка при загрузке задач',
        details: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    )
  }
}
