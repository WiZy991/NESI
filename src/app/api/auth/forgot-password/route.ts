import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendResetPasswordEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Не раскрываем, есть ли пользователь
      return NextResponse.json({ message: 'Если email существует — письмо отправлено' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 30) // 30 минут

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: expires },
    })

    await sendResetPasswordEmail(user.email, token)

    return NextResponse.json({ message: 'Ссылка для сброса отправлена, проверьте почту' })
  } catch (error) {
    console.error('Ошибка восстановления пароля:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
