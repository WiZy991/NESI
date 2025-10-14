import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Сначала проверим, есть ли подкатегории в базе
    const subcategoriesCount = await prisma.subcategory.count()

    // Теперь безопасно делаем агрегацию, только если есть данные
    const [
      usersCount,
      tasksCount,
      responsesCount,
      subcategoriesStats,
      topSubcategories,
      latestUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.response.count(),
      subcategoriesCount > 0
        ? prisma.subcategory.aggregate({
            _avg: { minPrice: true },
            _min: { minPrice: true },
            _max: { minPrice: true },
          })
        : { _avg: { minPrice: 0 }, _min: { minPrice: 0 }, _max: { minPrice: 0 } },
      subcategoriesCount > 0
        ? prisma.subcategory.findMany({
            take: 5,
            orderBy: { minPrice: 'desc' },
            select: { name: true, minPrice: true },
          })
        : [],
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { email: true, role: true, createdAt: true },
      }),
    ])

    return NextResponse.json({
      usersCount,
      tasksCount,
      responsesCount,
      subcategoriesStats,
      topSubcategories,
      latestUsers,
    })
  } catch (err) {
    console.error('❌ Ошибка при получении статистики:', err)
    return NextResponse.json({ error: 'Ошибка при получении статистики' }, { status: 500 })
  }
}
