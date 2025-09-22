import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  await prisma.taskResponse.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
