/**
 * API для подтверждения связи пользователя с компанией через корпоративную почту (Этап 2)
 * POST /api/company/verify-email
 * 
 * Отправляет письмо с подтверждением на корпоративную почту
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendCompanyVerificationEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, что пользователь - исполнитель
    if (user.role !== 'executor') {
      return NextResponse.json(
        { error: 'Только исполнители могут подтверждать компании' },
        { status: 403 }
      )
    }

    // Проверяем, что статус - ИП или ООО
    if (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY') {
      return NextResponse.json(
        { error: 'Подтверждение компании доступно только для ИП и ООО' },
        { status: 403 }
      )
    }

    // Проверяем, что ИНН уже подтвержден (этап 1)
    const verification = await prisma.companyVerification.findUnique({
      where: { userId: user.id },
    })

    if (!verification || !verification.innVerified) {
      return NextResponse.json(
        { error: 'Сначала необходимо подтвердить существование компании через ИНН' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { corporateEmail } = body

    if (!corporateEmail || typeof corporateEmail !== 'string') {
      return NextResponse.json(
        { error: 'Корпоративная почта обязательна' },
        { status: 400 }
      )
    }

    const email = corporateEmail.trim().toLowerCase()

    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Некорректный формат email' },
        { status: 400 }
      )
    }

    // Проверяем, что домен соответствует компании
    // Извлекаем домен из email
    const emailDomain = email.split('@')[1]
    
    // Получаем домен компании из ИНН (можно улучшить, используя данные из ФНС)
    // Пока просто проверяем, что email не является обычным публичным доменом
    const publicDomains = ['gmail.com', 'yandex.ru', 'mail.ru', 'outlook.com', 'yahoo.com', 'hotmail.com']
    if (publicDomains.includes(emailDomain)) {
      return NextResponse.json(
        { error: 'Используйте корпоративную почту, связанную с доменом компании' },
        { status: 400 }
      )
    }

    // Генерируем токен подтверждения
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Токен действителен 24 часа

    // Сохраняем токен в базе (можно использовать существующую таблицу EmailVerificationToken)
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Обновляем запись подтверждения
    await prisma.companyVerification.update({
      where: { userId: user.id },
      data: {
        corporateEmail: email,
        corporateEmailVerified: false, // Пока не подтверждено
      },
    })

    // Отправляем письмо с подтверждением
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://nesi.su'
    const verificationUrl = `${baseUrl}/api/company/verify-email/confirm?token=${token}`
    
    try {
      await sendCompanyVerificationEmail(
        email,
        {
          type: 'company_verification',
          verificationUrl,
          companyName: verification.companyName || 'компании',
        }
      )
    } catch (emailError) {
      logger.error('Failed to send company verification email', emailError instanceof Error ? emailError : undefined)
      return NextResponse.json(
        { error: 'Не удалось отправить письмо. Попробуйте позже.' },
        { status: 500 }
      )
    }

    logger.info('Company email verification sent', {
      userId: user.id,
      email,
    })

    return NextResponse.json({
      success: true,
      message: 'Письмо с подтверждением отправлено на указанную почту',
    })
  } catch (error) {
    logger.error('Company email verification error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при отправке письма подтверждения' },
      { status: 500 }
    )
  }
}

