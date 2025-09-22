import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { userId } = await context.params  // ✅ теперь асинхронно

  if (!userId) {
    return NextResponse.json({ error: 'userId не передан' }, { status: 400 })
  }

  const messages = await prisma.privateMessage.findMany({
    where: {
      OR: [
        { senderId: me.id, recipientId: userId },
        { senderId: userId, recipientId: me.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(messages)
}
