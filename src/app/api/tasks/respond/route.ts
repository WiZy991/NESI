import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'executor') {
    return NextResponse.json({ error: 'Нет прав' }, { status: 403 })
  }

  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'Нет id задачи' }, { status: 400 })

  // Проверка: не владелец, не дублирует отклик, задача открыта
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
  if (task.customerId === user.id) return NextResponse.json({ error: 'Нельзя откликнуться на свою задачу' }, { status: 400 })
  if (task.status !== 'open') return NextResponse.json({ error: 'Задача не открыта' }, { status: 400 })

  const exists = await prisma.taskResponse.findUnique({
    where: { taskId_userId: { taskId, userId: user.id } }
  })
  if (exists) return NextResponse.json({ error: 'Вы уже откликались' }, { status: 400 })

  await prisma.taskResponse.create({
    data: {
      taskId,
      userId: user.id,
    }
  })

  return NextResponse.json({ success: true })
}
