import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getReferralStats } from '@/lib/referral'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * GET /api/referral
 * Получить статистику реферальной системы
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    const stats = await getReferralStats(decoded.userId)

    return NextResponse.json(stats)
  } catch (err) {
    console.error('❌ Ошибка получения реферальной статистики:', err)
    return NextResponse.json(
      { error: 'Ошибка получения статистики' },
      { status: 500 }
    )
  }
}

