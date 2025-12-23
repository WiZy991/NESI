/**
 * API для привязки задачи к команде
 * POST /api/teams/[id]/link-task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: teamId } = await params
    const body = await req.json()
    const { taskId } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Необходимо указать ID задачи' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь является администратором команды
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    })

    if (!teamMember || teamMember.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Только администратор команды может привязывать задачи' },
        { status: 403 }
      )
    }

    // Проверяем, что задача существует и пользователь является её исполнителем
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        executorId: true,
        teamId: true,
        customerId: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, что задача уже назначена на команду или на администратора команды
    if (task.teamId && task.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Задача уже привязана к другой команде' },
        { status: 400 }
      )
    }

    if (task.executorId !== user.id && task.customerId !== user.id) {
      return NextResponse.json(
        { error: 'Вы не являетесь исполнителем или заказчиком этой задачи' },
        { status: 403 }
      )
    }

    // Привязываем задачу к команде
    await prisma.task.update({
      where: { id: taskId },
      data: {
        teamId,
      },
    })

    logger.info('Task linked to team', {
      taskId,
      teamId,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Задача успешно привязана к команде',
    })
  } catch (error) {
    logger.error('Link task to team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при привязке задачи к команде' },
      { status: 500 }
    )
  }
}

