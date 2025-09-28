import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif']
const MAX_SIZE_MB = 10

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Файл слишком большой (макс ${MAX_SIZE_MB}MB)` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const savedFile = await prisma.file.create({
      data: {
        id: randomUUID(),
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        data: buffer,
      },
    })

    return NextResponse.json({
      id: savedFile.id,
      name: savedFile.filename,
      mimetype: savedFile.mimetype,
      size: savedFile.size,
      url: `/api/files/${savedFile.id}`, // 👈 вернём готовую ссылку
    })
  } catch (err) {
    console.error('❌ Ошибка загрузки файла:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
