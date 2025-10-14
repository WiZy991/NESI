import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authUser } from '@/lib/authUser'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await authUser(req)
    if (!user || user.role !== 'executor') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const response = await prisma.taskResponse.findFirst({
      where: { taskId: params.id, userId: user.id },
      select: { id: true },
    })

    return NextResponse.json({ response })
  } catch (err) {
    console.error('Ошибка при проверке отклика:', err)
    return NextResponse.json({ error: 'Ошибка при проверке отклика' }, { status: 500 })
  }
}
