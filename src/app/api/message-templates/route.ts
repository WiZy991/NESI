import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/message-templates - Получить все шаблоны пользователя
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const templates = await prisma.messageTemplate.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('Ошибка при получении шаблонов:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении шаблонов' },
      { status: 500 }
    )
  }
}

// POST /api/message-templates - Создать новый шаблон
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { title, content } = await req.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Название и содержимое обязательны' },
        { status: 400 }
      )
    }

    const template = await prisma.messageTemplate.create({
      data: {
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error: any) {
    console.error('Ошибка при создании шаблона:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при создании шаблона' },
      { status: 500 }
    )
  }
}

