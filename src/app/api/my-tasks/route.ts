// app/api/my-tasks/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  if (user.role !== 'executor') {
    return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
  }

  const tasks = await prisma.task.findMany({
    where: {
      executorId: user.id,
    },
    include: {
      customer: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ tasks })
}
