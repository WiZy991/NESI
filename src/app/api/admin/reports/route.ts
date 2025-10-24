import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить все жалобы (только для админа)
export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const reports = await prisma.communityReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            postId: true,
          },
        },
      },
    })

    // 🧩 Добавляем корректные ссылки
    const reportsWithLinks = reports.map((r) => {
      let targetLink = null

      if (r.type === 'post' && r.post?.id) {
        targetLink = `/community/${r.post.id}`
      } else if (r.type === 'comment' && r.comment?.postId) {
        targetLink = `/community/${r.comment.postId}#comment-${r.comment.id}`
      }

      return {
        ...r,
        targetLink,
      }
    })

    return NextResponse.json({ reports: reportsWithLinks })
  } catch (err) {
    console.error('🔥 Ошибка загрузки жалоб:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
