import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// PUT /api/message-templates/[id] - Обновить шаблон
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const { title, content } = await req.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Название и содержимое обязательны' },
        { status: 400 }
      )
    }

    // Проверяем, что шаблон принадлежит пользователю
    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к этому шаблону' },
        { status: 403 }
      )
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content.trim(),
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Ошибка при обновлении шаблона:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при обновлении шаблона' },
      { status: 500 }
    )
  }
}

// DELETE /api/message-templates/[id] - Удалить шаблон
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем, что шаблон принадлежит пользователю
    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к этому шаблону' },
        { status: 403 }
      )
    }

    await prisma.messageTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Ошибка при удалении шаблона:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при удалении шаблона' },
      { status: 500 }
    )
  }
}

