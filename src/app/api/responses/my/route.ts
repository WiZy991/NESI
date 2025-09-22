import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const responses = await prisma.taskResponse.findMany({
      where: { userId: user.id },
      include: {
        task: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ responses })
  } catch (error) {
    console.error('❌ Ошибка при получении откликов:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
