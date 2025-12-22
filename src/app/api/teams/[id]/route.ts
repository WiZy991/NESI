/**
 * API для работы с конкретной командой
 * GET /api/teams/[id] - получить информацию о команде
 * PATCH /api/teams/[id] - обновить команду
 * DELETE /api/teams/[id] - удалить команду
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

    const { id } = await params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarFileId: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, что пользователь является участником команды
    const isMember = team.members.some(m => m.userId === user.id)
    if (!isMember) {
      return NextResponse.json(
        { error: 'Нет доступа к этой команде' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        memberCount: team._count.members,
        taskCount: team._count.tasks,
        members: team.members.map(member => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
        creator: {
          userId: team.creator.id,
          user: team.creator,
        },
        isCreator: team.creator.id === user.id,
        userRole: team.members.find(m => m.userId === user.id)?.role || null,
      },
    })
  } catch (error) {
    logger.error('Get team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при получении информации о команде' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Проверяем, что пользователь является администратором команды
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    const userMember = team.members[0]
    if (!userMember || userMember.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Только администратор команды может изменять её настройки' },
        { status: 403 }
      )
    }

    // Обновляем команду
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name: body.name ? body.name.trim() : undefined,
        description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
      },
    })

    logger.info('Team updated', {
      teamId: id,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      team: updatedTeam,
    })
  } catch (error) {
    logger.error('Update team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при обновлении команды' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем, что пользователь является создателем команды
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    if (team.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Только создатель команды может её удалить' },
        { status: 403 }
      )
    }

    // Удаляем команду (каскадное удаление через Prisma)
    await prisma.team.delete({
      where: { id },
    })

    logger.info('Team deleted', {
      teamId: id,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Команда удалена',
    })
  } catch (error) {
    logger.error('Delete team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при удалении команды' },
      { status: 500 }
    )
  }
}

