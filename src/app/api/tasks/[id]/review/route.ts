// src/app/api/tasks/[taskId]/review/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ исправлено
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: taskId } = await params // ✅ теперь params можно await
    const { rating, comment } = await req.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Оценка от 1 до 5 обязательна' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        customer: true,
        executor: true,
        reviews: true, // корректно для твоей модели
      },
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
    const taskTitle = task.title
    const notifyMsg = `${actorName} оставил отзыв (${rating}⭐) по задаче «${taskTitle}»`

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
      taskTitle,
      rating,
      senderId: user.id,
      sender: actorName,
      playSound: true,
    })

    return NextResponse.json({ review })
  } catch (e) {
    console.error('❌ Ошибка при создании отзыва:', e)
    return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 })
  }
}
