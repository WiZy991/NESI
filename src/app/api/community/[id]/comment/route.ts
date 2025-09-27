import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.communityComment.findMany({
      where: { postId: params.id, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarFileId: true },
        },
        children: {
          include: {
            author: {
              select: { id: true, fullName: true, email: true, avatarFileId: true },
            },
          },
        },
        _count: { select: { children: true, likes: true } },
      },
    })

    return NextResponse.json({ comments })
  } catch (err) {
    console.error('🔥 Ошибка загрузки комментариев:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
