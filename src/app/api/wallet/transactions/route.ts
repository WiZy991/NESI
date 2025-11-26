import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const tx = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        amount: true,
        type: true,
        reason: true,
        createdAt: true,
        status: true,
        dealId: true,
        paymentId: true,
      },
    })

    return NextResponse.json({ transactions: tx })
  } catch (error: any) {
    console.error('❌ [TRANSACTIONS] Ошибка загрузки транзакций:', error)
    logger.error('Ошибка загрузки транзакций', error)
    
    return NextResponse.json(
      { 
        error: 'Ошибка загрузки транзакций',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
