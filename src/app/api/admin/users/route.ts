import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

//Получение списка пользователей с поиском и пагинацией
export async function GET(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        blocked: true,
        balance: true,
        xp: true,
        avgRating: true,
        completedTasksCount: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) })
}

//Обновление статуса (блокировка / разблокировка)
export async function PATCH(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || String(admin.role) !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const body = await req.json()
  const { id, blocked } = body

  const updated = await prisma.user.update({
    where: { id },
    data: { blocked },
    select: { 
      id: true, 
      blocked: true,
      email: true,
      fullName: true,
      blockedUntil: true,
      blockedReason: true,
    },
  })

  // Если блокируем, создаем уведомление и отправляем через SSE
  if (blocked) {
    const { createNotification } = await import('@/lib/createNotification')
    const { sendNotificationToUser } = await import('@/app/api/notifications/stream/route')
    
    const blockMessage = updated.blockedUntil
      ? `🚫 Ваш аккаунт заблокирован до ${new Date(updated.blockedUntil).toLocaleString('ru-RU')}. ${updated.blockedReason ? `Причина: ${updated.blockedReason}` : ''}`
      : `🚫 Ваш аккаунт заблокирован. ${updated.blockedReason ? `Причина: ${updated.blockedReason}` : 'Обратитесь к администратору.'}`

    try {
      await createNotification(
        updated.id,
        blockMessage,
        '/profile',
        'block'
      )

      // Отправляем уведомление в реальном времени через SSE
      sendNotificationToUser(updated.id, {
        type: 'block',
        title: '🚫 Аккаунт заблокирован',
        message: blockMessage,
        link: '/profile',
        playSound: true,
      })
    } catch (error) {
      console.error('Ошибка при создании уведомления о блокировке:', error)
    }
  }

  return NextResponse.json({ user: updated })
}
