import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  try {
    // 1️⃣ Один запрос для получения всех данных + параллельный расчет avgRating
    const [fullUser, avgRatingResult] = await Promise.all([
      prisma.user.findUnique({
    where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          description: true,
          location: true,
          skills: true,
          avatarFileId: true,
          balance: true,
          frozenBalance: true,
          xp: true,
          completedTasksCount: true,
          createdAt: true,
          avatarFile: {
            select: { id: true }
          },
          // Ограничиваем reviewsReceived - берем только последние 20 для быстрой загрузки
    reviewsReceived: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              fromUser: {
                select: { id: true, fullName: true, email: true }
              },
              task: {
                select: { id: true, title: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 20, // Ограничение для производительности
          },
          // Дополнительные данные для исполнителя (загружаются только если role === 'executor')
    level: true,
    badges: {
            select: {
              id: true,
              earnedAt: true,
              badge: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon: true,
                  targetRole: true, // Добавляем targetRole для фильтрации
                }
              }
            },
      orderBy: { earnedAt: 'desc' },
    },
    certifications: {
            select: {
              id: true,
              level: true,
              grantedAt: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
      orderBy: { grantedAt: 'desc' },
    },
    executedTasks: {
      where: { status: 'completed' },
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              completedAt: true,
              customer: {
                select: { id: true, fullName: true, email: true }
              },
              review: {
                select: {
                  id: true,
                  rating: true,
                  comment: true,
                }
              }
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    },
    _count: {
      select: {
        executedTasks: { where: { status: 'completed' } },
        reviewsReceived: true,
        responses: true,
      },
    },
        },
      }),
      // Параллельно вычисляем avgRating через агрегацию (быстрее чем загружать все reviews)
      prisma.review.aggregate({
        where: { toUserId: user.id },
        _avg: { rating: true },
        _count: { rating: true },
  })
    ])

  if (!fullUser)
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    // 2️⃣ Вычисляем avgRating из результата агрегации
    const avgRating = avgRatingResult._avg.rating && avgRatingResult._count.rating > 0
      ? avgRatingResult._avg.rating
      : null

    // 3️⃣ Аватар
    const avatarUrl = fullUser.avatarFileId
    ? `/api/files/${fullUser.avatarFileId}`
    : null

    // 4️⃣ Фильтруем достижения по роли пользователя
    // Оставляем только те достижения, которые подходят для роли пользователя
    const filteredBadges = (fullUser.badges || []).filter(userBadge => {
      // Защита от отсутствующих данных
      if (!userBadge || !userBadge.badge) {
        return false
      }
      const badge = userBadge.badge
      // Если у достижения указана роль, она должна совпадать с ролью пользователя
      // Если targetRole = null, достижение для всех ролей
      if (badge.targetRole === null || badge.targetRole === fullUser.role) {
        return true
      }
      // Логируем отфильтрованные достижения
      console.log(`[Profile API] ⚠️ Фильтруем достижение "${badge.name}" (targetRole: ${badge.targetRole}, роль пользователя: ${fullUser.role})`)
      return false
    })
    
    if (fullUser.badges && fullUser.badges.length !== filteredBadges.length) {
      console.log(`[Profile API] 🧹 Отфильтровано ${fullUser.badges.length - filteredBadges.length} неправильных достижений для пользователя ${fullUser.id} (роль: ${fullUser.role})`)
    }

    // 5️⃣ Возвращаем оптимизированный ответ
  return NextResponse.json({
    user: {
      ...fullUser,
      badges: filteredBadges, // Возвращаем отфильтрованные достижения
      avatarUrl,
      avgRating,
        isExecutor: fullUser.role === 'executor',
    },
  })
  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  try {
    const { sanitizeText, validateStringLength, validateEmail } = await import('@/lib/security')
    const { validateFile, normalizeFileName, isValidFileName } = await import('@/lib/fileValidation')

    const contentType = req.headers.get('content-type') || ''
    let dataToUpdate: any = {}

    // === MULTIPART ===
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()

      const fullName = formData.get('fullName') as string
      const role = formData.get('role') as string
      const password = formData.get('password') as string | null
      const description = formData.get('description') as string | null
      const location = formData.get('location') as string | null
      const skills = formData.get('skills') as string | null
      const avatar = formData.get('avatar') as File | null

      if (!fullName || !role) {
        return NextResponse.json(
          { error: 'Имя и роль обязательны' },
          { status: 400 }
        )
      }

      // Валидация и санитизация полей
      const fullNameValidation = validateStringLength(fullName.trim(), 100, 'Имя')
      if (!fullNameValidation.valid) {
        return NextResponse.json(
          { error: fullNameValidation.error },
          { status: 400 }
        )
      }

      if (description) {
        const descValidation = validateStringLength(description.trim(), 1000, 'Описание')
        if (!descValidation.valid) {
          return NextResponse.json(
            { error: descValidation.error },
            { status: 400 }
          )
        }
      }

      if (location) {
        const locationValidation = validateStringLength(location.trim(), 200, 'Местоположение')
        if (!locationValidation.valid) {
          return NextResponse.json(
            { error: locationValidation.error },
            { status: 400 }
          )
        }
      }

      dataToUpdate = {
        fullName: sanitizeText(fullName.trim()),
        role,
        description: description ? sanitizeText(description.trim()) : null,
        location: location ? sanitizeText(location.trim()) : null,
      }

      // Обработка навыков
      if (skills !== null) {
        const parsed = skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        dataToUpdate.skills = parsed.length > 0 ? parsed : []
      }

      // Хэш пароля (если передан)
      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10)
        dataToUpdate.password = hashed
      }

      // Сохранение аватара с валидацией
      if (avatar && avatar.size > 0) {
        // Проверка имени файла
        if (!isValidFileName(avatar.name)) {
          return NextResponse.json(
            { error: 'Недопустимое имя файла аватара' },
            { status: 400 }
          )
        }

        // Валидация файла
        const fileValidation = await validateFile(avatar, true)
        if (!fileValidation.valid) {
          return NextResponse.json(
            { error: fileValidation.error || 'Ошибка валидации файла' },
            { status: 400 }
          )
        }

        const bytes = Buffer.from(await avatar.arrayBuffer())
        const safeFileName = normalizeFileName(avatar.name)
        const mimeType = fileValidation.detectedMimeType || avatar.type

        const savedFile = await prisma.file.create({
          data: {
            id: randomUUID(),
            filename: safeFileName,
            mimetype: mimeType,
            size: avatar.size,
            data: bytes,
          },
        })
        dataToUpdate.avatarFileId = savedFile.id
      }
    }

    // === JSON ===
    else {
      const body = await req.json()
      const { fullName, role, password, description, location, skills } = body

      if (!fullName || !role) {
        return NextResponse.json(
          { error: 'Имя и роль обязательны' },
          { status: 400 }
        )
      }

      // Валидация и санитизация полей
      const fullNameValidation = validateStringLength(fullName.trim(), 100, 'Имя')
      if (!fullNameValidation.valid) {
        return NextResponse.json(
          { error: fullNameValidation.error },
          { status: 400 }
        )
      }

      if (description) {
        const descValidation = validateStringLength(description.trim(), 1000, 'Описание')
        if (!descValidation.valid) {
          return NextResponse.json(
            { error: descValidation.error },
            { status: 400 }
          )
        }
      }

      if (location) {
        const locationValidation = validateStringLength(location.trim(), 200, 'Местоположение')
        if (!locationValidation.valid) {
          return NextResponse.json(
            { error: locationValidation.error },
            { status: 400 }
          )
        }
      }

      dataToUpdate = {
        fullName: sanitizeText(fullName.trim()),
        role,
        description: description ? sanitizeText(description.trim()) : null,
        location: location ? sanitizeText(location.trim()) : null,
      }

      if (skills !== undefined) {
        if (Array.isArray(skills)) {
          dataToUpdate.skills = skills
        } else if (typeof skills === 'string') {
          const parsed = skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          dataToUpdate.skills = parsed.length > 0 ? parsed : []
        } else {
          dataToUpdate.skills = []
        }
      }

      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10)
        dataToUpdate.password = hashed
      }
    }

    // === Обновление пользователя ===
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      include: { avatarFile: true },
    })

    const avatarUrl = updatedUser.avatarFileId
      ? `/api/files/${updatedUser.avatarFileId}`
      : null

    return NextResponse.json({ user: { ...updatedUser, avatarUrl } })
  } catch (err: any) {
    console.error('❌ Ошибка обновления профиля:', err)
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}
