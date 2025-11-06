import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// 📌 Получить один пост по ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // В Next.js 15+ params - это промис, нужно await'ить
    const { id } = await params
    
    const me = await getUserFromRequest(req).catch(() => null)

    // Используем select вместо include, чтобы избежать проблем с отсутствующим полем mediaType
    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        isDeleted: true,
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        comments: {
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
              },
            },
          },
        },
        _count: { select: { likes: true } },
      },
    })

    if (!post || post.isDeleted) {
      // возвращаем "виртуальный пост", чтобы фронт не падал
      return NextResponse.json({
        post: {
          id: id,
          title: '[Пост удалён]',
          content: '🚫 Этот пост был удалён администрацией',
          createdAt: new Date().toISOString(),
          author: {
            id: 'deleted',
            fullName: 'Администратор',
            email: 'hidden',
            avatarUrl: null,
          },
          comments: [],
          _count: { likes: 0 },
          imageUrl: null,
          mediaType: 'image',
        },
        liked: false,
      })
    }

    // Определяем mediaType для поста
    let detectedMediaType = (post as any).mediaType || 'image'
    if (!(post as any).mediaType && post.imageUrl) {
      const imageUrlLower = post.imageUrl.toLowerCase()
      if (imageUrlLower.includes('.mp4') || 
          imageUrlLower.includes('.webm') || 
          imageUrlLower.includes('.mov') || 
          imageUrlLower.includes('.avi') || 
          imageUrlLower.includes('.mkv')) {
        detectedMediaType = 'video'
      } else if (post.imageUrl.startsWith('/api/files/')) {
        // Проверяем MIME тип из базы данных
        const fileId = post.imageUrl.replace('/api/files/', '')
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          select: { mimetype: true },
        })
        if (file?.mimetype?.startsWith('video/')) {
          detectedMediaType = 'video'
        }
      }
    }

    // Проверяем, лайкал ли текущий пользователь
    let liked = false
    if (me) {
      const like = await prisma.communityLike.findFirst({
        where: { postId: id, userId: me.id },
      })
      liked = !!like
    }

    // Определяем mediaType для комментариев
    const commentsWithMediaType = await Promise.all(
      post.comments.map(async (c) => {
        let commentMediaType = (c as any).mediaType || 'image'
        if (!(c as any).mediaType && c.imageUrl) {
          const imageUrlLower = c.imageUrl.toLowerCase()
          if (imageUrlLower.includes('.mp4') || 
              imageUrlLower.includes('.webm') || 
              imageUrlLower.includes('.mov') || 
              imageUrlLower.includes('.avi') || 
              imageUrlLower.includes('.mkv')) {
            commentMediaType = 'video'
          } else if (c.imageUrl.startsWith('/api/files/')) {
            const fileId = c.imageUrl.replace('/api/files/', '')
            const file = await prisma.file.findUnique({
              where: { id: fileId },
              select: { mimetype: true },
            })
            if (file?.mimetype?.startsWith('video/')) {
              commentMediaType = 'video'
            }
          }
        }
        return {
          ...c,
          imageUrl: c.imageUrl ? (c.imageUrl.startsWith('/api/files') ? c.imageUrl : c.imageUrl) : null,
          mediaType: commentMediaType,
          author: {
            ...c.author,
            avatarUrl: c.author.avatarFileId
              ? `/api/files/${c.author.avatarFileId}`
              : null,
          },
        }
      })
    )

    // Формируем корректные ссылки на аватарки и изображения
    const formatted = {
      ...post,
      liked,
      // Форматируем imageUrl если он начинается с /api/files, иначе оставляем как есть
      imageUrl: post.imageUrl ? (post.imageUrl.startsWith('/api/files') ? post.imageUrl : post.imageUrl) : null,
      // Сохраняем mediaType для правильного отображения видео
      mediaType: detectedMediaType,
      author: post.author ? {
        ...post.author,
        avatarUrl: post.author.avatarFileId
          ? `/api/files/${post.author.avatarFileId}`
          : null,
      } : {
        id: 'unknown',
        fullName: 'Неизвестный',
        email: '',
        avatarUrl: null,
      },
      comments: commentsWithMediaType,
    }

    return NextResponse.json({ post: formatted, liked })
  } catch (err: any) {
    console.error('Ошибка /api/community/[id]:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// 🗑 Удалить пост
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // В Next.js 15+ params - это промис, нужно await'ить
    const { id } = await params
    
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    })
    
    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 })
    }

    // Проверяем, не удалён ли уже пост
    if (post.isDeleted) {
      return NextResponse.json({ error: 'Пост уже удалён' }, { status: 400 })
    }

    if (post.authorId !== me.id) {
      return NextResponse.json(
        { error: 'Нет прав на удаление этого поста' },
        { status: 403 }
      )
    }

    // Используем мягкое удаление вместо физического
    // Это безопаснее и не нарушает внешние ключи
    // Используем raw SQL для безопасности на случай отсутствия поля deletedReason
    try {
      await prisma.$executeRaw`
        UPDATE "CommunityPost"
        SET "isDeleted" = true, "updatedAt" = NOW()
        WHERE "id" = ${id}
      `
    } catch (sqlError: any) {
      // Если raw SQL не работает, пробуем через ORM
      console.warn('Raw SQL не сработал, пробуем через ORM:', sqlError?.message)
      await prisma.communityPost.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Ошибка удаления поста:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
