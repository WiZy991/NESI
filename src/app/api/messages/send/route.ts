import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PREFIXES = ['image/', 'application/pdf', 'application/zip'];

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const ct = req.headers.get('content-type') || ''
    let recipientId: string | undefined
    let content = ''

    // то, что пойдёт в PrivateMessage
    let fileUrl: string | null = null
    let fileName: string | null = null
    let mimeType: string | null = null
    let size: number | null = null

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      recipientId = form.get('recipientId')?.toString()
      content = form.get('content')?.toString() || ''

      const blob = form.get('file') as File | null
      if (blob && blob.size > 0) {
        // валидации
        if (blob.size > MAX_SIZE) {
          return NextResponse.json({ error: 'Файл слишком большой (до 10MB)' }, { status: 413 })
        }
        const allowed = ALLOWED_PREFIXES.some(p => (blob.type || '').startsWith(p))
        if (!allowed) {
          return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 415 })
        }

        // читаем бинарь
        const buf = Buffer.from(await blob.arrayBuffer())

        // сохраняем в таблицу File (важно: поля name/mimeType/size/data)
        const created = await prisma.file.create({
          data: {
            name: (blob as any).name || 'file',
            mimeType: blob.type || 'application/octet-stream',
            size: buf.length,
            data: buf
          }
        })

        fileUrl = `/api/files/${created.id}`
        fileName = created.name
        mimeType = created.mimeType
        size = created.size
      }
    } else if (ct.includes('application/json')) {
      const body = await req.json().catch(() => null)
      recipientId = body?.recipientId
      content = body?.content ?? ''
    } else {
      // мягкий JSON fallback
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
        size
      }
    })

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    console.error('🔥 Ошибка отправки сообщения:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
