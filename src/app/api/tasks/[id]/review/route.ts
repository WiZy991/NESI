// src/app/api/tasks/[taskId]/review/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'

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
    console.log('🧩 POST review for taskId =', taskId)

    if (!taskId) {
      return NextResponse.json({ error: 'Не передан ID задачи' }, { status: 400 })
    }

    const { rating, comment } = await req.json()
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Оценка от 1 до 5 обязательна' }, { status: 400 })
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

    await createNotification({
      userId: toUserId,
      message: notifyMsg,
      link: `/tasks/${taskId}`,
      type: 'review',
    })

    sendNotificationToUser(toUserId, {
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

    // ✅ Начисляем XP за хороший отзыв (4+ звезды)
    if (rating >= 4 && toUserId) {
      try {
        await awardXP(
          toUserId,
          5, // +5 XP за хороший отзыв
          `Получен отзыв ${rating} звезд за задачу "${task.title}"`
        )

        // ✅ Проверяем бейджи после начисления XP
        const { checkAndAwardBadges } = await import('@/lib/badges/checkBadges')
        await checkAndAwardBadges(toUserId)
      } catch (xpError) {
        // Логируем ошибку, но не прерываем выполнение
        console.error('[XP] Ошибка начисления XP при отзыве:', xpError)
      }
    }

    return NextResponse.json({ review })
  } catch (e) {
    console.error('❌ Ошибка при создании отзыва:', e)
    return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 })
  }
}
