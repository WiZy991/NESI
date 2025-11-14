// src/app/api/tasks/[taskId]/review/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createNotificationWithSettings } from '@/lib/notify'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { logger } from '@/lib/logger'
import { awardXP } from '@/lib/level/awardXP'
import { z } from 'zod'
import { validateWithZod } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'

// Схема валидации для создания отзыва
const createReviewSchema = z.object({
	rating: z.number().int().min(1, 'Оценка должна быть от 1 до 5').max(5, 'Оценка должна быть от 1 до 5'),
	comment: z
		.string()
		.max(1000, 'Комментарий слишком длинный (максимум 1000 символов)')
		.trim()
		.optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { taskId?: string; id?: string } }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // ✅ Берём и taskId, и id, чтобы работало в любом случае
    const taskId = params.taskId || params.id
    logger.debug('POST review for taskId', { taskId, userId: user.id })

    if (!taskId) {
      return NextResponse.json({ error: 'Не передан ID задачи' }, { status: 400 })
    }

    let body
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }

    // Валидация данных
    const validation = validateWithZod(createReviewSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    const { rating, comment } = validation.data

    // Дополнительная валидация длины комментария
    if (comment) {
      const commentValidation = validateStringLength(comment, 1000, 'Комментарий')
      if (!commentValidation.valid) {
        return NextResponse.json(
          { error: commentValidation.error },
          { status: 400 }
        )
      }
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { customer: true, executor: true, review: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    }

    if (task.status !== 'completed') {
      return NextResponse.json({ error: 'Нельзя оставить отзыв до завершения задачи' }, { status: 400 })
    }

    const isCustomer = user.id === task.customerId
    const isExecutor = user.id === task.executorId

    if (!isCustomer && !isExecutor) {
      return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 })
    }

    const toUserId = isCustomer ? task.executorId : task.customerId
    if (!toUserId) {
      return NextResponse.json({ error: 'Некому оставить отзыв' }, { status: 400 })
    }

    const alreadyLeft = await prisma.review.findFirst({
      where: { taskId, fromUserId: user.id },
      select: { id: true },
    })
    if (alreadyLeft) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв по этой задаче' }, { status: 400 })
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        taskId,
        fromUserId: user.id,
        toUserId,
      },
    })

    const actorName = user.fullName || user.email
    const notifyMsg = `${actorName} оставил отзыв (${rating}⭐) по задаче «${task.title}»`

    const dbNotification = await createNotificationWithSettings({
      userId: toUserId,
      message: notifyMsg,
      link: `/tasks/${taskId}`,
      type: 'review',
    })

    // Если уведомление отключено в настройках, не отправляем SSE
    if (dbNotification) {
      sendNotificationToUser(toUserId, {
        id: dbNotification.id, // Включаем ID из БД для дедупликации
      type: 'review',
      title: 'Новый отзыв',
      message: notifyMsg,
      link: `/tasks/${taskId}`,
      taskTitle: task.title,
      rating,
      senderId: user.id,
      sender: actorName,
      playSound: true,
    })
    }

    // ✅ Начисляем XP за хороший отзыв (4+ звезды)
    if (rating >= 4 && toUserId) {
      try {
        await awardXP(
          toUserId,
          5, // +5 XP за хороший отзыв
          `Получен отзыв ${rating} звезд за задачу "${task.title}"`
        )

        // ✅ Проверяем бейджи после начисления XP
        // Проверяем достижения для получателя отзыва (исполнителя)
        const { checkAndAwardBadges } = await import('@/lib/badges/checkBadges')
        await checkAndAwardBadges(toUserId)
        
        // Также проверяем достижения для отправителя отзыва (заказчика)
        await checkAndAwardBadges(user.id)
      } catch (xpError) {
        // Логируем ошибку, но не прерываем выполнение
        logger.error('Ошибка начисления XP при отзыве', xpError, {
          taskId,
          toUserId,
          fromUserId: user.id,
          rating,
        })
      }
    }

    return NextResponse.json({ review })
  } catch (e) {
    logger.error('Ошибка при создании отзыва', e, {
      taskId: params.taskId || params.id,
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 })
  }
}
