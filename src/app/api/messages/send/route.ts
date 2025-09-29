import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { promises as fsp } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'

export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/', 'application/pdf', 'application/zip']

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const ct = req.headers.get('content-type') || ''
  let recipientId: string | undefined
  let content = ''

  let fileUrl: string | null = null
  let fileName: string | null = null
  let mimeType: string | null = null
  let size: number | null = null

  // берём базовый URL из переменной или заголовка origin
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    req.headers.get('origin') ||
    ''

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
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'pm')
      await fsp.mkdir(uploadsDir, { recursive: true })

      const originalName = (blob as any).name || 'file'
      const ext = path.extname(originalName)
      const outName = `${randomUUID()}${ext || ''}`
      const outPath = path.join(uploadsDir, outName)
      await fsp.writeFile(outPath, buffer)

      // сохраняем абсолютный путь
      fileUrl = `${baseUrl}/uploads/pm/${outName}`
      fileName = originalName
      mimeType = blob.type || null
      size = blob.size || null
    }
  }
  // application/json
  else if (ct.includes('application/json')) {
    const body = await req.json().catch(() => null)
    recipientId = body?.recipientId
    content = body?.content ?? ''
  }
  // мягкий JSON fallback
  else {
    const body = await req.json().catch(() => null)
    if (body) {
      recipientId = body.recipientId
      content = body.content ?? ''
    } else {
      return NextResponse.json({ error: 'Unsupported body or invalid format' }, { status: 400 })
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
      fileUrl,
      fileName,
      mimeType,
      size,
    },
  })

  return NextResponse.json(msg)
}
