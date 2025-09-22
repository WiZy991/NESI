import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ responded: false }, { status: 401 })

  const existing = await prisma.taskResponse.findFirst({
    where: {
      taskId: params.id,
      userId: user.id,
    },
  })

  return NextResponse.json({ responded: !!existing })
}
