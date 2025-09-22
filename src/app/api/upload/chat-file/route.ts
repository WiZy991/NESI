import { writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif']

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (макс 10МБ)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = `${randomUUID()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat')

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const url = `/uploads/chat/${fileName}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('❌ Ошибка загрузки файла:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
