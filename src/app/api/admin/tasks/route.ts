import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const tasks = await prisma.task.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tasks })
}
