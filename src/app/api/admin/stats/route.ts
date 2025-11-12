import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const subcategoriesCount = await prisma.subcategory.count()

    const [
      usersCount,
      tasksCount,
      responsesCount,
      subcategoriesStats,
      topSubcategories,
      latestUsers,
      usersByDay,
      tasksByDay,
      topCategories
    ] = await Promise.all([
      // Кол-во пользователей
      prisma.user.count(),

      // Кол-во задач
      prisma.task.count(),

      // Кол-во откликов
      prisma.taskResponse.count(),

      // Средние, минимальные и максимальные ставки
      subcategoriesCount > 0
        ? prisma.subcategory.aggregate({
            _avg: { minPrice: true },
            _min: { minPrice: true },
            _max: { minPrice: true },
          })
        : { _avg: { minPrice: 0 }, _min: { minPrice: 0 }, _max: { minPrice: 0 } },

      // Топ подкатегорий по минимальной ставке
      subcategoriesCount > 0
        ? prisma.subcategory.findMany({
            take: 5,
            orderBy: { minPrice: 'desc' },
            select: { name: true, minPrice: true },
          })
        : [],

      // Последние зарегистрированные пользователи
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { email: true, role: true, createdAt: true },
      }),

      // Рост пользователей за последние 7 дней
      prisma.$queryRawUnsafe(`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY date
        ORDER BY date;
      `),

      // Рост задач за последние 7 дней
      prisma.$queryRawUnsafe(`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "Task"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY date
        ORDER BY date;
      `),

      // Топ категорий по количеству задач
      prisma.$queryRawUnsafe(`
        SELECT c."name" AS name, COUNT(t.id)::int AS tasks
        FROM "Category" c
        JOIN "Subcategory" s ON s."categoryId" = c.id
        JOIN "Task" t ON t."subcategoryId" = s.id
        GROUP BY c."name"
        ORDER BY tasks DESC
        LIMIT 5;
      `)
    ])

    return NextResponse.json({
      usersCount,
      tasksCount,
      responsesCount,
      subcategoriesStats,
      topSubcategories,
      latestUsers,
      usersByDay,
      tasksByDay,
      topCategories,
    })
  } catch (err) {
    logger.error('Ошибка при получении статистики', err)
    return NextResponse.json(
      { error: 'Ошибка при получении статистики', details: process.env.NODE_ENV === 'development' ? String(err) : undefined },
      { status: 500 }
    )
  }
}
