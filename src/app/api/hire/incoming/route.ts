import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'executor') {
    return NextResponse.json({ error: 'Forbidden: executor only' }, { status: 403 })
  }

  try {
    const incoming = await prisma.hireRequest.findMany({
      where: { executorId: user.id },
      include: {
        customer: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(incoming, { status: 200 })
  } catch (e) {
    console.error('❌ /api/hire/incoming error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
