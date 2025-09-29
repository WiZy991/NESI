import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, context: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (user.role !== 'executor') {
      return NextResponse.json({ error: 'Только исполнители могут откликаться' }, { status: 403 })
    }

    const taskId = context.params.id
    const { message, price } = await req.json()

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, subcategoryId: true }
    })
    if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    if (task.status !== 'open') {
      return NextResponse.json({ error: 'Отклик возможен только на открытые задачи' }, { status: 400 })
    }

    // Глобальная проверка: исполнитель должен иметь хотя бы одну сертификацию
    const hasAnyCert = await prisma.userCertification.findFirst({
      where: { userId: user.id }
    })
    if (!hasAnyCert) {
      return NextResponse.json(
        { error: 'Для откликов нужна сертификация' },
        { status: 403 }
      )
    }

    // Если у задачи указана подкатегория → нужна сертификация именно по ней
    if (task.subcategoryId) {
      const cert = await prisma.userCertification.findUnique({
        where: {
          userId_subcategoryId: { userId: user.id, subcategoryId: task.subcategoryId }
        }
      })
      if (!cert) {
        return NextResponse.json(
          { error: 'Для этой подкатегории нужна отдельная сертификация' },
          { status: 403 }
        )
      }
    }

    // Создаём (или обновляем) отклик
    const response = await prisma.taskResponse.upsert({
      where: { taskId_userId: { taskId, userId: user.id } },
      create: {
        taskId,
        userId: user.id,
        message: message ?? null,
        price: typeof price === 'number' ? price : null
      },
      update: {
        message: message ?? null,
        price: typeof price === 'number' ? price : null
      }
    })

    return NextResponse.json({ ok: true, response })
  } catch (e) {
    console.error('POST /api/tasks/[id]/respond error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
