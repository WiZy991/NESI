import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { broadcastOnlineCountUpdate } from '../users/activity/stream/route'

export async function POST(req: NextRequest) {
  try {
    // Получаем пользователя перед выходом, чтобы обновить его lastActivityAt
    const user = await getUserFromRequest(req)
    
    if (user) {
      // Устанавливаем lastActivityAt в прошлое (10 минут назад), чтобы пользователь считался офлайн
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastActivityAt: tenMinutesAgo,
        },
      }).catch(err => {
        // Игнорируем ошибки обновления активности при выходе
        console.error('Ошибка обновления активности при выходе:', err)
      })

      // Broadcast обновление онлайн счетчика всем подключенным клиентам
      broadcastOnlineCountUpdate().catch(err => {
        console.error('Ошибка broadcast при выходе:', err)
      })
    }
  } catch (error) {
    // Игнорируем ошибки аутентификации при выходе
    console.error('Ошибка при выходе:', error)
  }

  const cookieStore = cookies()

  cookieStore.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return NextResponse.json({ message: 'Выход выполнен' })
}
