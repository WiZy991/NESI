// src/app/api/tasks/[id]/messages/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/tasks/[id]/messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params

  const messages = await prisma.message.findMany({
    where: { taskId },
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
      file: { select: { id: true, filename: true, mimetype: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // приводим к единому формату
  const result = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    sender: m.sender,
    fileId: m.file?.id || null,
    fileName: m.file?.filename || null,
    fileMimetype: m.file?.mimetype || null,
  }))

  return NextResponse.json({ messages: result })
}

// POST /api/tasks/[id]/messages
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { id: taskId } = await params
  const formData = await req.formData()

  const content = formData.get('content')?.toString() || ''
  const file = formData.get('file') as File | null

  let savedFile = null
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer())

    savedFile = await prisma.file.create({
      data: {
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        data: buffer,
      },
    })
  }

  const message = await prisma.message.create({
    data: {
      content,
      taskId,
      senderId: user.id,
      fileId: savedFile ? savedFile.id : null,
    },
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
      file: { select: { id: true, filename: true, mimetype: true } },
    },
  })

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender,
      fileId: message.file?.id || null,
      fileName: message.file?.filename || null,
      fileMimetype: message.file?.mimetype || null,
    },
  })
}
