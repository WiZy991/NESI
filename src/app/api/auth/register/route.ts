import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/mail'
import { sanitizeText } from '@/lib/security'
import { rateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { registerSchema, validateWithZod } from '@/lib/validations'

export async function POST(req: Request) {
  try {
    // Rate limiting для регистрации (защита от спама)
    const registerRateLimit = rateLimit(rateLimitConfigs.auth)
    const rateLimitResult = await registerRateLimit(req)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много попыток регистрации. Попробуйте позже.' },
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

    const body = await req.json()
    
    // Валидация с использованием zod
    const validation = validateWithZod(registerSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[0] || 'Ошибка валидации данных' },
        { status: 400 }
      )
    }

    const { email, password, fullName, role, referralCode } = validation.data

    // ищем по email без учёта регистра, чтобы не плодить дубликаты
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Проверяем реферальный код, если указан
    let referrerId: string | undefined
    if (referralCode?.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true },
      })
      
      if (referrer) {
        referrerId = referrer.id
      }
    }

    // создаём пользователя и токен в одной транзакции
    const { userId, token } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          fullName: sanitizeText(fullName.trim()),
          password: hashedPassword,
          role,
          verified: false,
          referredById: referrerId,
        },
        select: { id: true, email: true },
      })

      // очищаем старые токены на всякий случай
      await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } })

      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

      await tx.emailVerificationToken.create({
        data: { userId: user.id, token, expiresAt },
      })

      return { userId: user.id, token }
    })

    // шлём письмо вне транзакции, чтобы не свалить регистрацию из-за SMTP
    let emailSent = true
    try {
      const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`
      await sendVerificationEmail(email.toLowerCase(), verifyLink)
    } catch (e) {
      emailSent = false
      console.error('❌ sendVerificationEmail failed:', e)
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      message: emailSent
        ? 'Регистрация прошла! Проверьте почту и подтвердите адрес.'
        : 'Регистрация прошла. Не удалось отправить письмо — попробуйте позже или запросите повторную отправку.',
    })
  } catch (error: any) {
    console.error('❌ Ошибка регистрации:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Такой email уже зарегистрирован' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}
