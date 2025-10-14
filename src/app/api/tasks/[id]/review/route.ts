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

  // Если отзыва ещё нет — создаём пустую запись с JSON
  let existing = task.review
  if (!existing) {
    existing = await prisma.review.create({
      data: {
        taskId,
        fromUserId: isCustomer ? task.customerId : task.executorId,
        toUserId: isCustomer ? task.executorId : task.customerId,
        rating,
        comment: JSON.stringify({ customer: '', executor: '' }),
      },
    })
  }

  const json = JSON.parse(existing.comment || '{}')

  if (isCustomer) {
    if (json.customer) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв' }, { status: 400 })
    }
    json.customer = comment
  }

  if (isExecutor) {
    if (json.executor) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв' }, { status: 400 })
    }
    json.executor = comment
  }

  const updated = await prisma.review.update({
    where: { taskId },
    data: {
      rating,
      comment: JSON.stringify(json),
    },
  })

  return NextResponse.json({ review: updated })
}
