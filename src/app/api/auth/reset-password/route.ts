import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ message: 'Ссылка недействительна или устарела' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    })

    await prisma.passwordResetToken.delete({
      where: { token },
    })

    return NextResponse.json({ message: 'Пароль успешно обновлён' })
  } catch (error) {
    console.error('Ошибка сброса:', error)
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 })
  }
}
