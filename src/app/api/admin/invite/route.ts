import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24ч

  const invite = await prisma.adminInvite.create({
    data: { token, expiresAt },
  })

  return NextResponse.json({
    url: `/admin-invite/${invite.token}`,
    expiresAt,
  })
}
