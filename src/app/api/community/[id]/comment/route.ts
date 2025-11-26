import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { validateWithZod, imageUrlSchema } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'

// Схема валидации для создания комментария
const createCommentSchema = z.object({
	content: z
		.string()
		.max(2000, 'Комментарий слишком длинный (максимум 2000 символов)')
		.trim()
		.optional()
		.nullable()
		.transform(val => val === null || val === undefined || val === '' ? undefined : val),
	imageUrl: imageUrlSchema,
	parentId: z
		.string()
		.uuid('Некорректный ID родительского комментария')
		.optional()
		.nullable()
		.transform(val => val === null || val === undefined || val === '' ? undefined : val),
	mediaType: z.enum(['image', 'video']).optional().nullable(),
})

// 📌 Оптимизированная функция для построения дерева комментариев
// Загружает все комментарии одним запросом вместо рекурсивных N+1 запросов
function buildCommentTree(comments: any[], parentId: string | null = null): any[] {
  return comments
    .filter(c => c.parentId === parentId)
    .map(comment => ({
      ...comment,
      mediaType: comment.mediaType || 'image',
      author: {
        ...comment.author,
        avatarUrl: comment.author.avatarFileId
          ? `/api/files/${comment.author.avatarFileId}`
          : null,
      },
      replies: buildCommentTree(comments, comment.id),
    }))
}

