import { verifyPassword } from '@/lib/auth'
import { createNotification } from '@/lib/createNotification'
import { signJWT } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { rateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const authRateLimit = rateLimit(rateLimitConfigs.auth)
    const rateLimitResult = await authRateLimit(req)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много попыток входа. Попробуйте позже.' },
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

    const { email, password } = await req.json()
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      )
    }


    const token = signJWT({ userId: user.id })

    await createNotification(
      user.id,
      'Вы успешно вошли в аккаунт!',
      '/tasks',
      'login'
    )

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
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
