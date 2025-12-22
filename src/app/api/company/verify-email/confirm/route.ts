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

    if (!token) {
      return NextResponse.redirect(
        new URL('/settings?error=missing_token', req.url)
      )
    }

    // Находим токен
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL('/settings?error=invalid_token', req.url)
      )
    }

    // Проверяем срок действия
    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.redirect(
        new URL('/settings?error=token_expired', req.url)
      )
    }

    // Проверяем, что пользователь - исполнитель с ИП/ООО
    const user = verificationToken.user
    if (user.role !== 'executor' || 
        (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY')) {
      return NextResponse.redirect(
        new URL('/settings?error=invalid_user_type', req.url)
      )
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

    return NextResponse.redirect(
      new URL('/settings?success=company_verified', req.url)
    )
  } catch (error) {
    logger.error('Company email confirmation error', error instanceof Error ? error : undefined)
    return NextResponse.redirect(
      new URL('/settings?error=verification_failed', req.url)
    )
  }
}

