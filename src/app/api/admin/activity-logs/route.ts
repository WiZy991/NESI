import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const admin = await getUserFromRequest(req)
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (action) {
      where.action = action
    }

    // Таблица ActivityLog не создана - возвращаем пустые данные
    return NextResponse.json({
      logs: [],
      ipStats: [],
      total: 0,
      message: 'Anti-fraud мониторинг отключен. Таблица ActivityLog не создана.',
    })
  } catch (error) {
    console.error('❌ Ошибка получения логов:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

