import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { amount } = await req.json()
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: amount },
        transactions: {
          create: {
            amount,
            type: 'deposit',
            reason: 'Пополнение баланса',
          },
        },
      },
      select: { balance: true },
    })

    return NextResponse.json({ success: true, balance: updated.balance })
  } catch (err) {
    console.error('Ошибка пополнения:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
