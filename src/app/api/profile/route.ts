import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  // 1️⃣ Определяем роль пользователя
  const baseUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  })

  if (!baseUser)
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  // 2️⃣ Общие поля (для всех)
  const includeBase = {
    avatarFile: true,
    reviewsReceived: {
      include: { fromUser: true, task: true },
    },
  }

  // 3️⃣ Дополнительные данные только для исполнителя
  const includeExecutor = {
    ...includeBase,
    level: true,
    badges: {
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    },
    certifications: {
      include: { subcategory: true },
      orderBy: { grantedAt: 'desc' },
    },
    executedTasks: {
      where: { status: 'completed' },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        review: true,
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
  }

  // 4️⃣ Выбор полей по роли
  const include = baseUser.role === 'executor' ? includeExecutor : includeBase

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include,
  })

  if (!fullUser)
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  // 5️⃣ Средний рейтинг
  const reviews = await prisma.review.findMany({
    where: { toUserId: user.id },
    select: { rating: true },
  })

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  // 6️⃣ Аватар
  const avatarUrl = fullUser?.avatarFileId
    ? `/api/files/${fullUser.avatarFileId}`
    : null

  // 7️⃣ Возвращаем итоговый ответ
  return NextResponse.json({
    user: {
      ...fullUser,
      avatarUrl,
      avgRating,
      isExecutor: baseUser.role === 'executor',
    },
  })
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  try {
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

      dataToUpdate = { fullName, role, description, location }

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

      // Сохранение аватара
      if (avatar && avatar.size > 0) {
        const bytes = Buffer.from(await avatar.arrayBuffer())
        const savedFile = await prisma.file.create({
          data: {
            id: randomUUID(),
            filename: avatar.name,
            mimetype: avatar.type,
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

      dataToUpdate = { fullName, role, description, location }

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
