import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { hasActiveTask } from '@/lib/guards'
import { recordTaskResponseStatus } from '@/lib/taskResponseStatus'

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  if (me.role !== 'executor') {
    return NextResponse.json({ error: 'Только исполнитель может откликаться' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { taskId, message, price } = body || {}
  if (!taskId) {
    return NextResponse.json({ error: 'taskId обязателен' }, { status: 400 })
  }

  // 🔒 ГАРД: есть ли активная задача у исполнителя?
  if (await hasActiveTask(me.id)) {
    return NextResponse.json(
      { error: 'У вас уже есть активная задача. Завершите её, чтобы взять следующую.' },
      { status: 409 }
    )
  }

  // --- дальше твоя существующая логика валидации/минималок/дубликатов и т.п. ---
  // Проверим, что задача существует и открыта
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true },
  })
  if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
  if (task.status !== 'open') {
    return NextResponse.json({ error: 'Задача уже недоступна для откликов' }, { status: 400 })
  }

  // Не даём отправлять повторный отклик этого пользователя на ту же задачу
  const exists = await prisma.taskResponse.findUnique({
    where: { taskId_userId: { taskId, userId: me.id } },
  })
  if (exists) {
    return NextResponse.json({ error: 'Вы уже откликались на эту задачу' }, { status: 409 })
  }

  const created = await prisma.$transaction(async tx => {
    const response = await tx.taskResponse.create({
      data: {
        taskId,
        userId: me.id,
        message: message ?? null,
        price: price ?? null,
      },
    })

    await recordTaskResponseStatus(response.id, 'pending', {
      changedById: me.id,
      note: 'Отклик отправлен',
      tx,
    })

    return response
  })

  return NextResponse.json(created, { status: 201 })
}
