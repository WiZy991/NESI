import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signJWT } from '@/lib/jwt'
import { setSecureCookie } from '@/lib/security'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      console.warn('⚠️ Токен не передан в URL')
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record) {
      console.warn('❌ Токен не найден или устарел:', token)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/invalid-token`)
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { token } })
      console.warn('⚠️ Срок действия токена истёк:', token)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/token-expired`)
    }

    const updated = await prisma.user.update({
      where: { id: record.userId },
      data: { verified: true },
      select: { id: true, email: true, role: true },
    })
    console.log('✅ Пользователь подтверждён:', updated.email)

    await prisma.emailVerificationToken.delete({ where: { token } })

    let jwt: string
    try {
      jwt = signJWT({ userId: updated.id, role: updated.role })
    } catch (err: any) {
      console.error('❌ Ошибка генерации JWT:', err)
      return NextResponse.json({ error: 'JWT generation failed' }, { status: 500 })
    }

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/email-verified`
    const res = NextResponse.redirect(redirectUrl)

    res.cookies.set('token', jwt, setSecureCookie(jwt))

    console.log('✅ Подтверждение e-mail завершено, редирект:', redirectUrl)
    return res
  } catch (err: any) {
    console.error('💥 Ошибка подтверждения e-mail:', err)
    return NextResponse.json(
      { error: err.message || 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
