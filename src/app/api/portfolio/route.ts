import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * GET /api/portfolio
 * Получить свое портфолио
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    
    // Проверяем, что пользователь - исполнитель
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    })
    
    if (!user || user.role !== 'executor') {
      return NextResponse.json(
        { error: 'Портфолио доступно только для исполнителей' },
        { status: 403 }
      )
    }

    const portfolio = await prisma.portfolio.findMany({
      where: { userId: decoded.userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(portfolio)
  } catch (err) {
    console.error('❌ Ошибка получения портфолио:', err)
    return NextResponse.json(
      { error: 'Ошибка получения портфолио' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio
 * Создать элемент портфолио
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    
    // Проверяем, что пользователь - исполнитель
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    })
    
    if (!user || user.role !== 'executor') {
      return NextResponse.json(
        { error: 'Портфолио доступно только для исполнителей' },
        { status: 403 }
      )
    }
    
    const { title, description, imageUrl, externalUrl, taskId } = await req.json()

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'Заполните название и описание' },
        { status: 400 }
      )
    }

    // Проверяем, что задача принадлежит пользователю (если taskId указан)
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          executorId: decoded.userId,
          status: 'completed',
        },
      })

      if (!task) {
        return NextResponse.json(
          { error: 'Задача не найдена или еще не завершена' },
          { status: 404 }
        )
      }
    }

    const portfolioItem = await prisma.portfolio.create({
      data: {
        userId: decoded.userId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
        externalUrl: externalUrl?.trim() || null,
        taskId: taskId || null,
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

    return NextResponse.json(portfolioItem)
  } catch (err) {
    console.error('❌ Ошибка создания портфолио:', err)
    return NextResponse.json(
      { error: 'Ошибка создания портфолио' },
      { status: 500 }
    )
  }
}

