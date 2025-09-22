import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getUserFromRequest(req)
  if (!me) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { action }: { action: 'accept' | 'reject' } = await req.json()

  // 🔎 Получаем заявку найма
  const hr = await prisma.hireRequest.findUnique({
    where: { id: params.id },
    select: { id: true, executorId: true, status: true },
  })

  if (!hr) {
    return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
  }

  // 🔒 Только исполнитель может принять/отклонить входящую заявку
  if (hr.executorId !== me.id) {
    return NextResponse.json(
      { error: 'Можно управлять только своими входящими заявками' },
      { status: 403 }
    )
  }

  // 🛑 Защита от повторной обработки
  if (hr.status !== 'pending') {
    return NextResponse.json(
      { error: 'Заявка уже обработана' },
      { status: 400 }
    )
  }

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'

  const updated = await prisma.hireRequest.update({
    where: { id: hr.id },
    data: { status: newStatus },
  })

  // 🔔 (опционально: здесь можно отправить уведомление)

  return NextResponse.json(updated)
}
