import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/activity/online
 * Получает количество онлайн пользователей
 */
export async function GET(req: NextRequest) {
  try {
    // Пользователь считается онлайн, если его последняя активность была менее 5 минут назад
    // Используем 5 минут для определения неактивности
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    logger.debug('Начало подсчета онлайн пользователей', {
      fiveMinutesAgo: fiveMinutesAgo.toISOString(),
      now: new Date().toISOString(),
    })
    
    // Считаем только пользователей с установленным lastActivityAt и недавней активностью
    // Используем более простой запрос - Prisma автоматически исключит null при gte
    const onlineUsers = await prisma.user.findMany({
      where: {
        blocked: false,
      },
      select: {
        id: true,
        lastActivityAt: true,
      },
    })
    
    // Фильтруем вручную для надежности
    const onlineCount = onlineUsers.filter(user => {
      if (!user.lastActivityAt) return false
      return user.lastActivityAt >= fiveMinutesAgo
    }).length

    logger.debug('Подсчет онлайн пользователей завершен', {
      onlineCount,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ onlineCount })
  } catch (error: any) {
    logger.error('Ошибка получения онлайн пользователей', error, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    
    // Возвращаем 0 вместо ошибки, чтобы плашка всегда отображалась
    return NextResponse.json({ onlineCount: 0 })
  }
}

