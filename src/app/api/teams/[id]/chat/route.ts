/**
 * API для чата команды
 * GET /api/teams/[id]/chat - получить сообщения чата команды
 * POST /api/teams/[id]/chat - отправить сообщение в чат команды
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateFile } from '@/lib/fileValidation'
import { normalizeFileName, isValidFileName } from '@/lib/security'

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
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        fileId: true,
        fileUrl: true,
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
          select: {
            id: true,
            content: true,
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
          select: {
            emoji: true,
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
      messages: messages.map((msg: any) => {
        // Получаем fileId из связи или напрямую из сообщения
        const fileIdFromRelation = msg.file?.id
        const fileIdFromMessage = msg.fileId
        const fileId = fileIdFromRelation || fileIdFromMessage || null
        const fileName = msg.file?.filename || null
        const fileMimetype = msg.file?.mimetype || null
        // Формируем fileUrl: сначала из связи file, потом из fileUrl в сообщении, потом из fileId
        const fileUrl = fileIdFromRelation
          ? `/api/files/${fileIdFromRelation}` 
          : (msg.fileUrl || (fileId ? `/api/files/${fileId}` : null))
        
        logger.debug('Team chat message file data', {
          messageId: msg.id,
          hasFile: !!msg.file,
          fileIdFromRelation,
          fileIdFromMessage,
          fileId,
          fileUrlFromMessage: msg.fileUrl,
          fileName,
          fileMimetype,
          fileUrl,
        })
        
        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          editedAt: msg.editedAt?.toISOString() || null,
          sender: {
            id: msg.sender.id,
            fullName: msg.sender.fullName,
            email: msg.sender.email,
            avatarUrl: msg.sender.avatarFileId ? `/api/files/${msg.sender.avatarFileId}` : undefined,
          },
          fileId,
          fileName,
          fileMimetype,
          fileUrl,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              content: msg.replyTo.content,
              sender: msg.replyTo.sender,
            }
          : null,
        reactions: msg.reactions.map(r => ({
          emoji: r.emoji,
          userId: r.user.id,
          user: r.user,
        })),
        }
      }),
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
    
    // Поддержка multipart/form-data для загрузки файлов (как в чате задач)
    const contentType = req.headers.get('content-type') || ''
    
    let content = ''
    let file: File | null = null
    let fileId: string | null = null
    let replyToId: string | null = null
    
    if (contentType.includes('application/json')) {
      // JSON запрос с fileId (файл уже загружен)
      const body = await req.json().catch(() => null)
      content = typeof body?.content === 'string' ? body.content : (body?.content ? String(body.content) : '')
      fileId = body?.fileId || null
      replyToId = body?.replyToId || null
    } else {
      // Multipart запрос с файлом
      const formData = await req.formData()
      content = formData.get('content')?.toString() || ''
      file = formData.get('file') as File | null
      replyToId = formData.get('replyToId')?.toString() || null
    }

    // Валидация: сообщение или файл должны быть
    if ((!content || content.trim().length === 0) && !fileId && (!file || file.size === 0)) {
      return NextResponse.json(
        { error: 'Сообщение или файл обязательны' },
        { status: 400 }
      )
    }

    if (content && content.length > 5000) {
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

    // Обработка файла (если передан напрямую, а не через fileId)
    let savedFile = null
    
    // Если файл уже загружен (fileId), используем его
    if (fileId) {
      savedFile = await prisma.file.findUnique({
        where: { id: fileId },
      })
      if (!savedFile) {
        return NextResponse.json(
          { error: 'Файл не найден' },
          { status: 404 }
        )
      }
    } else if (file && file.size > 0) {
      try {
        // Защита от path traversal
        const fileName = file.name || 'file'
        if (!isValidFileName(fileName)) {
          return NextResponse.json(
            { error: 'Недопустимое имя файла' },
            { status: 400 }
          )
        }

        // Нормализация имени файла
        const safeFileName = normalizeFileName(fileName)

        // Полная валидация файла (magic bytes, размер, тип)
        const validation = await validateFile(file, true)
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          )
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Используем определенный MIME тип из валидации
        const detectedMimeType = validation.detectedMimeType || file.type

        savedFile = await prisma.file.create({
          data: {
            filename: safeFileName,
            mimetype: detectedMimeType,
            size: file.size,
            data: buffer,
          },
        })
      } catch (fileError: any) {
        logger.error('Ошибка сохранения файла в командном чате', fileError, { teamId, userId: user.id })
        return NextResponse.json(
          { error: 'Ошибка сохранения файла' },
          { status: 500 }
        )
      }
    }

    // Создаем сообщение
    const message = await prisma.teamChat.create({
      data: {
        teamId,
        senderId: user.id,
        content: content ? content.trim() : '',
        fileId: savedFile ? savedFile.id : (fileId || null),
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
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() || null,
        sender: {
          id: message.sender.id,
          fullName: message.sender.fullName,
          email: message.sender.email,
          avatarUrl: message.sender.avatarFileId ? `/api/files/${message.sender.avatarFileId}` : undefined,
        },
        fileId: message.file?.id || (message as any).fileId || null,
        fileName: message.file?.filename || null,
        fileMimetype: message.file?.mimetype || null,
        fileUrl: message.file 
          ? `/api/files/${message.file.id}` 
          : ((message as any).fileUrl || ((message as any).fileId ? `/api/files/${(message as any).fileId}` : null)),
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              sender: message.replyTo.sender,
            }
          : null,
        reactions: message.reactions?.map(r => ({
          emoji: r.emoji,
          userId: r.user.id,
          user: r.user,
        })) || [],
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

