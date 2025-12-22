/**
 * API для работы с командами
 * GET /api/teams - получить список команд пользователя
 * POST /api/teams - создать новую команду
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { canUseGroupFeatures } from '@/lib/companyVerification'

// Лимиты для защиты от абуза
const MAX_TEAMS_PER_USER = 5
const MAX_MEMBERS_PER_TEAM = 20

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Получаем все команды, где пользователь является участником
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
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
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      teams: teams.map(team => ({
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
          userId: team.creator.userId,
          user: team.creator.user,
        },
        isCreator: team.creator.userId === user.id,
        userRole: team.members.find(m => m.userId === user.id)?.role || null,
      })),
    })
  } catch (error) {
    logger.error('Get teams error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при получении списка команд' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем доступ к групповым функциям
    const canUse = await canUseGroupFeatures(user.id)
    if (!canUse) {
      return NextResponse.json(
        {
          error:
            'Групповые функции доступны только для подтвержденных исполнителей ИП/ООО. Подтвердите компанию в настройках.',
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название команды обязательно' },
        { status: 400 }
      )
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Название команды не должно превышать 100 символов' },
        { status: 400 }
      )
    }

    // Проверяем лимит на количество команд
    const userTeamsCount = await prisma.team.count({
      where: {
        members: {
          some: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
    })

    if (userTeamsCount >= MAX_TEAMS_PER_USER) {
      return NextResponse.json(
        {
          error: `Достигнут лимит на количество команд (${MAX_TEAMS_PER_USER})`,
        },
        { status: 403 }
      )
    }

    // Создаем команду
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        creator: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
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
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    logger.info('Team created', {
      teamId: team.id,
      creatorId: user.id,
      name: team.name,
    })

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        members: team.members.map(member => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
        creator: {
          userId: team.creator.userId,
          user: team.creator.user,
        },
      },
    })
  } catch (error) {
    logger.error('Create team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при создании команды' },
      { status: 500 }
    )
  }
}

