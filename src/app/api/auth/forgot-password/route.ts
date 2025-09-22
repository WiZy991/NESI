import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendResetPasswordEmail } from '@/lib/mail' // ✅ важно

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // не раскрываем, есть ли такой email
      return NextResponse.json({ message: 'Если email существует — письмо отправлено' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 30) // 30 мин

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: expires },
    })

    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const resetLink = `${base}/reset-password?token=${token}`

    await sendResetPasswordEmail(user.email, resetLink) // ✅ реально отправляем

    return NextResponse.json({ message: 'Ссылка на сброс отправлена' })
  } catch (error) {
    console.error('Ошибка восстановления:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
