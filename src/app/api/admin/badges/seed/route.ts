import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

const defaultBadges = [
  {
    id: 'first-task',
    name: 'Первая задача',
    description: 'Выполнил свою первую задачу',
    icon: '🎯',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 })
  },
  {
    id: 'task-master-5',
    name: 'Мастер задач',
    description: 'Выполнил 5 задач',
    icon: '⭐',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 })
  },
  {
    id: 'task-master-10',
    name: 'Профи',
    description: 'Выполнил 10 задач',
    icon: '🏆',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 })
  },
  {
    id: 'task-master-25',
    name: 'Эксперт',
    description: 'Выполнил 25 задач',
    icon: '👑',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 })
  },
  {
    id: 'task-master-50',
    name: 'Легенда',
    description: 'Выполнил 50 задач',
    icon: '💎',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 50 })
  },
  {
    id: 'first-test',
    name: 'Первый тест',
    description: 'Пройдил первый сертификационный тест',
    icon: '📝',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 1 })
  },
  {
    id: 'test-master-5',
    name: 'Знаток',
    description: 'Пройдил 5 сертификационных тестов',
    icon: '📚',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 5 })
  },
  {
    id: 'high-rating',
    name: 'Звёздный',
    description: 'Средний рейтинг 4.5 или выше',
    icon: '⭐',
    condition: JSON.stringify({ type: 'avgRating', operator: 'gte', value: 4.5 })
  },
  {
    id: 'positive-reviews-10',
    name: 'Любимчик',
    description: 'Получил 10 положительных отзывов (4+ звезды)',
    icon: '❤️',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 10 })
  },
  {
    id: 'xp-100',
    name: 'Опытный',
    description: 'Набрал 100 XP',
    icon: '🔥',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 100 })
  },
  {
    id: 'xp-500',
    name: 'Ветеран',
    description: 'Набрал 500 XP',
    icon: '⚡',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 500 })
  },
  {
    id: 'xp-1000',
    name: 'Мастер',
    description: 'Набрал 1000 XP',
    icon: '🌟',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 1000 })
  },
  {
    id: 'level-5',
    name: 'Продвинутый',
    description: 'Достиг 5 уровня',
    icon: '🚀',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 5 })
  },
  {
    id: 'level-10',
    name: 'Элитный',
    description: 'Достиг 10 уровня',
    icon: '💫',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 10 })
  }
]

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const createdBadges = []
    const updatedBadges = []

    for (const badge of defaultBadges) {
      const existing = await prisma.badge.findUnique({
        where: { id: badge.id }
      })

      if (existing) {
        await prisma.badge.update({
          where: { id: badge.id },
          data: {
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            condition: badge.condition
          }
        })
        updatedBadges.push(badge.name)
      } else {
        await prisma.badge.create({
          data: badge
        })
        createdBadges.push(badge.name)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Бейджи инициализированы',
      created: createdBadges.length,
      updated: updatedBadges.length,
      badges: {
        created: createdBadges,
        updated: updatedBadges
      }
    })
  } catch (error) {
    console.error('[Badges Seed] Ошибка:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

