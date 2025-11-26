import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ responded: false }, { status: 401 })

  const { id: taskId } = await params

  const existing = await prisma.taskResponse.findFirst({
    where: {
      taskId,
      userId: user.id,
    },
  })

  return NextResponse.json({ responded: !!existing })
}
