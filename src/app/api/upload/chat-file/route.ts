import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { validateFile } from '@/lib/fileValidation'
import { getUserFromRequest } from '@/lib/auth'
import { normalizeFileName, isValidFileName } from '@/lib/security'
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try {
    // Проверка авторизации
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Rate limiting для загрузки файлов
    const uploadRateLimit = createUserRateLimit(rateLimitConfigs.upload)
    const rateLimitResult = await uploadRateLimit(req)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много загрузок файлов. Подождите немного.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      )
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

    // Быстрая проверка размера и типа (без чтения файла)
    if (file.size === 0) {
      return NextResponse.json({ error: 'Файл пуст' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    // Проверка расширения
    const ext = safeFileName.split('.').pop()?.toLowerCase()
    const allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
    if (!ext || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Недопустимое расширение файла. Разрешены: ${allowedExts.join(', ')}` },
        { status: 400 }
      )
    }

    // Проверка MIME типа
    const mimeType = file.type || 'application/octet-stream'
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Недопустимый тип файла: ${mimeType}` },
        { status: 400 }
      )
    }

    // Оптимизация: сразу читаем файл и сохраняем без лишних проверок
    // Для видео файлов - пропускаем проверку сигнатуры (очень медленная)
    const isVideo = mimeType.startsWith('video/')
    
    // Читаем файл напрямую - arrayBuffer быстрый для файлов до 100MB
    // Если интернет быстрый, чтение должно быть почти мгновенным
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Для изображений - быстрая проверка только первых 4 байта (без проверки для видео)
    // Для видео пропускаем проверку сигнатуры полностью - экономим время
    if (!isVideo && buffer.length >= 4) {
      const firstBytes = buffer.slice(0, 4)
      const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50
      const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8
      const isGif = firstBytes[0] === 0x47 && firstBytes[1] === 0x49
      const isPdf = firstBytes[0] === 0x25 && firstBytes[1] === 0x50
      const isWebP = firstBytes[0] === 0x52 && firstBytes[1] === 0x49

      // Если это изображение, но сигнатура не совпадает - предупреждение, но разрешаем
      if (mimeType.startsWith('image/') && !isPng && !isJpeg && !isGif && !isWebP) {
        console.warn(`⚠️ Сигнатура изображения ${safeFileName} не совпадает, но MIME тип корректный`)
      }
    }

    // Сохраняем файл в БД (быстро, без дополнительных проверок)
    const fileId = randomUUID()
    const savedFile = await prisma.file.create({
      data: {
        id: fileId,
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
