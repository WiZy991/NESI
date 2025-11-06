import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

// 📌 Получить список постов
export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Используем select вместо include, чтобы избежать проблем с отсутствующим полем mediaType
    const posts = await prisma.communityPost.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: { isDeleted: false }, // Только не удаленные посты
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarFileId: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    })
    
    console.log(`📋 Получено постов: ${posts.length}`)

    // Получаем лайки отдельно, если пользователь авторизован
    let userLikes: string[] = []
    if (me) {
      const likes = await prisma.communityLike.findMany({
        where: {
          userId: me.id,
          postId: { in: posts.map(p => p.id) },
        },
        select: { postId: true },
      })
      userLikes = likes.map(l => l.postId)
    }

    // Если нужно определить mediaType по MIME типу файла, получаем информацию о файлах
    const fileIds = posts
      .filter(p => p.imageUrl?.startsWith('/api/files/'))
      .map(p => p.imageUrl.replace('/api/files/', ''))
      .filter(id => id.length > 0)
    
    const filesMap = new Map<string, string>()
    if (fileIds.length > 0) {
      const files = await prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: { id: true, mimetype: true },
      })
      files.forEach(f => {
        filesMap.set(f.id, f.mimetype)
      })
    }

    const formatted = posts.map((p) => {
      // Определяем mediaType на основе URL или расширения файла
      let detectedMediaType = (p as any).mediaType || 'image'
      
      // Если mediaType не определен, пытаемся определить по URL или MIME типу
      if (!(p as any).mediaType && p.imageUrl) {
        const imageUrlLower = p.imageUrl.toLowerCase()
        
        // Проверяем расширения видео в URL
        if (imageUrlLower.includes('.mp4') || 
            imageUrlLower.includes('.webm') || 
            imageUrlLower.includes('.mov') || 
            imageUrlLower.includes('.avi') || 
            imageUrlLower.includes('.mkv')) {
          detectedMediaType = 'video'
        } else if (p.imageUrl.startsWith('/api/files/')) {
          // Если URL без расширения, проверяем MIME тип из базы данных
          const fileId = p.imageUrl.replace('/api/files/', '')
          const mimetype = filesMap.get(fileId)
          if (mimetype && mimetype.startsWith('video/')) {
            detectedMediaType = 'video'
          }
        }
      }
      
      const result = {
        ...p,
        liked: userLikes.includes(p.id),
        // Форматируем imageUrl если он начинается с /api/files, иначе оставляем как есть
        imageUrl: p.imageUrl ? (p.imageUrl.startsWith('/api/files') ? p.imageUrl : p.imageUrl) : null,
        // Сохраняем mediaType для правильного отображения видео
        mediaType: detectedMediaType,
        author: {
          ...p.author,
          avatarUrl: p.author.avatarFileId
            ? `/api/files/${p.author.avatarFileId}`
            : null,
        },
      }
      
      // Логируем для диагностики
      if (p.imageUrl && detectedMediaType === 'video') {
        console.log(`🎥 Определен видео пост: ${p.id}, imageUrl: ${p.imageUrl}, mediaType: ${detectedMediaType}`)
      }
      
      return result
    })

    return NextResponse.json({ posts: formatted })
  } catch (err: any) {
    console.error('❌ Ошибка получения постов:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    })
    
    // Если ошибка связана с отсутствующим полем mediaType - пробуем получить посты без него
    const isSchemaError = 
      err?.message?.includes('mediaType') || 
      err?.code === 'P2009' || 
      err?.code === 'P2011' ||
      err?.code === 'P2022' ||
      err?.message?.includes('Unknown column') ||
      err?.message?.includes('does not exist')
    
    if (isSchemaError) {
      console.log('⚠️ Проблема с mediaType при получении постов. Пробуем через raw SQL.')
      try {
        // Используем raw SQL для получения постов
        const postsRaw = await prisma.$queryRaw<Array<{
          id: string
          title: string
          content: string
          imageUrl: string | null
          createdAt: Date
          updatedAt: Date
          authorId: string
          author: any
        }>>`
          SELECT 
            cp."id",
            cp."title",
            cp."content",
            cp."imageUrl",
            cp."createdAt",
            cp."updatedAt",
            cp."authorId",
            u."id" as "author_id",
            u."fullName" as "author_fullName",
            u."email" as "author_email",
            u."avatarFileId" as "author_avatarFileId"
          FROM "CommunityPost" cp
          INNER JOIN "User" u ON cp."authorId" = u."id"
          WHERE cp."isDeleted" = false
          ORDER BY cp."createdAt" DESC
          LIMIT ${limit}
          OFFSET ${(page - 1) * limit}
        `
        
        // Получаем счетчики отдельно
        const postsWithCounts = await Promise.all(
          postsRaw.map(async (p) => {
            const [commentsCount, likesCount] = await Promise.all([
              prisma.communityComment.count({ where: { postId: p.id } }),
              prisma.communityLike.count({ where: { postId: p.id } }),
            ])
            return {
              ...p,
              _count: { comments: commentsCount, likes: likesCount },
              author: {
                id: p.author_id,
                fullName: p.author_fullName,
                email: p.author_email,
                avatarFileId: p.author_avatarFileId,
              },
            }
          })
        )
        
        // Получаем лайки пользователя
        let userLikes: string[] = []
        if (me && postsWithCounts.length > 0) {
          const likes = await prisma.communityLike.findMany({
            where: {
              userId: me.id,
              postId: { in: postsWithCounts.map(p => p.id) },
            },
            select: { postId: true },
          })
          userLikes = likes.map(l => l.postId)
        }
        
        const formattedFallback = postsWithCounts.map((p) => {
          // Определяем mediaType на основе URL
          let detectedMediaType = 'image'
          if (p.imageUrl) {
            const imageUrlLower = p.imageUrl.toLowerCase()
            if (imageUrlLower.includes('.mp4') || 
                imageUrlLower.includes('.webm') || 
                imageUrlLower.includes('.mov') || 
                imageUrlLower.includes('.avi') || 
                imageUrlLower.includes('.mkv')) {
              detectedMediaType = 'video'
            }
          }
          
          return {
            ...p,
            liked: userLikes.includes(p.id),
            imageUrl: p.imageUrl ? (p.imageUrl.startsWith('/api/files') ? p.imageUrl : p.imageUrl) : null,
            mediaType: detectedMediaType,
            author: {
              ...p.author,
              avatarUrl: p.author.avatarFileId
                ? `/api/files/${p.author.avatarFileId}`
                : null,
            },
          }
        })
        
        return NextResponse.json({ posts: formattedFallback })
      } catch (fallbackError: any) {
        console.error('❌ Ошибка при получении постов через raw SQL:', fallbackError)
        return NextResponse.json({ error: 'Ошибка сервера', posts: [] }, { status: 500 })
      }
    }
    
    return NextResponse.json({ error: 'Ошибка сервера', posts: [] }, { status: 500 })
  }
}

