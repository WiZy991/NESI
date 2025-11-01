import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * POST /api/upload/portfolio
 * Загрузить изображение для портфолио
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Разрешены: JPG, PNG, GIF, WEBP' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимум 5MB' },
        { status: 400 }
      )
    }

    // Создаём директорию если её нет
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'portfolio')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${decoded.userId}_${timestamp}_${randomString}.${extension}`

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Возвращаем URL
    const fileUrl = `/uploads/portfolio/${filename}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
    })
  } catch (err) {
    console.error('❌ Ошибка загрузки файла:', err)
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}

