import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/users/[id]/online
 * Проверяет онлайн статус пользователя
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        lastActivityAt: true,
        settings: {
          select: {
            showOnlineStatus: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Проверяем настройки приватности
    if (user.settings?.showOnlineStatus === false) {
      return NextResponse.json({ online: null, privacy: true })
    }

    // Пользователь считается онлайн, если его последняя активность была менее 5 минут назад
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isOnline = user.lastActivityAt && user.lastActivityAt >= fiveMinutesAgo

    return NextResponse.json({ 
      online: isOnline || false,
      lastActivityAt: user.lastActivityAt,
    })
  } catch (error) {
    console.error('❌ Ошибка проверки онлайн статуса:', error)
    return NextResponse.json(
      { error: 'Ошибка проверки статуса' },
      { status: 500 }
    )
  }
}

