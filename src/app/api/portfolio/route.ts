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

    // Используем select вместо include, чтобы избежать проблем с отсутствующими полями
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: decoded.userId },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        imageUrl: true,
        externalUrl: true,
        taskId: true,
        createdAt: true,
        updatedAt: true,
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

    // Убеждаемся, что у всех элементов есть mediaType (добавляем по умолчанию, если поле отсутствует в БД)
    const result = portfolio.map((item: any) => ({
      ...item,
      mediaType: item.mediaType || 'image',
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('❌ Ошибка получения портфолио:', err)
    console.error('Детали ошибки:', {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
    })
    return NextResponse.json(
      { 
        error: 'Ошибка получения портфолио', 
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined 
      },
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
    
    const { title, description, imageUrl, mediaType, externalUrl, taskId } = await req.json()

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

    // Создаем данные для портфолио
    const portfolioData: any = {
      userId: decoded.userId,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl?.trim() || null,
      externalUrl: externalUrl?.trim() || null,
      taskId: taskId || null,
    }

    // Пытаемся добавить mediaType, если поле существует в БД
    // Проверяем через try-catch в отдельном запросе или просто добавляем вручную в ответ
    let portfolioItem
    try {
      portfolioItem = await prisma.portfolio.create({
        data: portfolioData,
        select: {
          id: true,
          userId: true,
          title: true,
          description: true,
          imageUrl: true,
          externalUrl: true,
          taskId: true,
          createdAt: true,
          updatedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      })
    } catch (dbError: any) {
      // Если ошибка связана с отсутствующим полем mediaType или другими полями
      if (dbError?.message?.includes('mediaType') || dbError?.code === 'P2009' || dbError?.code === 'P2022') {
        console.error('⚠️ Поле mediaType отсутствует в БД. Создаем без mediaType.')
        // Создаем без mediaType
        portfolioItem = await prisma.portfolio.create({
          data: portfolioData,
          select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            imageUrl: true,
            externalUrl: true,
            taskId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
        // Добавляем mediaType вручную и task: null
        portfolioItem = {
          ...portfolioItem,
          mediaType: mediaType || 'image',
          task: taskId ? await prisma.task.findUnique({
            where: { id: taskId },
            select: { id: true, title: true, status: true },
          }) : null,
        }
      } else {
        throw dbError
      }
    }

    // Убеждаемся, что mediaType присутствует в ответе
    const result = {
      ...portfolioItem,
      mediaType: portfolioItem.mediaType || mediaType || 'image',
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('❌ Ошибка создания портфолио:', err)
    return NextResponse.json(
      { error: 'Ошибка создания портфолио' },
      { status: 500 }
    )
  }
}

