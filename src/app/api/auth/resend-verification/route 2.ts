import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(() => ({}))

    if (!email) {
      return NextResponse.json({ error: 'Email не указан' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

    await prisma.emailVerificationToken.create({
      data: { token, userId: user.id, expiresAt },
    })

    const link = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`
    
    await sendVerificationEmail(user.email, link)

    console.log(`📧 Повторное письмо отправлено на ${user.email}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Ошибка при повторной отправке письма:', error)
    return NextResponse.json({ error: 'Ошибка сервера при повторной отправке' }, { status: 500 })
  }
}
