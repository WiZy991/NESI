import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendResetPasswordEmail } from '@/lib/mail'
import { rateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    // Rate limiting для восстановления пароля (защита от спама)
    const forgotPasswordRateLimit = rateLimit(rateLimitConfigs.auth)
    const rateLimitResult = await forgotPasswordRateLimit(req)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      )
    }

    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ message: 'Если email существует — письмо отправлено' })
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 30)
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: expires,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${token}`

    await sendResetPasswordEmail(user.email, resetLink)

    return NextResponse.json({
      message: 'Ссылка для сброса отправлена, проверьте почту',
    })
  } catch (error) {
    logger.error('Ошибка восстановления пароля', error)
    return NextResponse.json(
      { error: 'Ошибка сервера, попробуйте позже' },
      { status: 500 }
    )
  }
}
