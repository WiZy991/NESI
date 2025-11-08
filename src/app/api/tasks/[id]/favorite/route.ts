import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/tasks/[id]/favorite - Добавить/удалить задачу в избранное
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: taskId } = await params
    if (!taskId) {
      return NextResponse.json({ error: 'ID задачи не указан' }, { status: 400 })
    }

    // Проверяем, существует ли задача
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    }

    // Проверяем, есть ли уже закладка
    const existingFavorite = await prisma.userFavoriteTask.findUnique({
      where: {
        user_task_favorite: {
          userId: user.id,
          taskId: taskId,
        },
      },
    })

    if (existingFavorite) {
      // Удаляем закладку
      await prisma.userFavoriteTask.delete({
        where: {
          id: existingFavorite.id,
        },
      })

      return NextResponse.json({ 
        isFavorite: false,
        message: 'Задача удалена из избранного' 
      })
    } else {
      // Добавляем закладку
      await prisma.userFavoriteTask.create({
        data: {
          userId: user.id,
          taskId: taskId,
        },
      })

      return NextResponse.json({ 
        isFavorite: true,
        message: 'Задача добавлена в избранное' 
      })
    }
  } catch (error: any) {
    console.error('Ошибка при работе с закладкой:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при работе с закладкой' },
      { status: 500 }
    )
  }
}

// GET /api/tasks/[id]/favorite - Проверить, в избранном ли задача
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: taskId } = await params
    if (!taskId) {
      return NextResponse.json({ error: 'ID задачи не указан' }, { status: 400 })
    }

    const favorite = await prisma.userFavoriteTask.findUnique({
      where: {
        user_task_favorite: {
          userId: user.id,
          taskId: taskId,
        },
      },
    })

    return NextResponse.json({ isFavorite: !!favorite })
  } catch (error: any) {
    console.error('Ошибка при проверке закладки:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при проверке закладки' },
      { status: 500 }
    )
  }
}

