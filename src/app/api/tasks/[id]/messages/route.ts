// src/app/api/tasks/[id]/messages/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// GET /api/tasks/[id]/messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params

  const messages = await prisma.message.findMany({
    where: { taskId },
    include: { sender: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}

// POST /api/tasks/[id]/messages
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: taskId } = await params

  const formData = await req.formData()
  const content = formData.get('content')?.toString() || ''
  const file = formData.get('file') as File | null

  let fileUrl: string | null = null

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
    const fileName = `${uuidv4()}${ext ? `.${ext}` : ''}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'messages')

    // создаём директорию, если её ещё нет
    await mkdir(uploadDir, { recursive: true })

    const uploadPath = path.join(uploadDir, fileName)
    await writeFile(uploadPath, buffer)

    fileUrl = `/uploads/messages/${fileName}`
  }

  const message = await prisma.message.create({
    data: {
      content,
      taskId,
      senderId: user.id,
      fileUrl,
    },
    include: { sender: true },
  })

  return NextResponse.json({ message })
}
