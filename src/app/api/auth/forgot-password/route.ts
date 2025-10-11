import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendResetPasswordEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ message: 'Если email существует — письмо отправлено' })
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 30)
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: expires,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${token}`

    await sendResetPasswordEmail(user.email, resetLink)

    return NextResponse.json({
      message: 'Ссылка для сброса отправлена, проверьте почту',
    })
  } catch (error) {
    console.error('Ошибка восстановления пароля:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера, попробуйте позже' },
      { status: 500 }
    )
  }
}
