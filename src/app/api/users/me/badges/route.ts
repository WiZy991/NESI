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

    // Фильтруем достижения по роли пользователя
    // Оставляем только те достижения, которые подходят для роли пользователя
    let filteredBadges = earned.filter(entry => {
      const badge = entry.badge
      // Если у достижения указана роль, она должна совпадать с ролью пользователя
      // Если targetRole = null, достижение для всех ролей
      if (badge.targetRole === null || badge.targetRole === user.role) {
        return true
      }
      return false
    })

    // Для заказчиков исключаем достижения, связанные с XP и уровнями
    if (user.role === 'customer') {
      filteredBadges = filteredBadges.filter(entry => {
        const badge = entry.badge
        const condition = badge.condition.toLowerCase()
        const description = badge.description.toLowerCase()
        const name = badge.name.toLowerCase()
        
        // Исключаем достижения, связанные с XP, уровнями, опытом
        const xpKeywords = ['xp', 'опыт', 'уровень', 'level', 'очки опыта', 'totalXP', 'level']
        const hasXpReference = xpKeywords.some(keyword => 
          condition.includes(keyword) || 
          description.includes(keyword) || 
          name.includes(keyword)
        )
        
        return !hasXpReference
      })
    }

    return NextResponse.json({
      badges: filteredBadges.map(entry => ({
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
