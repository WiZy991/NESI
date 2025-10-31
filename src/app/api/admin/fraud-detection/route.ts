import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { detectCircularDeals } from '@/lib/antifraud'

export async function GET(req: NextRequest) {
  try {
    const admin = await getUserFromRequest(req)
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // Получаем всех пользователей, которые выполнили хотя бы одну задачу
    const users = await prisma.user.findMany({
      where: {
        executedTasks: {
          some: {
            status: 'completed',
          },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    })

    // Проверяем круговые сделки между пользователями
    const suspiciousPairs: any[] = []
    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const userA = users[i]
        const userB = users[j]
        
        const result = await detectCircularDeals(userA.id, userB.id)
        
        if (result.suspicious) {
          suspiciousPairs.push({
            userA: {
              id: userA.id,
              email: userA.email,
              fullName: userA.fullName,
            },
            userB: {
              id: userB.id,
              email: userB.email,
              fullName: userB.fullName,
            },
            mutualTasksCount: result.count,
            tasks: result.tasks,
          })
        }
      }
    }
    
    // Сортируем по количеству взаимных задач
    suspiciousPairs.sort((a, b) => b.mutualTasksCount - a.mutualTasksCount)

    // Получаем статистику
    const stats = {
      totalUsers: users.length,
      suspiciousPairs: suspiciousPairs.length,
      totalCheckedPairs: (users.length * (users.length - 1)) / 2,
    }

    return NextResponse.json({
      suspiciousPairs,
      stats,
    })
  } catch (error) {
    console.error('❌ Ошибка детекции мошенничества:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

