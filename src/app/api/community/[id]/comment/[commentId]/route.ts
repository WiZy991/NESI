import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Обновление комментария
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { content } = body

    if (!content?.trim())
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      )

    const existing = await prisma.communityComment.findUnique({
      where: { id: params.commentId },
    })
    if (!existing)
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      )

    if (existing.authorId !== me.id)
      return NextResponse.json(
        { error: 'Нет прав для редактирования' },
        { status: 403 }
      )

    const updated = await prisma.communityComment.update({
      where: { id: params.commentId },
      data: { content: content.trim() },
    })

    return NextResponse.json({ ok: true, comment: updated })
  } catch (err) {
    console.error('🔥 Ошибка PATCH комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Удаление комментария
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const comment = await prisma.communityComment.findUnique({
      where: { id: params.commentId },
      include: { replies: true },
    })
    if (!comment)
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      )

    if (comment.authorId !== me.id)
      return NextResponse.json(
        { error: 'Нет прав для удаления' },
        { status: 403 }
      )

    // 🔥 Удаляем все дочерние комментарии рекурсивно
    const deleteReplies = async (parentId: string) => {
      const replies = await prisma.communityComment.findMany({
        where: { parentId },
      })
      for (const reply of replies) {
        await deleteReplies(reply.id)
      }
      await prisma.communityComment.deleteMany({ where: { parentId } })
    }

    await deleteReplies(params.commentId)

    // Удаляем сам комментарий
    await prisma.communityComment.delete({
      where: { id: params.commentId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('🔥 Ошибка DELETE комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
