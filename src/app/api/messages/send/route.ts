import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/', 'application/pdf', 'application/zip']

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') || ''
  let recipientId: string | undefined
  let content = ''

  let fileId: string | null = null
  let fileName: string | null = null
  let mimeType: string | null = null
  let size: number | null = null

  // multipart/form-data
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    recipientId = form.get('recipientId')?.toString()
    content = form.get('content')?.toString() || ''

    const blob = form.get('file') as File | null
    if (blob && blob.size > 0) {
      if (blob.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Файл слишком большой (до 10MB)' }, { status: 413 })
      }
      const okType = ALLOWED.some((p) => blob.type?.startsWith(p))
      if (!okType) {
        return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 415 })
      }

      const arrayBuf = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)

      // создаём запись в File
      const file = await prisma.file.create({
        data: {
          name: (blob as any).name || 'file',
          mimeType: blob.type,
          size: blob.size,
          data: buffer, // если у тебя поле Binary в БД
        },
      })

      fileId = file.id
      fileName = file.name
      mimeType = file.mimeType
      size = file.size
    }
  }
  // application/json
  else if (ct.includes('application/json')) {
    const body = await req.json().catch(() => null)
    recipientId = body?.recipientId
    content = body?.content ?? ''
  } else {
    const body = await req.json().catch(() => null)
    if (body) {
      recipientId = body.recipientId
      content = body.content ?? ''
    } else {
      return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 })
    }
  }

  if (!recipientId) {
    return NextResponse.json({ error: 'recipientId обязателен' }, { status: 400 })
  }

  const msg = await prisma.privateMessage.create({
    data: {
      senderId: me.id,
      recipientId,
      content,
      fileId,
      fileName,
      mimeType,
      size,
    },
  })

  return NextResponse.json(msg)
}
