import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signJWT } from '@/lib/jwt'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!record) return NextResponse.json({ error: 'Неверный или устаревший токен' }, { status: 400 })

    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { token } })
      return NextResponse.json({ error: 'Срок действия токена истёк' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: record.userId },
      data: { verified: true },
      select: { id: true },
    })
    await prisma.emailVerificationToken.delete({ where: { token } })

    const jwt = signJWT({ userId: updated.id })
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/email-verified`)
    res.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    console.error('Ошибка подтверждения e-mail:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
