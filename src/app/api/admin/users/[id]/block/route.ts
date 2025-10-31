import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { duration, reason } = body // duration в днях, 0 = навсегда
  
  let blockedUntil: Date | null = null
  
  if (duration && duration > 0) {
    // Временная блокировка
    blockedUntil = new Date()
    blockedUntil.setDate(blockedUntil.getDate() + duration)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      blocked: true,
      blockedUntil,
      blockedReason: reason || 'Нарушение правил платформы',
    },
  })
  
  console.log(`🔒 Пользователь ${updated.email} заблокирован ${blockedUntil ? `до ${blockedUntil.toLocaleString('ru-RU')}` : 'навсегда'}. Причина: ${reason || 'не указана'}`)

  return NextResponse.json({
    user: updated,
    message: blockedUntil
      ? `Пользователь заблокирован до ${blockedUntil.toLocaleString('ru-RU')}`
      : 'Пользователь заблокирован навсегда',
  })
}
