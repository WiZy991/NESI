import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * GET /api/portfolio/[id]
 * Получить элемент портфолио
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    logger.debug('GET /api/portfolio/[id] запрос', { id })
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      logger.warn('Неверный ID портфолио', { id })
      return NextResponse.json(
        { error: 'Неверный ID портфолио' },
        { status: 400 }
      )
    }
    
    let portfolioItem
    try {
      portfolioItem = await prisma.portfolio.findUnique({
        where: { id },
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
    } catch (dbError: any) {
      // Если ошибка связана с отсутствующим полем mediaType
      if (dbError?.message?.includes('mediaType') || dbError?.code === 'P2009') {
        logger.warn('Поле mediaType отсутствует в БД. Нужно применить миграцию')
        // Пытаемся получить без include task
        portfolioItem = await prisma.portfolio.findUnique({
          where: { id },
        })
        if (portfolioItem) {
          // Добавляем mediaType по умолчанию
          return NextResponse.json({
            ...portfolioItem,
            mediaType: 'image',
            task: null,
          })
        }
      }
      throw dbError
    }

    if (!portfolioItem) {
      return NextResponse.json(
        { error: 'Портфолио не найдено' },
        { status: 404 }
      )
    }

    // Убеждаемся, что mediaType есть (для старых записей)
    const result = {
      ...portfolioItem,
      mediaType: (portfolioItem as any).mediaType || 'image',
    }

    return NextResponse.json(result)
  } catch (err: any) {
    logger.error('Ошибка получения портфолио', err, {
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { error: 'Ошибка получения портфолио', details: process.env.NODE_ENV === 'development' ? err?.message : undefined },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/portfolio/[id]
 * Редактировать элемент портфолио
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Проверяем, что портфолио принадлежит пользователю
    const existing = await prisma.portfolio.findUnique({
      where: { id },
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

    // Подготавливаем данные для обновления (без mediaType сначала)
    const updateData: any = {
      title: title?.trim() || existing.title,
      description: description?.trim() || existing.description,
      imageUrl: imageUrl?.trim() || existing.imageUrl,
      externalUrl: externalUrl?.trim() || existing.externalUrl,
      taskId: taskId || existing.taskId,
    }

    let updated
    try {
      // Пытаемся обновить с mediaType
      const dataWithMediaType = {
        ...updateData,
        mediaType: mediaType || (existing as any).mediaType || 'image',
      }
      updated = await prisma.portfolio.update({
        where: { id },
        data: dataWithMediaType,
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
    } catch (updateError: any) {
      // Если ошибка из-за mediaType, пытаемся без него
      if (updateError?.message?.includes('mediaType') || 
          updateError?.message?.includes('Unknown column') ||
          updateError?.code === 'P2009' ||
          updateError?.code === 'P2011') {
        logger.warn('Поле mediaType отсутствует в БД, обновляем без него')
        updated = await prisma.portfolio.update({
          where: { id },
          data: updateData,
        })
        // Добавляем mediaType вручную в результат
        updated = {
          ...updated,
          mediaType: mediaType || (existing as any).mediaType || 'image',
          task: null,
        }
      } else {
        // Если это другая ошибка - пробрасываем дальше
        throw updateError
      }
    }

    // Убеждаемся, что mediaType есть в результате
    const result = {
      ...updated,
      mediaType: (updated as any).mediaType || mediaType || 'image',
    }

    return NextResponse.json(result)
  } catch (err: any) {
    logger.error('Ошибка обновления портфолио', err, {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
    })
    return NextResponse.json(
      { 
        error: 'Ошибка обновления портфолио',
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined
      },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Проверяем, что портфолио принадлежит пользователю
    const existing = await prisma.portfolio.findUnique({
      where: { id },
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
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Ошибка удаления портфолио', err)
    return NextResponse.json(
      { error: 'Ошибка удаления портфолио' },
      { status: 500 }
    )
  }
}

