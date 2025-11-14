import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'executor') {
      return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
    }

    const taskId = params.id
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const existing = await prisma.taskResponse.findFirst({
      where: { taskId, userId: user.id },
      select: { id: true },
    })

    return NextResponse.json({ has: Boolean(existing) })
  } catch (err) {
    logger.error('my-response GET error', err, {
      taskId: params?.id,
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
