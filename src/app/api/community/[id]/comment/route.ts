import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Рекурсивная функция для получения всех уровней replies
async function getReplies(commentId: string) {
  const replies = await prisma.communityComment.findMany({
    where: { parentId: commentId },
    orderBy: { createdAt: 'asc' },
    include: {
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

  for (const reply of replies) {
    ;(reply as any).replies = await getReplies(reply.id)
  }

  // добавляем avatarUrl и mediaType для каждого ответа
  return replies.map((r) => ({
    ...r,
    mediaType: r.mediaType || 'image',
    author: {
      ...r.author,
      avatarUrl: r.author.avatarFileId
        ? `/api/files/${r.author.avatarFileId}`
        : null,
    },
  }))
}

// 📌 Получить комментарии к посту
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comments = await prisma.communityComment.findMany({
      where: { postId: id, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
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

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        mediaType: comment.mediaType || 'image',
        author: {
          ...comment.author,
          avatarUrl: comment.author.avatarFileId
            ? `/api/files/${comment.author.avatarFileId}`
            : null,
        },
        replies: await getReplies(comment.id),
      }))
    )

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (err) {
    console.error('🔥 Ошибка загрузки комментариев:', err)
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

    const { content, parentId, imageUrl, mediaType } = body || {}

    // Разрешаем пустой контент если есть файл
    if ((!content || !content.trim()) && !imageUrl) {
      return NextResponse.json(
        { error: 'Комментарий или файл обязателен' },
        { status: 400 }
      )
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
        console.log('⚠️ Поле mediaType отсутствует в БД. Создаем через raw SQL.')
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

    return NextResponse.json({ ok: true, comment: formattedComment }, { status: 201 })
  } catch (err: any) {
    console.error('🔥 Ошибка создания комментария:', {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      stack: err?.stack,
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
    console.error('Ошибка PATCH комментария:', err)
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
    console.error('Ошибка DELETE комментария:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
