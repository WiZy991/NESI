import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    // Обновляем время последней активности
    // Если lastActivityAt еще не установлен, устанавливаем его при первом обновлении
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastActivityAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Ошибка обновления активности:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления активности' },
      { status: 500 }
    )
  }
}


