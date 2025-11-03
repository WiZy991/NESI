import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { validateFile } from '@/lib/fileValidation'
import { getUserFromRequest } from '@/lib/auth'
import { normalizeFileName, isValidFileName } from '@/lib/security'

export async function POST(req: Request) {
  try {
    // Проверка авторизации
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Защита от path traversal
    if (!isValidFileName(file.name)) {
      return NextResponse.json(
        { error: 'Недопустимое имя файла' },
        { status: 400 }
      )
    }

    // Нормализация имени файла
    const safeFileName = normalizeFileName(file.name)

    // Полная валидация файла (magic bytes, размер, тип)
    const validation = await validateFile(file, true)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Используем определенный MIME тип из сигнатуры
    const mimeType = validation.detectedMimeType || file.type

    const savedFile = await prisma.file.create({
      data: {
        id: randomUUID(),
        filename: safeFileName,
        mimetype: mimeType,
        size: file.size,
        data: buffer,
      },
    })

    return NextResponse.json({
      id: savedFile.id,
      name: savedFile.filename,
      mimetype: savedFile.mimetype,
      size: savedFile.size,
      url: `/api/files/${savedFile.id}`,
    })
  } catch (err) {
    console.error('❌ Ошибка загрузки файла:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
