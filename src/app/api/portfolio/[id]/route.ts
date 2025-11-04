import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * PUT /api/portfolio/[id]
 * Редактировать элемент портфолио
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    const { title, description, imageUrl, externalUrl, taskId } = await req.json()

    // Проверяем, что портфолио принадлежит пользователю
    const existing = await prisma.portfolio.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Портфолио не найдено' },
        { status: 404 }
      )
    }

    if (existing.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Нет доступа' },
        { status: 403 }
      )
    }

    const updated = await prisma.portfolio.update({
      where: { id: params.id },
      data: {
        title: title?.trim() || existing.title,
        description: description?.trim() || existing.description,
        imageUrl: imageUrl?.trim() || existing.imageUrl,
        externalUrl: externalUrl?.trim() || existing.externalUrl,
        taskId: taskId || existing.taskId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('❌ Ошибка обновления портфолио:', err)
    return NextResponse.json(
      { error: 'Ошибка обновления портфолио' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]
 * Удалить элемент портфолио
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }

    // Проверяем, что портфолио принадлежит пользователю
    const existing = await prisma.portfolio.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Портфолио не найдено' },
        { status: 404 }
      )
    }

    if (existing.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Нет доступа' },
        { status: 403 }
      )
    }

    await prisma.portfolio.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ Ошибка удаления портфолио:', err)
    return NextResponse.json(
      { error: 'Ошибка удаления портфолио' },
      { status: 500 }
    )
  }
}