// 📌 Создать пост (без заголовка)
export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req).catch(() => null)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      )
    }

    const { content, imageUrl, mediaType } = body || {}
    
    // Валидация данных
    if (!content?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: 'Пост не может быть пустым' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь существует
    if (!me?.id) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 401 }
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

    // Создаем пост - всегда без mediaType в data (поле может отсутствовать в БД)
    // mediaType добавим в ответе вручную
    const baseData: any = {
      title: '',
      content: content?.trim() || '',
      imageUrl: imageUrl || null,
      authorId: me.id,
    }
    
    // Пробуем создать с mediaType, если не получится - без него
    let post
    try {
      // Сначала пробуем с mediaType
      const dataWithMediaType = { ...baseData, mediaType: detectedMediaType }
      post = await prisma.communityPost.create({
        data: dataWithMediaType,
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarFileId: true,
            },
          },
          _count: { select: { comments: true, likes: true } },
        },
      })
      // Если mediaType есть в БД, он будет в результате, если нет - добавим вручную
      post = {
        ...post,
        mediaType: (post as any).mediaType || detectedMediaType,
      } as any
    } catch (dbError: any) {
      // Логируем детали ошибки для диагностики
      console.error('🔍 Ошибка при создании поста с mediaType:', {
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
      })
      
      // Если ошибка связана с отсутствующим полем mediaType - пробуем без него
      const isSchemaError = 
        dbError?.message?.includes('mediaType') || 
        dbError?.code === 'P2009' || 
        dbError?.code === 'P2011' ||
        dbError?.code === 'P2022' ||
        dbError?.message?.includes('Unknown column') ||
        dbError?.message?.includes('does not exist') ||
        (dbError?.message?.includes('column') && dbError?.message?.includes('not exist'))
      
      if (isSchemaError) {
        console.log('⚠️ Поле mediaType отсутствует в БД. Создаем через raw SQL.')
        try {
          // Используем raw SQL, чтобы обойти Prisma клиент, который знает о mediaType из схемы
          // Генерируем ID вручную (cuid формат примерно 25 символов)
          const generateCuid = () => {
            const timestamp = Date.now().toString(36)
            const random = Math.random().toString(36).substring(2, 15)
            return `c${timestamp}${random}`.substring(0, 25)
          }
          const postId = generateCuid()
          const now = new Date()
          
          // Используем параметризованный запрос для безопасности
          // ВАЖНО: НЕ включаем mediaType в список полей, так как его нет в БД
          await prisma.$executeRaw`
            INSERT INTO "CommunityPost" ("id", "authorId", "title", "content", "imageUrl", "createdAt", "updatedAt", "isDeleted")
            VALUES (${postId}, ${baseData.authorId}, ${baseData.title}, ${baseData.content}, ${baseData.imageUrl}, ${now}, ${now}, false)
          `
          
          // Получаем созданный пост с автором
          const createdPost = await prisma.communityPost.findUnique({
            where: { id: postId },
            select: {
              id: true,
              title: true,
              content: true,
              imageUrl: true,
              createdAt: true,
              updatedAt: true,
              authorId: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarFileId: true,
                },
              },
              _count: { select: { comments: true, likes: true } },
            },
          })
          
          if (!createdPost) {
            throw new Error('Пост не был создан через raw SQL')
          }
          
          // Добавляем mediaType вручную в ответе
          post = {
            ...createdPost,
            mediaType: detectedMediaType,
          } as any
        } catch (secondError: any) {
          console.error('❌ Ошибка при создании поста через raw SQL:', {
            message: secondError?.message,
            code: secondError?.code,
            meta: secondError?.meta,
            stack: secondError?.stack,
          })
          throw secondError
        }
      } else {
        // Если это не ошибка схемы - пробрасываем дальше
        console.error('❌ Ошибка создания поста (не схема):', {
          message: dbError?.message,
          code: dbError?.code,
          meta: dbError?.meta,
        })
        throw dbError
      }
    }

    // Проверяем, что пост был создан
    if (!post) {
      throw new Error('Пост не был создан')
    }

    const formattedPost = {
      ...post,
      mediaType: (post as any).mediaType || detectedMediaType,
      author: {
        ...post.author,
        avatarUrl: post.author.avatarFileId
          ? `/api/files/${post.author.avatarFileId}`
          : null,
      },
    }

    return NextResponse.json({ ok: true, post: formattedPost }, { status: 201 })
  } catch (err: any) {
    console.error('🔥 Ошибка создания поста:', err)
    console.error('Детали ошибки:', {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      meta: err?.meta,
      name: err?.name,
    })
    
    // Если это ошибка валидации или схемы БД - возвращаем более понятное сообщение
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Пост с такими данными уже существует' },
        { status: 400 }
      )
    }
    
    if (err?.code === 'P2003' || err?.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Ошибка связи с пользователем' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Ошибка сервера при создании поста', 
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined 
      },
      { status: 500 }
    )
  }
}
