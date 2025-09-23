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
        location: true,
        skills: true,
        avatarFileId: true, // заменили avatarUrl на avatarFileId

        // то, чего не хватало на подиуме:
        xp: true,
        completedTasksCount: true,
        avgRating: true,
        level: {
          select: { id: true, name: true, threshold: true }, // если есть threshold
        },

        // кол-во отзывов
        _count: {
          select: { reviewsReceived: true },
        },
      },
      orderBy: [
        // сначала по уровню/опыту, чтобы "подиум" выглядел логично
        { xp: 'desc' },
        { completedTasksCount: 'desc' },
      ],
      take: 100, // чтобы не тащить всё подряд
    })

    // Добавляем вычисляемый avatarUrl
    const usersWithAvatars = users.map((u) => ({
      ...u,
      avatarUrl: u.avatarFileId ? `/api/files/${u.avatarFileId}` : null,
    }))

    return NextResponse.json({ users: usersWithAvatars })
  } catch (e) {
    console.error('/api/users error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
