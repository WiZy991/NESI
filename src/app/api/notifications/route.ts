// app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      NOT: {
        type: 'login', // 👈 исключаем системные
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ notifications })
}
