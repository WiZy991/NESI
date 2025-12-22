/**
 * API для удаления участника из команды
 * DELETE /api/teams/[id]/members/[memberId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id: teamId, memberId } = await params

    // Проверяем, что пользователь является администратором команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
        { error: 'Только администратор команды может удалять участников' },
        { status: 403 }
      )
    }

    // Проверяем, что участник существует и не является администратором
    const memberToRemove = await prisma.teamMember.findUnique({
      where: { id: memberId },
    })

    if (!memberToRemove || memberToRemove.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Участник не найден' },
        { status: 404 }
      )
    }

    if (memberToRemove.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Нельзя удалить администратора команды' },
        { status: 400 }
      )
    }

    // Удаляем участника
    await prisma.teamMember.delete({
      where: { id: memberId },
    })

    logger.info('Team member removed', {
      teamId,
      memberId,
      removedUserId: memberToRemove.userId,
      removedBy: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Участник удален из команды',
    })
  } catch (error) {
    logger.error('Remove team member error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при удалении участника' },
      { status: 500 }
    )
  }
}

