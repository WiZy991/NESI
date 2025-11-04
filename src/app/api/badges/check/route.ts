import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем и выдаём достижения
    const awardedBadges = await checkAndAwardBadges(user.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Достижения проверены',
      awardedBadges: awardedBadges.length > 0 ? awardedBadges : undefined,
      count: awardedBadges.length
    })
  } catch (error) {
    console.error('[Badges] Ошибка проверки достижений:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

