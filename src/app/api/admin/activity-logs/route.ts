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

    // Проверяем, существует ли таблица ActivityLog (обратно совместимо)
    try {
      const logs = await prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              blocked: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      
      // Статистика по IP
      const ipStats = await prisma.activityLog.groupBy({
        by: ['ipAddress'],
        _count: { ipAddress: true },
        where: {
          ipAddress: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // За последние 7 дней
          },
        },
        orderBy: {
          _count: { ipAddress: 'desc' },
        },
        take: 10,
      })

      return NextResponse.json({
        logs,
        ipStats,
        total: logs.length,
      })
    } catch (dbError) {
      // Если таблица ActivityLog не существует - возвращаем пустые данные
      console.warn('⚠️ ActivityLog таблица не найдена (миграция не применена)')
      return NextResponse.json({
        logs: [],
        ipStats: [],
        total: 0,
        warning: 'ActivityLog таблица не создана. Примените миграцию для использования anti-fraud функций.',
      })
    }
  } catch (error) {
    console.error('❌ Ошибка получения логов:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

