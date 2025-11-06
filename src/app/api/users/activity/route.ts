import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { broadcastOnlineCountUpdate } from './stream/route'

/**
 * POST /api/users/activity
 * Обновляет время последней активности пользователя
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, было ли обновление активности недавно (чтобы не спамить)
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastActivityAt: true },
    })

    const now = new Date()
    const shouldBroadcast = !currentUser?.lastActivityAt || 
      (now.getTime() - currentUser.lastActivityAt.getTime()) > 60000 // 1 минута

    // Обновляем время последней активности
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastActivityAt: now,
      },
    })

    // Broadcast обновление онлайн счетчика только если прошло достаточно времени
    if (shouldBroadcast) {
      // Отправляем broadcast асинхронно, не блокируя ответ
      broadcastOnlineCountUpdate().catch(err => {
        console.error('Ошибка broadcast при обновлении активности:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Ошибка обновления активности:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления активности' },
      { status: 500 }
    )
  }
}


