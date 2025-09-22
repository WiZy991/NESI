// app/api/notifications/unread-count/route.ts
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Исключаем login из счётчика
const count = await prisma.notification.count({
  where: {
    userId: user.id,
    isRead: false,
    NOT: {
      type: 'login',
    },
  },
})


  return NextResponse.json({ count })
}
