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

  if (task.customerId !== user.id) {
    return NextResponse.json({ error: 'Только автор задачи может оставить отзыв' }, { status: 403 })
  }

  if (task.review) {
    return NextResponse.json({ error: 'Отзыв уже оставлен' }, { status: 400 })
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      taskId,
      fromUserId: user.id,         // Автор отзыва — заказчик
      toUserId: task.executorId,   // Получатель — исполнитель
    }
  })

  return NextResponse.json({ review })
}
