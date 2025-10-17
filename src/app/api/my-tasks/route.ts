// app/api/my-tasks/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)

    // --- Проверка авторизации ---
    if (!user) {
      console.error('❌ Пользователь не найден в токене')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('👤 Пользователь:', {
      id: user.id,
      role: user.role,
      email: user.email,
    })

    // --- Проверяем роль ---
    if (user.role !== 'executor') {
      console.warn(`⚠️ Доступ запрещён. Роль: ${user.role}`)
      return NextResponse.json({ error: 'Доступ только для исполнителей' }, { status: 403 })
    }

    // --- Получаем задачи ---
    const tasks = await prisma.task.findMany({
      where: {
        executorId: user.id,
      },
      include: {
        customer: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📦 Найдено задач: ${tasks.length}`)
    if (tasks.length === 0) {
      console.log('ℹ️ Задач не найдено. Возможно, executorId отсутствует в БД.')
    } else {
      console.log('✅ Примеры задач:', tasks.slice(0, 2).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        executorId: t.executorId,
      })))
    }

    return NextResponse.json({ tasks })
  } catch (err: any) {
    console.error('💥 Ошибка при получении задач исполнителя:', err)
    return NextResponse.json(
      { error: 'Ошибка при загрузке задач', details: err.message },
      { status: 500 }
    )
  }
}
