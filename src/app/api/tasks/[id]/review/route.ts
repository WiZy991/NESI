import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const taskId = params.id
  const { rating, comment } = await req.json()

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Оценка от 1 до 5 обязательна' }, { status: 400 })
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { executor: true, review: true },
  })

  if (!task || !task.executorId) {
    return NextResponse.json({ error: 'Задача не найдена или не имеет исполнителя' }, { status: 404 })
  }

  if (task.status !== 'completed') {
    return NextResponse.json({ error: 'Можно оставить отзыв только после завершения задачи' }, { status: 400 })
  }

  const isCustomer = task.customerId === user.id
  const isExecutor = task.executorId === user.id

  if (!isCustomer && !isExecutor) {
    return NextResponse.json({ error: 'Вы не участник задачи' }, { status: 403 })
  }

  // --- Если отзыв уже есть, дополняем его ---
  if (task.review) {
    const existingComment = task.review.comment || ''

    if (isCustomer && existingComment.includes('[ОТ ЗАКАЗЧИКА]:')) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв как заказчик' }, { status: 400 })
    }

    if (isExecutor && existingComment.includes('[ОТ ИСПОЛНИТЕЛЯ]:')) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв как исполнитель' }, { status: 400 })
    }

    // Формируем текст с пометкой
    const newComment = existingComment + 
      (existingComment ? '\n' : '') + 
      (isCustomer
        ? `[ОТ ЗАКАЗЧИКА]: ${comment}`
        : `[ОТ ИСПОЛНИТЕЛЯ]: ${comment}`)

    await prisma.review.update({
      where: { taskId },
      data: {
        comment: newComment,
        // рейтинг можно усреднять, но пока просто берём последний
        rating,
      },
    })

    return NextResponse.json({ success: true, message: 'Отзыв добавлен' })
  }

  // --- Если отзыв ещё не создан, создаём ---
  const review = await prisma.review.create({
    data: {
      rating,
      comment: isCustomer
        ? `[ОТ ЗАКАЗЧИКА]: ${comment}`
        : `[ОТ ИСПОЛНИТЕЛЯ]: ${comment}`,
      taskId,
      fromUserId: user.id,
      toUserId: isCustomer ? task.executorId : task.customerId,
    },
  })

  return NextResponse.json({ review })
}
