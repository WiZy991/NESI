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
      select: {
        id: true,
        createdAt: true,
        paid: true,
        status: true,
        message: true,
        amount: true,
        customer: {
          select: { id: true, fullName: true, email: true, avatarFileId: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    // Преобразуем avatarFileId в avatarUrl
    const incomingWithAvatars = incoming.map(item => ({
      ...item,
      customer: {
        ...item.customer,
        avatarUrl: item.customer.avatarFileId ? `/api/files/${item.customer.avatarFileId}` : null,
      },
    }))
    
    return NextResponse.json(incomingWithAvatars, { status: 200 })
  } catch (e) {
    console.error('❌ /api/hire/incoming error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
