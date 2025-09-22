import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/[id]
//  ▸ Возвращаем задачу + subcategory (для сертификации и minPrice), автора,
//    исполнителя, отзыв и отклики с базовой инфой по пользователю.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const task = await prisma.task.findUnique({
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
        // НУЖНО для сертификации на фронте + порог цены
        subcategory: {
          select: {
            id: true,
            name: true,
            minPrice: true,                           // ⬅️ ДОБАВЛЕНО
            category: { select: { id: true, name: true } },
          },
        },
        // отклики с базовой инфой по пользователю и его рейтингами
        responses: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                reviewsReceived: {
                  select: { rating: true },
                },
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (err) {
    console.error('Ошибка при GET задачи:', err)
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

    const { title, description } = await req.json()
    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Заполни все поля' }, { status: 400 })
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { title, description },
    })

    return NextResponse.json({ task: updated })
  } catch (err) {
    console.error('Ошибка при PATCH задачи:', err)
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
      return NextResponse.json({ error: 'Можно удалить только открытую задачу' }, { status: 400 })

    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Ошибка при DELETE задачи:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
