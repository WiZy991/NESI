import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { blocked: true },
  })
  
  console.log(`🔒 Пользователь ${updated.email} заблокирован`)

  return NextResponse.json({
    user: updated,
    message: 'Пользователь заблокирован',
  })
}
