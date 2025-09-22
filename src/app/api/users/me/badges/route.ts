import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Нет токена' }, { status: 401 })

    const user = await getUserFromToken(token)
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })

    const earned = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true }
    })

    return NextResponse.json({
      badges: earned.map(entry => ({
        id: entry.badge.id,
        name: entry.badge.name,
        icon: entry.badge.icon,
        description: entry.badge.description,
        earnedAt: entry.earnedAt
      }))
    })
  } catch (e) {
    console.error('GET /api/users/me/badges error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
