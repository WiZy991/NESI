import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })

  const responseId = params.id

  const response = await prisma.taskResponse.findUnique({
    where: { id: responseId },
    include: { task: true },
  })

  if (!response) {
    return NextResponse.json({ error: 'Отклик не найден' }, { status: 404 })
  }

  // Только автор отклика может удалить его, и только если задача ещё открыта
  const isOwner = response.userId === user.id
  const isTaskOpen = response.task.status === 'open'

  if (!isOwner) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  if (!isTaskOpen) {
    return NextResponse.json({ error: 'Нельзя отозвать отклик — задача уже в работе или завершена' }, { status: 400 })
  }

  await prisma.taskResponse.delete({
    where: { id: responseId },
  })

  return NextResponse.json({ success: true })
}
