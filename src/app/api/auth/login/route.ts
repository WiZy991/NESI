import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { signJWT } from '@/lib/jwt'
import { createNotification } from '@/lib/createNotification'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // 🎯 JWT только с userId, остальное достанем из БД
    const token = signJWT({ userId: user.id })

    // ✅ уведомление
    await createNotification(user.id, 'Вы успешно вошли в аккаунт!', '/tasks', 'login')

    // 🟢 Кладём токен в HttpOnly cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
