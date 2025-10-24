import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, targetId, reason, description } = body

    if (!type || !targetId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Определяем, куда сохранять — пост или комментарий
    const data: any = {
      type,
      reason,
      description,
      reporterId: user.id,
    }

    if (type === 'post') data.postId = targetId
    if (type === 'comment') data.commentId = targetId

    const report = await prisma.communityReport.create({ data })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Ошибка создания жалобы:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const reports = await prisma.communityReport.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Ошибка получения жалоб:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
