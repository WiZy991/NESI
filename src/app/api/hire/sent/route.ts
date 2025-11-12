import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

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
          select: { id: true, fullName: true, email: true, avatarFileId: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    // Преобразуем avatarFileId в avatarUrl
    const sentWithAvatars = sent.map(item => ({
      ...item,
      executor: {
        ...item.executor,
        avatarUrl: item.executor.avatarFileId ? `/api/files/${item.executor.avatarFileId}` : null,
      },
    }))
    
    return NextResponse.json(sentWithAvatars, { status: 200 })
  } catch (e) {
    logger.error('Ошибка получения отправленных запросов на найм', e, { userId: user?.id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
