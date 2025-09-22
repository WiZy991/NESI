// src/app/api/hire/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const executorId = searchParams.get('executorId') || ''
  if (!executorId) return NextResponse.json({ error: 'executorId обязателен' }, { status: 400 })

  const existing = await prisma.hireRequest.findFirst({
    where: {
      customerId: me.id,
      executorId,
      status: { in: ['pending', 'accepted'] }, // только активные
    },
    select: { id: true, status: true, createdAt: true },
  })

  if (!existing) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({
    exists: true,
    hireId: existing.id,
    status: existing.status, // 'pending' | 'accepted'
  })
}
