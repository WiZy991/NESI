/**
 * API для приглашения пользователей в команду
 * POST /api/teams/[id]/invite
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { createNotificationWithSettings } from '@/lib/notify'

// Лимиты для защиты от абуза
const MAX_INVITATIONS_PER_DAY = 10
const MAX_MEMBERS_PER_TEAM = 20

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
    const { recipientEmail } = body

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json(
        { error: 'Email получателя обязателен' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь является администратором команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: user.id },
        },
        _count: {
          select: {
            members: true,
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

    const userMember = team.members[0]
    if (!userMember || userMember.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Только администратор команды может приглашать участников' },
        { status: 403 }
      )
    }

    // Проверяем лимит участников
    if (team._count.members >= MAX_MEMBERS_PER_TEAM) {
      return NextResponse.json(
        {
          error: `Достигнут лимит участников команды (${MAX_MEMBERS_PER_TEAM})`,
        },
        { status: 403 }
      )
    }

    // Проверяем лимит приглашений за день
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const invitationsToday = await prisma.teamInvitation.count({
      where: {
        inviterId: user.id,
        createdAt: {
          gte: today,
        },
      },
    })

    if (invitationsToday >= MAX_INVITATIONS_PER_DAY) {
      return NextResponse.json(
        {
          error: `Достигнут лимит приглашений за день (${MAX_INVITATIONS_PER_DAY})`,
        },
        { status: 403 }
      )
    }

    // Находим пользователя по email
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accountType: true,
      },
    })

    if (!recipient) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      )
    }

    // Проверяем, что получатель - исполнитель
    if (recipient.role !== 'executor') {
      return NextResponse.json(
        { error: 'Приглашать можно только исполнителей' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь еще не в команде
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: recipient.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Пользователь уже является участником команды' },
        { status: 400 }
      )
    }

    // Проверяем, нет ли уже активного приглашения
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        recipientId: recipient.id,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Приглашение уже отправлено этому пользователю' },
        { status: 400 }
      )
    }

    // Создаем приглашение
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Приглашение действительно 7 дней

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        inviterId: user.id,
        recipientId: recipient.id,
        token,
        expiresAt,
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        inviter: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    })

    // Отправляем уведомление
    await createNotificationWithSettings(recipient.id, {
      type: 'team_invitation',
      message: `${user.fullName || user.email} пригласил вас в команду "${invitation.team.name}"`,
      link: `/teams/invitations/${token}`,
    })

    logger.info('Team invitation sent', {
      teamId,
      inviterId: user.id,
      recipientId: recipient.id,
      invitationId: invitation.id,
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        recipient: {
          id: recipient.id,
          email: recipient.email,
          fullName: recipient.fullName,
        },
      },
    })
  } catch (error) {
    logger.error('Invite to team error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при отправке приглашения' },
      { status: 500 }
    )
  }
}

