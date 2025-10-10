import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json()

    // 🔹 Проверяем все обязательные поля
    if (!email?.trim() || !password?.trim() || !fullName?.trim()) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    // 🔹 Проверяем, есть ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, verified: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      )
    }

    // 🔹 Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // 🔹 Создаём нового пользователя (не верифицированного)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        fullName: fullName.trim(),
        password: hashedPassword,
        role,
        verified: false,
      },
      select: { id: true, email: true },
    })

    // 🔹 Генерируем токен подтверждения (уникальный)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 часа

    // На всякий случай очищаем старые токены, если вдруг есть
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // 🔹 Формируем ссылку для подтверждения
    const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`

    // 🔹 Отправляем письмо
    await sendVerificationEmail(user.email, verifyLink)

    // 🔹 Возвращаем сообщение пользователю
    return NextResponse.json({
      message:
        'Регистрация прошла успешно! Проверьте почту и подтвердите адрес для активации аккаунта.',
    })
  } catch (error: any) {
    console.error('❌ Ошибка регистрации:', error)

    // Обработка частых ошибок Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Такой email уже зарегистрирован' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}
