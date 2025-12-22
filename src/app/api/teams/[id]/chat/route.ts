/**
 * API для чата команды
 * GET /api/teams/[id]/chat - получить сообщения чата команды
 * POST /api/teams/[id]/chat - отправить сообщение в чат команды
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

    const isMember = team.members.length > 0
    if (!isMember) {
      return NextResponse.json(
        { error: 'Нет доступа к чату команды' },
        { status: 403 }
      )
    }

    // Получаем сообщения чата
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const messages = await prisma.teamChat.findMany({
      where: {
        teamId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            mimetype: true,
            url: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        editedAt: msg.editedAt,
        sender: msg.sender,
        fileUrl: msg.fileUrl,
        file: msg.file
          ? {
              id: msg.file.id,
              filename: msg.file.filename,
              mimetype: msg.file.mimetype,
              url: msg.file.url,
            }
          : null,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              content: msg.replyTo.content,
              sender: msg.replyTo.sender,
            }
          : null,
        reactions: msg.reactions.map(r => ({
          emoji: r.emoji,
          user: r.user,
        })),
      })),
    })
  } catch (error) {
    logger.error('Get team chat error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при получении сообщений чата команды' },
      { status: 500 }
    )
  }
}

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
    const { content, fileId, replyToId } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное (максимум 5000 символов)' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь является участником команды
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

    const isMember = team.members.length > 0
    if (!isMember) {
      return NextResponse.json(
        { error: 'Нет доступа к чату команды' },
        { status: 403 }
      )
    }

    // Проверяем replyTo, если указан
    if (replyToId) {
      const replyTo = await prisma.teamChat.findUnique({
        where: { id: replyToId },
      })

      if (!replyTo || replyTo.teamId !== teamId) {
        return NextResponse.json(
          { error: 'Сообщение для ответа не найдено' },
          { status: 404 }
        )
      }
    }

    // Создаем сообщение
    const message = await prisma.teamChat.create({
      data: {
        teamId,
        senderId: user.id,
        content: content.trim(),
        fileId: fileId || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            mimetype: true,
            url: true,
          },
        },
        replyTo: {
          include: {
            sender: {
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

    logger.info('Team chat message sent', {
      teamId,
      messageId: message.id,
      senderId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: message.sender,
        file: message.file
          ? {
              id: message.file.id,
              filename: message.file.filename,
              mimetype: message.file.mimetype,
              url: message.file.url,
            }
          : null,
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              sender: message.replyTo.sender,
            }
          : null,
      },
    })
  } catch (error) {
    logger.error('Send team chat message error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при отправке сообщения' },
      { status: 500 }
    )
  }
}

