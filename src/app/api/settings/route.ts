import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJwt } from '@/lib/jwt'

// Функция получения ID пользователя из JWT
async function getUserId(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.split(' ')[1]
    const payload = await verifyJwt(token)
    return payload?.id || null
  } catch {
    return null
  }
}

// Получение настроек пользователя
export async function GET(req: Request) {
  try {
    const userId = await getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
    }

    let settings = await prisma.userSettings.findUnique({ where: { userId } })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          emailNotifications: true,
          pushNotifications: false,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке настроек' }, { status: 500 })
  }
}

// Обновление настроек пользователя
export async function POST(req: Request) {
  try {
    const userId = await getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, boolean> = {}

    if (typeof body.emailNotifications === 'boolean') {
      updateData.emailNotifications = body.emailNotifications
    }
    if (typeof body.pushNotifications === 'boolean') {
      updateData.pushNotifications = body.pushNotifications
    }

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
