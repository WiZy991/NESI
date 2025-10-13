import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json()

    if (!email?.trim() || !password?.trim() || !fullName?.trim()) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    // ищем по email без учёта регистра, чтобы не плодить дубликаты
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // создаём пользователя и токен в одной транзакции
    const { userId, token } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          fullName: fullName.trim(),
          password: hashedPassword,
          role,
          verified: false,
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
