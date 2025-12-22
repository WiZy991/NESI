/**
 * API для получения статуса подтверждения компании
 * GET /api/company/verification-status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getCompanyVerificationStatus } from '@/lib/companyVerification'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const status = await getCompanyVerificationStatus(user.id)

    if (!status) {
      return NextResponse.json({
        innVerified: false,
        emailVerified: false,
        canUseGroupFeatures: false,
      })
    }

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при получении статуса подтверждения' },
      { status: 500 }
    )
  }
}

