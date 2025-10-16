import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ message: 'Отсутствуют данные' }, { status: 400 })
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!record) {
      return NextResponse.json({ message: 'Неверная или устаревшая ссылка' }, { status: 400 })
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } })
      return NextResponse.json({ message: 'Срок действия ссылки истёк' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    })

    await prisma.passwordResetToken.delete({ where: { token } })

    return NextResponse.json({ message: 'Пароль успешно обновлён' }, { status: 200 })
  } catch (error) {
    console.error('Ошибка сброса пароля:', error)
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 })
  }
}
