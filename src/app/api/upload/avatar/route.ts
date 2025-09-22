import { writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Некорректный файл' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const extension = file.name.split('.').pop()
    const fileName = `${randomUUID()}.${extension}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')

    // Создать папку если не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const url = `/uploads/avatars/${fileName}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Ошибка загрузки файла:', err)
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 })
  }
}
