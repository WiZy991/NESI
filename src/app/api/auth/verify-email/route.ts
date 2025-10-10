import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
    }

    // Находим токен
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Неверный или устаревший токен' }, { status: 400 })
    }

    // Проверяем срок действия
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { token } })
      return NextResponse.json({ error: 'Срок действия токена истёк' }, { status: 400 })
    }

    // Обновляем пользователя — помечаем как подтверждённого
    await prisma.user.update({
      where: { id: record.userId },
      data: { verified: true },
    })

    // Удаляем использованный токен
    await prisma.emailVerificationToken.delete({ where: { token } })

    // Можно вернуть JSON или редирект на страницу успеха
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/email-verified`)
  } catch (error) {
    console.error('Ошибка подтверждения e-mail:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
