// src/app/api/users/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Тянем только исполнителей, сразу с level и счетчиками
    const users = await prisma.user.findMany({
      where: { role: 'executor' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        location: true,
        skills: true,

        // то, чего не хватало на подиуме:
        xp: true,
        completedTasksCount: true,
        avgRating: true,
        level: {
          select: { id: true, name: true, threshold: true } // если есть threshold
        },

        // кол-во отзывов
        _count: {
          select: { reviewsReceived: true }
        },
      },
      orderBy: [
        // сначала по уровню/опыту, чтобы "подий" выглядел логично
        { xp: 'desc' },
        { completedTasksCount: 'desc' },
      ],
      take: 100, // чтобы не тащить всё подряд
    })

    return NextResponse.json({ users })
  } catch (e) {
    console.error('/api/users error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
