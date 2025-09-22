import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const subcategoryId = searchParams.get('subcategoryId')
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId обязателен' }, { status: 400 })

    const cert = await prisma.userCertification.findUnique({
      where: {
        userId_subcategoryId: { userId: user.id, subcategoryId }
      }
    })

    return NextResponse.json({ certified: !!cert })
  } catch (e) {
    console.error('GET /api/cert/status error:', e)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
