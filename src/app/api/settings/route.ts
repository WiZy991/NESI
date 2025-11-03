import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return null
    const payload = verifyJWT(token)
    if (!payload || typeof payload !== 'object') return null
    return (payload as any).userId
  } catch {
    return null
  }
}

// === GET ===
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    let settings = await prisma.userSettings.findUnique({ where: { userId } })
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId, emailNotifications: true, pushNotifications: false },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке настроек' }, { status: 500 })
  }
}

// === POST ===
export async function POST(req: Request) {
  try {
    const userId = await getUserId()
    if (!userId)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const body = await req.json()
    const updateData: Record<string, boolean> = {}

    if (typeof body.emailNotifications === 'boolean')
      updateData.emailNotifications = body.emailNotifications
    if (typeof body.pushNotifications === 'boolean')
      updateData.pushNotifications = body.pushNotifications

    const updated = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error)
    return NextResponse.json({ error: 'Ошибка при сохранении настроек' }, { status: 500 })
  }
}
