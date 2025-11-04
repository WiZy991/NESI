import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

const defaultBadges = [
  // Задачи - прогрессия от новичка до легенды
  {
    id: 'first-task',
    name: 'Первый шаг',
    description: '🌟 Начало легендарного пути. Выполнил свою первую задачу и вступил в ряды профессионалов!',
    icon: '🌱',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 })
  },
  {
    id: 'task-master-5',
    name: 'Исполнитель',
    description: '⚔️ Ты доказал, что можешь больше! 5 задач покорены. Путь к мастерству продолжается.',
    icon: '⚔️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 })
  },
  {
    id: 'task-master-10',
    name: 'Ветеран поля боя',
    description: '🛡️ 10 задач позади! Тебя знают как надежного воина. Репутация растет, а опыт крепнет.',
    icon: '🛡️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 })
  },
  {
    id: 'task-master-25',
    name: 'Мастер своего дела',
    description: '👑 25 побед! Ты достиг уровня эксперта. Твои навыки отточены, а имя гремит по всей платформе.',
    icon: '👑',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 })
  },
  {
    id: 'task-master-50',
    name: 'Легенда платформы',
    description: '💎 50 задач! Ты вошел в историю. О тебе слагают легенды, а новички мечтают достичь твоего уровня.',
    icon: '💎',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 50 })
  },
  // Тесты - путь знания
  {
    id: 'first-test',
    name: 'Ученик мудрости',
    description: '📜 Первый тест пройден! Знания открывают новые горизонты. Путь к сертификации начат.',
    icon: '📜',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 1 })
  },
  {
    id: 'test-master-5',
    name: 'Хранитель знаний',
    description: '🎓 5 сертификаций! Ты стал настоящим эрудитом. Твоя экспертиза признана во всех областях.',
    icon: '🎓',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 5 })
  },
  // Рейтинги и отзывы
  {
    id: 'high-rating',
    name: 'Звёздный профи',
    description: '⭐ Твой рейтинг сияет как звезда! 4.5+ - это признак истинного мастера. Клиенты тебе доверяют.',
    icon: '⭐',
    condition: JSON.stringify({ type: 'avgRating', operator: 'gte', value: 4.5 })
  },
  {
    id: 'positive-reviews-10',
    name: 'Любимец клиентов',
    description: '💝 10 восторженных отзывов! Твоя работа радует сердца. Ты создаешь не просто проекты, а эмоции.',
    icon: '💝',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 10 })
  },
  // XP - путешествие опыта
  {
    id: 'xp-100',
    name: 'Странник опыта',
    description: '🔥 100 XP накоплено! Ты набрал первые боевые очки. Путешествие в мир профессионализма только начинается.',
    icon: '🔥',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 100 })
  },
  {
    id: 'xp-500',
    name: 'Ветеран битв',
    description: '⚡ 500 XP! Ты прошел через множество испытаний. Опыт сделал тебя сильнее, умнее и увереннее.',
    icon: '⚡',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 500 })
  },
  {
    id: 'xp-1000',
    name: 'Мастер всех времён',
    description: '🌟 1000 XP набрано! Ты достиг вершин мастерства. Твои достижения вдохновляют целое поколение.',
    icon: '🌟',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 1000 })
  },
  // Уровни - эволюция
  {
    id: 'level-5',
    name: 'Возвышенный',
    description: '🚀 5 уровень покорен! Ты поднялся на новую высоту. Мир видит в тебе настоящего профессионала.',
    icon: '🚀',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 5 })
  },
  {
    id: 'level-10',
    name: 'Божественный',
    description: '💫 10 уровень достигнут! Ты достиг божественных высот мастерства. Твои способности выходят за пределы обычного.',
    icon: '💫',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 10 })
  },
  // Дополнительные игровые бейджи
  {
    id: 'rapid-fire',
    name: 'Быстрый удар',
    description: '🎯 Выполнил 3 задачи за короткое время! Скорость и качество - твои союзники.',
    icon: '🎯',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 3 })
  },
  {
    id: 'perfectionist',
    name: 'Перфекционист',
    description: '✨ Получил 20+ отзывов с максимальной оценкой! Твоя работа - это произведение искусства.',
    icon: '✨',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 20 })
  },
  {
    id: 'knowledge-seeker',
    name: 'Искатель знаний',
    description: '📚 Прошел 10+ сертификаций! Твоя жажда знаний неутолима. Ты истинный гурман обучения.',
    icon: '📚',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 10 })
  },
  {
    id: 'xp-master-2000',
    name: 'Великий мастер',
    description: '🏆 2000 XP! Ты достиг уровня великих мастеров. Твои достижения записаны в анналах истории.',
    icon: '🏆',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 2000 })
  },
  {
    id: 'task-hunter-100',
    name: 'Охотник за заданиями',
    description: '🗡️ 100 задач выполнено! Ты настоящий охотник за проектами. Ни одна задача не ускользнет от тебя.',
    icon: '🗡️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 100 })
  },
  {
    id: 'social-butterfly',
    name: 'Социальная бабочка',
    description: '🦋 Получил 50+ положительных отзывов! Ты мастер общения и работы с людьми. Все тебя любят!',
    icon: '🦋',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 50 })
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

