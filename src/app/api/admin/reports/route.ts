import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

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
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // 🧩 Формируем корректные ссылки для админки
    const reportsWithLinks = reports.map((r) => {
      let targetLink = null

      if (r.type === 'post' && r.post?.id) {
        targetLink = `/community/${r.post.id}`
      } else if (r.type === 'comment' && r.comment?.postId) {
        targetLink = `/community/${r.comment.postId}#comment-${r.comment.id}`
      } else if (r.type === 'task' && r.task?.id) {
        targetLink = `/tasks/${r.task.id}`
      }

      return {
        ...r,
        targetLink,
      }
    })

    return NextResponse.json({ reports: reportsWithLinks })
  } catch (err) {
    logger.error('Ошибка загрузки жалоб', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 🗑️ Удаление поста, комментария или задачи администратором
export async function DELETE(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    logger.debug('DELETE request body', { body })
    
    const { type, id } = body
    
    if (!type || !id) {
      logger.warn('Missing type or id', { type, id, body })
      return NextResponse.json({ 
        error: `Не указаны type и id. Получено: type=${type}, id=${id}` 
      }, { status: 400 })
    }

    if (type === 'post') {
      const existing = await prisma.communityPost.findUnique({ where: { id } })
      if (!existing)
        return NextResponse.json({ error: 'Пост не найден' }, { status: 404 })

      await prisma.communityPost.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: 'Пост удалён' })
    }

    if (type === 'comment') {
      const existing = await prisma.communityComment.findUnique({ where: { id } })
      if (!existing)
        return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })

      await prisma.communityComment.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: 'Комментарий удалён' })
    }

    if (type === 'task') {
      const existing = await prisma.task.findUnique({ where: { id } })
      if (!existing)
        return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })

      // Проверяем, что задачу можно удалить (не в работе)
      if (existing.status === 'in_progress' || existing.status === 'completed') {
        return NextResponse.json(
          { error: 'Нельзя удалить задачу в работе или завершённую' },
          { status: 400 }
        )
      }

      await prisma.task.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: 'Задача удалена' })
    }

    return NextResponse.json({ error: 'Неверный тип' }, { status: 400 })
  } catch (err) {
    logger.error('Ошибка при удалении через админку', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
