import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import fs from 'fs'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      reviewsReceived: {
        include: {
          fromUser: true,
          task: true,
        },
      },
    },
  })

  return NextResponse.json({ user: fullUser })
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  try {
    const contentType = req.headers.get('content-type') || ''
    let dataToUpdate: any = {}

    if (contentType.includes('multipart/form-data')) {
      // === multipart/form-data ===
      const formData = await req.formData()

      const fullName = formData.get('fullName') as string
      const role = formData.get('role') as string
      const password = formData.get('password') as string | null
      const description = formData.get('description') as string | null
      const location = formData.get('location') as string | null
      const skills = formData.get('skills') as string | null
      const avatar = formData.get('avatar') as File | null

      if (!fullName || !role) {
        return NextResponse.json({ error: 'Имя и роль обязательны' }, { status: 400 })
      }

      dataToUpdate = { fullName, role, description, location }

      if (skills) {
        dataToUpdate.skills = skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }

      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10)
        dataToUpdate.password = hashed
      }

      if (avatar) {
        const bytes = Buffer.from(await avatar.arrayBuffer())

        // создаём папку public/uploads если её нет
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')
        if (!fs.existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }

        const fileName = `${user.id}-${Date.now()}-${avatar.name}`
        const filePath = path.join(uploadDir, fileName)

        await writeFile(filePath, bytes)

        // путь для <img src="...">
        dataToUpdate.avatarUrl = `/uploads/${fileName}`
      }
    } else {
      // === JSON ===
      const body = await req.json()
      const { fullName, role, password, description, avatarUrl, location, skills } = body

      if (!fullName || !role) {
        return NextResponse.json({ error: 'Имя и роль обязательны' }, { status: 400 })
      }

      dataToUpdate = { fullName, role, description, avatarUrl, location }

      if (skills) {
        dataToUpdate.skills = Array.isArray(skills)
          ? skills
          : (skills as string).split(',').map((s) => s.trim()).filter(Boolean)
      }

      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10)
        dataToUpdate.password = hashed
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    })

    return NextResponse.json({ user: updatedUser })
  } catch (err: any) {
    console.error('❌ Ошибка обновления профиля:', err)
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}
