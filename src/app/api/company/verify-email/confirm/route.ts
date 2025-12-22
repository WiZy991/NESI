/**
 * API для подтверждения корпоративной почты по токену из письма
 * GET /api/company/verify-email/confirm?token=...
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    // Используем правильный базовый URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://nesi.su'

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/settings?error=missing_token`)
    }

    // Находим токен
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.redirect(`${baseUrl}/settings?error=invalid_token`)
    }

    // Проверяем срок действия
    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.redirect(`${baseUrl}/settings?error=token_expired`)
    }

    // Проверяем, что пользователь - исполнитель с ИП/ООО
    const user = verificationToken.user
    if (user.role !== 'executor' || 
        (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY')) {
      return NextResponse.redirect(`${baseUrl}/settings?error=invalid_user_type`)
    }

    // Обновляем подтверждение
    await prisma.companyVerification.update({
      where: { userId: user.id },
      data: {
        corporateEmailVerified: true,
        corporateEmailVerifiedAt: new Date(),
      },
    })

    // Удаляем использованный токен
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    })

    logger.info('Company email verified', {
      userId: user.id,
      email: verificationToken.user.email,
    })

    return NextResponse.redirect(`${baseUrl}/settings?success=company_verified`)
  } catch (error) {
    logger.error('Company email confirmation error', error instanceof Error ? error : undefined)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://nesi.su'
    return NextResponse.redirect(`${baseUrl}/settings?error=verification_failed`)
  }
}

