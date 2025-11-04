import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { generateReferralCode } from '@/lib/referral'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * POST /api/referral/generate
 * Сгенерировать реферальный код (если его нет)
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }

    // Проверяем, есть ли уже код
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { referralCode: true },
    })

    if (user?.referralCode) {
      return NextResponse.json({ referralCode: user.referralCode })
    }

    // Генерируем новый код
    const referralCode = await generateReferralCode(decoded.userId)

    return NextResponse.json({ referralCode })
  } catch (err) {
    console.error('❌ Ошибка генерации реферального кода:', err)
    return NextResponse.json(
      { error: 'Ошибка генерации кода' },
      { status: 500 }
    )
  }
}

