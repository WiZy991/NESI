import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signJWT } from '@/lib/jwt'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Неверный или устаревший токен' }, { status: 400 })
    }

    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { token } })
      return NextResponse.json({ error: 'Срок действия токена истёк' }, { status: 400 })
    }

    // 🔹 Подтверждаем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: record.userId },
      data: { verified: true },
    })

    // Удаляем использованный токен
    await prisma.emailVerificationToken.delete({ where: { token } })

    // 🔹 Выдаём JWT с userId (как требует твоя auth-система)
    const jwt = signJWT({ userId: updatedUser.id })

    // 🔹 Добавляем cookie и редиректим
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/email-verified`
    )
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    })

    return response
  } catch (error) {
    console.error('Ошибка подтверждения e-mail:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
