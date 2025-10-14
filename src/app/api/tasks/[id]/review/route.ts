import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const taskId = params.id
    const { rating, comment } = await req.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Оценка от 1 до 5 обязательна' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { executor: true, customer: true },
    })

    if (!task || !task.executorId || !task.customerId) {
      return NextResponse.json({ error: 'Задача не найдена или не имеет исполнителя/заказчика' }, { status: 404 })
    }

    if (task.status !== 'completed') {
      return NextResponse.json({ error: 'Можно оставить отзыв только после завершения задачи' }, { status: 400 })
    }

    const isCustomer = task.customerId === user.id
    const isExecutor = task.executorId === user.id

    if (!isCustomer && !isExecutor) {
      return NextResponse.json({ error: 'Вы не участник задачи' }, { status: 403 })
    }

    // Проверяем, оставлял ли пользователь уже отзыв по этой задаче
    const existingReview = await prisma.review.findFirst({
      where: {
        taskId,
        fromUserId: user.id,
      },
    })

    if (existingReview) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв по этой задаче' }, { status: 400 })
    }

    // Создаём отдельный отзыв
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        taskId,
        fromUserId: user.id,
        toUserId: isCustomer ? task.executorId : task.customerId,
      },
    })

    return NextResponse.json({ review })
  } catch (error) {
    console.error('❌ Ошибка создания отзыва:', error)
    return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 })
  }
}
