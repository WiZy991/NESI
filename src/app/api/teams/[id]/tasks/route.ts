/**
 * API для получения задач команды
 * GET /api/teams/[id]/tasks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Проверяем, что пользователь является участником команды
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Вы не являетесь участником этой команды' },
        { status: 403 }
      )
    }

    // Получаем задачи команды
    const tasks = await prisma.task.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        status: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        executor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
            responses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    logger.debug('Team tasks loaded', {
      teamId,
      userId: user.id,
      taskCount: tasks.length,
    })

    return NextResponse.json({
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        price: task.price ? task.price.toString() : null,
        status: task.status,
        deadline: task.deadline?.toISOString() || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        completedAt: task.completedAt?.toISOString() || null,
        customer: task.customer
          ? {
              id: task.customer.id,
              fullName: task.customer.fullName,
              email: task.customer.email,
              avatarUrl: task.customer.avatarFileId
                ? `/api/files/${task.customer.avatarFileId}`
                : null,
            }
          : null,
        executor: task.executor
          ? {
              id: task.executor.id,
              fullName: task.executor.fullName,
              email: task.executor.email,
            }
          : null,
        messagesCount: task._count.messages,
        responsesCount: task._count.responses,
      })),
    })
  } catch (error) {
    logger.error('Get team tasks error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при получении задач команды' },
      { status: 500 }
    )
  }
}

