import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden: customer only' }, { status: 403 })
  }

  try {
    const sent = await prisma.hireRequest.findMany({
      where: { customerId: user.id },
      select: {
        id: true,
        createdAt: true,
        paid: true,
        status: true,
        message: true,
        amount: true,
        executor: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(sent, { status: 200 })
  } catch (e) {
    console.error('❌ /api/hire/sent error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
