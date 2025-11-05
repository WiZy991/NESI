import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log(`[Badges Check API] Запрос проверки достижений для пользователя ${user.id} (роль: ${user.role})`)

    // Проверяем и выдаём достижения
    const awardedBadges = await checkAndAwardBadges(user.id)

    console.log(`[Badges Check API] Результат проверки: получено ${awardedBadges.length} достижений`)

    return NextResponse.json({ 
      success: true, 
      message: 'Достижения проверены',
      awardedBadges: awardedBadges.length > 0 ? awardedBadges : undefined,
      count: awardedBadges.length,
      role: user.role
    })
  } catch (error) {
    console.error('[Badges Check API] Ошибка проверки достижений:', error)
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

