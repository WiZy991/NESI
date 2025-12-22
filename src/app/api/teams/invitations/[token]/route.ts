/**
 * API для работы с приглашениями в команду
 * GET /api/teams/invitations/[token] - получить информацию о приглашении
 * POST /api/teams/invitations/[token] - принять или отклонить приглашение
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { canUseGroupFeatures } from '@/lib/companyVerification'

const MAX_MEMBERS_PER_TEAM = 20

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
        inviter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено' },
        { status: 404 }
      )
    }

    // Не проверяем авторизацию для GET запроса - пользователь может просмотреть приглашение
    // Проверка будет при принятии приглашения (POST запрос)

    // Проверяем статус
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        {
          error:
            invitation.status === 'ACCEPTED'
              ? 'Приглашение уже принято'
              : invitation.status === 'REJECTED'
                ? 'Приглашение отклонено'
                : 'Приглашение истекло',
        },
        { status: 400 }
      )
    }

    // Проверяем срок действия
    if (invitation.expiresAt < new Date()) {
      // Обновляем статус
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json(
        { error: 'Приглашение истекло' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        team: invitation.team,
        inviter: {
          id: invitation.inviter.id,
          fullName: invitation.inviter.fullName,
          email: invitation.inviter.email,
        },
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    logger.error('Get invitation error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при получении информации о приглашении' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { token } = await params
    const body = await req.json()
    const { action } = body // 'accept' или 'reject'

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Действие должно быть "accept" или "reject"' },
        { status: 400 }
      )
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено' },
        { status: 404 }
      )
    }

    // Проверяем, что приглашение адресовано текущему пользователю
    if (invitation.recipientId !== user.id) {
      return NextResponse.json(
        { error: 'Это приглашение адресовано другому пользователю' },
        { status: 403 }
      )
    }

    // Проверяем статус
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Приглашение уже обработано' },
        { status: 400 }
      )
    }

    // Проверяем срок действия
    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json(
        { error: 'Приглашение истекло' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      // Отклоняем приглашение
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'REJECTED',
        },
      })

      logger.info('Team invitation rejected', {
        invitationId: invitation.id,
        userId: user.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Приглашение отклонено',
      })
    }

    // Принимаем приглашение
    // Проверяем доступ к групповым функциям
    const canUse = await canUseGroupFeatures(user.id)
    if (!canUse) {
      return NextResponse.json(
        {
          error:
            'Для участия в команде необходимо подтвердить компанию. Подтвердите компанию в настройках.',
        },
        { status: 403 }
      )
    }

    // Проверяем лимит участников
    if (invitation.team._count.members >= MAX_MEMBERS_PER_TEAM) {
      return NextResponse.json(
        {
          error: `Команда уже достигла лимита участников (${MAX_MEMBERS_PER_TEAM})`,
        },
        { status: 403 }
      )
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invitation.teamId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      // Обновляем статус приглашения
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Вы уже являетесь участником этой команды',
      })
    }

    // Добавляем пользователя в команду
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: user.id,
          role: 'MEMBER',
        },
      }),
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
    ])

    logger.info('Team invitation accepted', {
      invitationId: invitation.id,
      userId: user.id,
      teamId: invitation.teamId,
    })

    return NextResponse.json({
      success: true,
      message: 'Вы присоединились к команде',
    })
  } catch (error) {
    logger.error('Process invitation error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при обработке приглашения' },
      { status: 500 }
    )
  }
}