// 📌 Получить комментарии к посту
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Оптимизация: загружаем ВСЕ комментарии к посту одним запросом
    // вместо рекурсивных запросов для каждого уровня вложенности
    const allComments = await prisma.communityComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        authorId: true,
        parentId: true,
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
            xp: true,
          },
        },
      },
    })

    // Строим дерево комментариев на стороне сервера (без дополнительных запросов)
    const commentsTree = buildCommentTree(allComments, null)

    return NextResponse.json({ comments: commentsTree })
  } catch (err) {
    logger.error('Ошибка загрузки комментариев', err, { postId: id })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 📌 Добавить комментарий (текст или imageUrl, либо оба)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      )
    }

    // Валидация данных
    const validation = validateWithZod(createCommentSchema, body)
    if (!validation.success) {
      logger.warn('Ошибка валидации комментария', {
        errors: validation.errors,
        body: JSON.stringify(body),
      })
      return NextResponse.json(
        { error: validation.errors.join(', ') || 'Invalid input' },
        { status: 400 }
      )
    }

    const { content, parentId, imageUrl, mediaType } = validation.data

    // Разрешаем пустой контент если есть файл
    if ((!content || !content.trim()) && !imageUrl) {
      return NextResponse.json(
        { error: 'Комментарий или файл обязателен' },
        { status: 400 }
      )
    }

    // Дополнительная валидация длины содержимого
    if (content) {
      const contentValidation = validateStringLength(content, 2000, 'Комментарий')
      if (!contentValidation.valid) {
        return NextResponse.json(
          { error: contentValidation.error },
          { status: 400 }
        )
      }
    }

    // Определяем тип медиа - используем переданный mediaType или определяем по расширению URL
    // Не делаем запрос к БД для оптимизации - полагаемся на данные с фронтенда
    let detectedMediaType = mediaType || 'image'
    
    // Если mediaType не передан, пытаемся определить по расширению в URL (быстро, без запроса к БД)
    if (!mediaType && imageUrl) {
      const lower = imageUrl.toLowerCase()
      if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv')) {
        detectedMediaType = 'video'
      } else {
        detectedMediaType = 'image'
      }
    }

    // Если это ответ на комментарий, проверяем что родительский комментарий существует и принадлежит к этому посту
    let parentCommentAuthorId: string | null = null
    if (parentId) {
      const parentComment = await prisma.communityComment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, authorId: true },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Родительский комментарий не найден' },
          { status: 404 }
        )
      }

      if (parentComment.postId !== id) {
        return NextResponse.json(
          { error: 'Родительский комментарий не принадлежит к этому посту' },
          { status: 400 }
        )
      }

      parentCommentAuthorId = parentComment.authorId
    }

    const data: any = {
      content: (content && content.trim()) ? content.trim() : '',
      parentId: parentId || null,
      postId: id,
      authorId: me.id,
    }

    if (imageUrl) {
      data.imageUrl = imageUrl
      data.mediaType = detectedMediaType
    }

    let comment
    try {
      // Пробуем создать без mediaType (поле может отсутствовать в БД)
      const createData: any = {
        content: data.content,
        parentId: data.parentId,
        postId: data.postId,
        authorId: data.authorId,
      }
      
      if (data.imageUrl) {
        createData.imageUrl = data.imageUrl
        // НЕ добавляем mediaType - поле отсутствует в БД
      }
      
      comment = await prisma.communityComment.create({
        data: createData,
        select: {
          id: true,
          postId: true,
          authorId: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          parentId: true,
          author: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarFileId: true,
            },
          },
        },
      })
      
      // Добавляем mediaType вручную в ответе (не из БД)
      comment = {
        ...comment,
        mediaType: imageUrl ? detectedMediaType : 'image',
      } as any
    } catch (createError: any) {
      // Если поле mediaType отсутствует в БД, используем raw SQL
      const isSchemaError = createError?.code === 'P2022' || 
                           createError?.message?.includes('mediaType') ||
                           createError?.message?.includes('does not exist')
      
      if (isSchemaError) {
        logger.warn('Поле mediaType отсутствует в БД. Создаем через raw SQL')
        // Используем raw SQL без mediaType
        const { randomUUID } = await import('crypto')
        const commentId = randomUUID()
        
        // Создаем комментарий без mediaType через raw SQL
        if (imageUrl) {
          await prisma.$executeRaw`
            INSERT INTO "CommunityComment" ("id", "postId", "authorId", "content", "imageUrl", "createdAt", "parentId")
            VALUES (${commentId}, ${id}, ${me.id}, ${data.content || ''}, ${imageUrl}, NOW(), ${data.parentId || null})
          `
        } else {
          await prisma.$executeRaw`
            INSERT INTO "CommunityComment" ("id", "postId", "authorId", "content", "createdAt", "parentId")
            VALUES (${commentId}, ${id}, ${me.id}, ${data.content || ''}, NOW(), ${data.parentId || null})
          `
        }
        
        // Получаем созданный комментарий через select (без mediaType)
        comment = await prisma.communityComment.findUnique({
          where: { id: commentId },
          select: {
            id: true,
            postId: true,
            authorId: true,
            content: true,
            imageUrl: true,
            createdAt: true,
            parentId: true,
            author: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarFileId: true,
              },
            },
          },
        })
        
        if (!comment) {
          throw new Error('Комментарий не был создан через raw SQL')
        }
        
        // Добавляем mediaType вручную в ответе
        comment = {
          ...comment,
          mediaType: imageUrl ? detectedMediaType : 'image',
        } as any
      } else {
        throw createError
      }
    }

    const formattedComment = {
      ...comment,
      author: {
        ...comment.author,
        avatarUrl: comment.author.avatarFileId
          ? `/api/files/${comment.author.avatarFileId}`
          : null,
      },
    }

    // Отправка уведомлений о комментарии
    try {
      if (parentId && parentCommentAuthorId) {
        // Это ответ на комментарий - отправляем уведомление автору родительского комментария
        if (parentCommentAuthorId !== me.id) {
          // Не отправляем уведомление самому себе
          const commentAuthorName = comment.author.fullName || comment.author.email || 'Пользователь'
          await prisma.notification.create({
            data: {
              userId: parentCommentAuthorId,
              type: 'community_comment_reply',
              message: `${commentAuthorName} ответил на ваш комментарий`,
              link: `/community/${id}#comment-${comment.id}`,
            },
          })
        }
      } else {
        // Это комментарий к посту - отправляем уведомление автору поста
        const post = await prisma.communityPost.findUnique({
          where: { id },
          select: { authorId: true, title: true },
        })

        if (post && post.authorId !== me.id) {
          // Не отправляем уведомление самому себе
          const commentAuthorName = comment.author.fullName || comment.author.email || 'Пользователь'
          const postTitle = post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title
          await prisma.notification.create({
            data: {
              userId: post.authorId,
              type: 'community_comment',
              message: `${commentAuthorName} оставил комментарий к вашему посту "${postTitle}"`,
              link: `/community/${id}#comment-${comment.id}`,
            },
          })
        }
      }
    } catch (notificationError: any) {
      // Логируем ошибку, но не прерываем создание комментария
      logger.error('Ошибка отправки уведомления о комментарии', notificationError, {
        commentId: comment.id,
        postId: id,
        parentId,
      })
    }

    return NextResponse.json({ ok: true, comment: formattedComment }, { status: 201 })
  } catch (err: any) {
    logger.error('Ошибка создания комментария', err, {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    })
    return NextResponse.json({ 
      error: err?.message || 'Ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? err?.message : undefined
    }, { status: 500 })
  }
}

// ✏️ PATCH — редактировать комментарий
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { commentId, content } = await req.json()
    if (!commentId || !content?.trim())
      return NextResponse.json(
        { error: 'Некорректные данные' },
        { status: 400 }
      )

    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
    })
    if (!comment)
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    if (comment.authorId !== me.id)
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 })

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Ошибка PATCH комментария', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 🗑 DELETE — удалить комментарий
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { commentId } = await req.json()
    if (!commentId)
      return NextResponse.json({ error: 'Не указан commentId' }, { status: 400 })

    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
    })
    if (!comment)
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    if (comment.authorId !== me.id)
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 })

    await prisma.communityComment.delete({ where: { id: commentId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Ошибка DELETE комментария', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
