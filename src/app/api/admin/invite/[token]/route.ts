import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// ─────────────────────────────
// Проверка токена
// GET /api/admin/invite/[token]
// ─────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.adminInvite.findUnique({
    where: { token: params.token },
  })

  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Токен недействителен' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────
// Активация токена
// POST /api/admin/invite/[token]/accept
// ─────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const invite = await prisma.adminInvite.findUnique({
    where: { token: params.token },
  })

  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Токен недействителен' }, { status: 400 })
  }

  // Обновляем роль пользователя
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  })

  // Помечаем токен как использованный
  await prisma.adminInvite.update({
    where: { id: invite.id },
    data: { used: true, usedBy: user.id },
  })

  return NextResponse.json({ success: true })
}
