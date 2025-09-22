import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { balance: true },
  })

  return NextResponse.json({ balance: fresh?.balance ?? 0 })
}
