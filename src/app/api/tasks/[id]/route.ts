import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { recordTaskResponseStatus } from '@/lib/taskResponseStatus'
import { logger } from '@/lib/logger'
import type { TaskResponse } from '@/types/api'
import { getLevelFromXP } from '@/lib/level/calculate'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(req).catch(() => null)

    let task: TaskResponse | null = await prisma.task.findUnique({
      where: { id },
      include: {
        // автор
        customer: {
          select: { id: true, fullName: true, email: true },
        },
        // исполнитель (если есть)
        executor: {
          select: { id: true, fullName: true, email: true },
        },
        // отзыв (если есть)
        review: true,
        // для сертификации на фронте + порог цены
        subcategory: {
          select: {
            id: true,
            name: true,
            minPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
        // отклики с пользователями (убрали reviewsReceived для оптимизации N+1)
        responses: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avgRating: true, // Используем предвычисленный avgRating вместо reviewsReceived
                xp: true, // Добавляем XP для расчета уровня
              },
            },
            statusHistory: {
              orderBy: { createdAt: 'asc' },
              include: {
                changedBy: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        // 🔥 файлы задачи
        files: true,
      },
    }) as TaskResponse | null

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    }

    if (user && task.customerId === user.id) {
      const pendingResponses = (task.responses || []).filter(
        (response: { status: string }) => response.status === 'pending'
      )

      if (pendingResponses.length > 0) {
        await prisma.$transaction(async tx => {
          for (const response of pendingResponses) {
            await recordTaskResponseStatus(response.id, 'viewed', {
              changedById: user.id,
              note: 'Заказчик просмотрел отклик',
              tx,
            })
          }
        })

        const updatedTask = await prisma.task.findUnique({
          where: { id },
          include: {
            customer: { select: { id: true, fullName: true, email: true } },
            executor: { select: { id: true, fullName: true, email: true } },
            review: true,
            subcategory: {
              select: {
                id: true,
                name: true,
                minPrice: true,
                category: { select: { id: true, name: true } },
              },
            },
            responses: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avgRating: true, // Используем предвычисленный avgRating вместо reviewsReceived
                    xp: true, // Добавляем XP для расчета уровня
                  },
                },
                statusHistory: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    changedBy: { select: { id: true, fullName: true, email: true } },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            files: true,
          },
        }) as TaskResponse | null
        
        if (updatedTask) {
          task = updatedTask
        }
      }
    }

    // 🎯 Сортируем отклики по уровню (высокий уровень → низкий), затем по дате
    if (task.responses && task.responses.length > 0) {
      // Вычисляем уровни для всех откликов
      const responsesWithLevels = await Promise.all(
        task.responses.map(async (response: any) => {
          const baseXp = response.user?.xp || 0
          const passedTests = await prisma.certificationAttempt.count({
            where: { userId: response.userId, passed: true },
          })
          const xpComputed = baseXp + passedTests * 10
          const levelInfo = await getLevelFromXP(xpComputed)
          
          return {
            ...response,
            _level: levelInfo.level,
            _levelInfo: levelInfo,
          }
        })
      )

      // Сортируем: сначала по уровню (убывание), затем по дате (убывание)
      responsesWithLevels.sort((a, b) => {
        if (b._level !== a._level) {
          return b._level - a._level // Высокий уровень первым
        }
        // Если уровни равны, сортируем по дате
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // Убираем временные поля _level и _levelInfo перед отправкой
      task.responses = responsesWithLevels.map(({ _level, _levelInfo, ...rest }) => ({
        ...rest,
        userLevel: _level,
        userLevelInfo: _levelInfo,
      }))
    }

    return NextResponse.json({ task })
  } catch (err) {
    logger.error('Ошибка при GET задачи', err, { taskId: id })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tasks/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    if (task.customerId !== user.id) return NextResponse.json({ error: 'Нет прав' }, { status: 403 })
    if (task.status !== 'open')
      return NextResponse.json(
        { error: 'Задачу можно редактировать только если она открыта' },
        { status: 400 }
      )

    let body: { title?: string; description?: string }
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }

    const { title, description } = body

    // Валидация данных
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Заголовок обязателен' }, { status: 400 })
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Описание обязательно' }, { status: 400 })
    }

    // Валидация длины
    const { validateStringLength } = await import('@/lib/security')
    const titleValidation = validateStringLength(title.trim(), 200, 'Заголовок')
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      )
    }

    const descriptionValidation = validateStringLength(description.trim(), 5000, 'Описание')
    if (!descriptionValidation.valid) {
      return NextResponse.json(
        { error: descriptionValidation.error },
        { status: 400 }
      )
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { title, description },
    })

    return NextResponse.json({ task: updated })
  } catch (err) {
    logger.error('Ошибка при PATCH задачи', err, { taskId: id })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    if (task.customerId !== user.id) return NextResponse.json({ error: 'Нет прав' }, { status: 403 })
    if (task.status !== 'open')
      return NextResponse.json(
        { error: 'Можно удалить только открытую задачу' },
        { status: 400 }
      )

    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Ошибка при DELETE задачи', err, { taskId: id })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
