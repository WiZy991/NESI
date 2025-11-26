import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

/** PATCH: редактирование комментария */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> | { id: string; commentId: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    // Обрабатываем params как Promise или обычный объект
    const resolvedParams = 'then' in params ? await params : params
    const { id: postId, commentId } = resolvedParams

    const body = await req.json().catch(() => ({}))
    const { content } = body || {}
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      )
    }

    const existing = await prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    }
    if (existing.postId !== postId) {
      return NextResponse.json({ error: 'Несоответствие поста' }, { status: 400 })
    }
    if (existing.authorId !== me.id) {
      return NextResponse.json({ error: 'Нет прав для редактирования' }, { status: 403 })
    }

    const updated = await prisma.communityComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    })

    return NextResponse.json({ ok: true, comment: updated })
  } catch (err) {
    console.error('🔥 PATCH comment error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** DELETE: удаление комментария + всех потомков (BFS) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> | { id: string; commentId: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    // Обрабатываем params как Promise или обычный объект
    const resolvedParams = 'then' in params ? await params : params
    const { id: postId, commentId } = resolvedParams

    const root = await prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    })
    if (!root) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    }
    if (root.postId !== postId) {
      return NextResponse.json({ error: 'Несоответствие поста' }, { status: 400 })
    }
    if (root.authorId !== me.id && me.role !== 'admin') {
      return NextResponse.json({ error: 'Нет прав для удаления' }, { status: 403 })
    }

    // Собираем все id потомков (BFS), чтобы удалить одним батчем
    const toDelete: string[] = [root.id]
    let queue: string[] = [root.id]

    while (queue.length) {
      const chunk = queue.splice(0, 50) // ограничим пачку запроса
      const children = await prisma.communityComment.findMany({
        where: { parentId: { in: chunk } },
        select: { id: true },
      })
      if (children.length) {
        const ids = children.map((c) => c.id)
        toDelete.push(...ids)
        queue.push(...ids)
      }
    }

    await prisma.$transaction([
      prisma.communityComment.deleteMany({ where: { id: { in: toDelete } } }),
    ])

    return NextResponse.json({ ok: true, deleted: toDelete.length })
  } catch (err: any) {
    // Пытаемся получить params для логирования
    let commentIdForLog: string | undefined
    let postIdForLog: string | undefined
    try {
      const resolvedParams = 'then' in params ? await params : params
      commentIdForLog = resolvedParams?.commentId
      postIdForLog = resolvedParams?.postId
    } catch {
      // Игнорируем ошибку получения params
    }
    
    logger.error('Ошибка удаления комментария', err, {
      commentId: commentIdForLog,
      postId: postIdForLog,
    })
    
    const errorMessage = err?.message || 'Ошибка сервера'
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err?.message : undefined
    }, { status: 500 })
  }
}
