import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const customer = await getUserFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { executorId, price } = await req.json()
  if (!executorId || !price) return NextResponse.json({ error: 'Данные не указаны' }, { status: 400 })
  if (customer.balance < price) return NextResponse.json({ error: 'Недостаточно средств' }, { status: 400 })

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      executorId,
      status: 'in_progress',
      escrowAmount: price,
    },
  })

  await prisma.user.update({
    where: { id: customer.id },
    data: {
      balance: { decrement: price },
      transactions: {
        create: { amount: -price, type: 'escrow', reason: `Заморозка для задачи ${task.title}` },
      },
    },
  })

  return NextResponse.json({ task })
}
