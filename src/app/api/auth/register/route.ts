import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import { signJWT } from '@/lib/jwt'

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
role,
      },
    })

    const token = signJWT({ userId: user.id })

    return NextResponse.json({ token }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}

