import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      reviewsReceived: {
        include: {
          fromUser: true,
          task: true,
        },
      },
    },
  })

  return NextResponse.json({ user: fullUser })
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  try {
    const {
      fullName,
      role,
      password,
      description,
      avatarUrl,
      location,
      skills,
    } = await req.json()

    if (!fullName || !role) {
      return NextResponse.json({ error: 'Имя и роль обязательны' }, { status: 400 })
    }

    const dataToUpdate: any = {
      fullName,
      role,
      description,
      avatarUrl,
      location,
    }

    // Преобразуем строку скиллов в массив, если нужно
    if (skills) {
      if (Array.isArray(skills)) {
        dataToUpdate.skills = skills
      } else if (typeof skills === 'string') {
        dataToUpdate.skills = skills
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      }
    }

    if (password && password.length > 0) {
      const hashed = await bcrypt.hash(password, 10)
      dataToUpdate.password = hashed
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    })

    return NextResponse.json({ user: updatedUser })
  } catch (err: any) {
    console.error('❌ Ошибка обновления профиля:', err)
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}
