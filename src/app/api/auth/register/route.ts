import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import { signJWT } from '@/lib/jwt'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаём пользователя (но пока не верифицированного)
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        role,
        verified: false,
      },
    })

    // Генерируем токен подтверждения
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 часа

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Ссылка для подтверждения
    const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`

    // Отправляем письмо
    await sendVerificationEmail(user.email, verifyLink)

    // Можно вернуть сообщение без токена JWT
    return NextResponse.json({
      message:
        'Регистрация прошла успешно! Проверьте почту и подтвердите адрес для активации аккаунта.',
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}
