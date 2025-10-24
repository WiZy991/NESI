import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req)
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, reason, description, postId, commentId } = await req.json()

    if (!type || !reason || (!postId && !commentId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const report = await prisma.communityReport.create({
      data: {
        type,
        reason,
        description,
        postId,
        commentId,
        reporterId: user.id,
      },
    })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('❌ Ошибка создания жалобы:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const reports = await prisma.communityReport.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('❌ Ошибка получения жалоб:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
