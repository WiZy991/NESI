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

function buildDefaultSettings(userId: string) {
  return {
    userId,
    emailNotifications: true,
    pushNotifications: true,
    notifyOnMessages: true,
    notifyOnTasks: true,
    notifyOnReviews: true,
    notifyOnWarnings: true,
    notifySound: true,
    notifyDesktop: true,
    showOnlineStatus: true,
    hideEmail: false,
  }
}

// === GET ===
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const defaults = buildDefaultSettings(userId)

    try {
      let settings = await prisma.userSettings.findUnique({ where: { userId } })
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: defaults,
        })
      }

      const normalized = {
        ...defaults,
        ...settings,
      }

      return NextResponse.json(normalized)
    } catch (dbError: any) {
      console.warn('⚠️ Не удалось получить настройки из БД, возвращаем значения по умолчанию', dbError)
      return NextResponse.json({
        ...defaults,
        warning: 'Настройки по умолчанию. Требуется обновить БД',
      })
    }
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
    if (typeof body.notifyOnMessages === 'boolean')
      updateData.notifyOnMessages = body.notifyOnMessages
    if (typeof body.notifyOnTasks === 'boolean')
      updateData.notifyOnTasks = body.notifyOnTasks
    if (typeof body.notifyOnReviews === 'boolean')
      updateData.notifyOnReviews = body.notifyOnReviews
    if (typeof body.notifyOnWarnings === 'boolean')
      updateData.notifyOnWarnings = body.notifyOnWarnings
    if (typeof body.notifySound === 'boolean')
      updateData.notifySound = body.notifySound
    if (typeof body.notifyDesktop === 'boolean')
      updateData.notifyDesktop = body.notifyDesktop

    const defaults = buildDefaultSettings(userId)

    try {
      const updated = await prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: { ...defaults, ...updateData },
      })

      const normalized = {
        ...defaults,
        ...updated,
      }

      return NextResponse.json(normalized)
    } catch (dbError: any) {
      console.warn('⚠️ Не удалось сохранить настройки в БД, возвращаем значения по умолчанию', dbError)
      return NextResponse.json({
        ...defaults,
        ...updateData,
        warning: 'Настройки не сохранены: требуется обновить БД',
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error)
    return NextResponse.json({ error: 'Ошибка при сохранении настроек' }, { status: 500 })
  }
}
