import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

const defaultBadges = [
  // Достижения для исполнителей - задачи - прогрессия от новичка до легенды
  {
    id: 'first-task',
    name: 'Первый шаг',
    description: '🌟 Начало легендарного пути. Выполнил свою первую задачу и вступил в ряды профессионалов!',
    icon: '🌱',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 }),
    targetRole: 'executor'
  },
  {
    id: 'task-master-5',
    name: 'Исполнитель',
    description: '⚔️ Ты доказал, что можешь больше! 5 задач покорены. Путь к мастерству продолжается.',
    icon: '⚔️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 }),
    targetRole: 'executor'
  },
  {
    id: 'task-master-10',
    name: 'Ветеран поля боя',
    description: '🛡️ 10 задач позади! Тебя знают как надежного воина. Репутация растет, а опыт крепнет.',
    icon: '🛡️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 }),
    targetRole: 'executor'
  },
  {
    id: 'task-master-25',
    name: 'Мастер своего дела',
    description: '👑 25 побед! Ты достиг уровня эксперта. Твои навыки отточены, а имя гремит по всей платформе.',
    icon: '👑',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 }),
    targetRole: 'executor'
  },
  {
    id: 'task-master-50',
    name: 'Легенда платформы',
    description: '💎 50 задач! Ты вошел в историю. О тебе слагают легенды, а новички мечтают достичь твоего уровня.',
    icon: '💎',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 50 }),
    targetRole: 'executor'
  },
  // Тесты - путь знания (только для исполнителей)
  {
    id: 'first-test',
    name: 'Ученик мудрости',
    description: '📜 Первый тест пройден! Знания открывают новые горизонты. Путь к сертификации начат.',
    icon: '📜',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 1 }),
    targetRole: 'executor'
  },
  {
    id: 'test-master-5',
    name: 'Хранитель знаний',
    description: '🎓 5 сертификаций! Ты стал настоящим эрудитом. Твоя экспертиза признана во всех областях.',
    icon: '🎓',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 5 }),
    targetRole: 'executor'
  },
  // Рейтинги и отзывы (только для исполнителей)
  {
    id: 'high-rating',
    name: 'Звёздный профи',
    description: '⭐ Твой рейтинг сияет как звезда! 4.5+ - это признак истинного мастера. Клиенты тебе доверяют.',
    icon: '⭐',
    condition: JSON.stringify({ type: 'avgRating', operator: 'gte', value: 4.5 }),
    targetRole: 'executor'
  },
  {
    id: 'positive-reviews-10',
    name: 'Любимец клиентов',
    description: '💝 10 восторженных отзывов! Твоя работа радует сердца. Ты создаешь не просто проекты, а эмоции.',
    icon: '💝',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 10 }),
    targetRole: 'executor'
  },
  // XP - путешествие опыта (только для исполнителей)
  {
    id: 'xp-100',
    name: 'Странник опыта',
    description: '🔥 100 XP накоплено! Ты набрал первые боевые очки. Путешествие в мир профессионализма только начинается.',
    icon: '🔥',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 100 }),
    targetRole: 'executor'
  },
  {
    id: 'xp-500',
    name: 'Ветеран битв',
    description: '⚡ 500 XP! Ты прошел через множество испытаний. Опыт сделал тебя сильнее, умнее и увереннее.',
    icon: '⚡',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 500 }),
    targetRole: 'executor'
  },
  {
    id: 'xp-1000',
    name: 'Мастер всех времён',
    description: '🌟 1000 XP набрано! Ты достиг вершин мастерства. Твои достижения вдохновляют целое поколение.',
    icon: '🌟',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 1000 }),
    targetRole: 'executor'
  },
  // Уровни - эволюция (только для исполнителей)
  {
    id: 'level-5',
    name: 'Возвышенный',
    description: '🚀 5 уровень покорен! Ты поднялся на новую высоту. Мир видит в тебе настоящего профессионала.',
    icon: '🚀',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 5 }),
    targetRole: 'executor'
  },
  {
    id: 'level-10',
    name: 'Божественный',
    description: '💫 10 уровень достигнут! Ты достиг божественных высот мастерства. Твои способности выходят за пределы обычного.',
    icon: '💫',
    condition: JSON.stringify({ type: 'level', operator: 'gte', value: 10 }),
    targetRole: 'executor'
  },
  // Дополнительные игровые бейджи (только для исполнителей)
  {
    id: 'rapid-fire',
    name: 'Быстрый удар',
    description: '🎯 Выполнил 3 задачи за короткое время! Скорость и качество - твои союзники.',
    icon: '🎯',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 3 }),
    targetRole: 'executor'
  },
  {
    id: 'perfectionist',
    name: 'Перфекционист',
    description: '✨ Получил 20+ отзывов с максимальной оценкой! Твоя работа - это произведение искусства.',
    icon: '✨',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 20 }),
    targetRole: 'executor'
  },
  {
    id: 'knowledge-seeker',
    name: 'Искатель знаний',
    description: '📚 Прошел 10+ сертификаций! Твоя жажда знаний неутолима. Ты истинный гурман обучения.',
    icon: '📚',
    condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 10 }),
    targetRole: 'executor'
  },
  {
    id: 'xp-master-2000',
    name: 'Великий мастер',
    description: '🏆 2000 XP! Ты достиг уровня великих мастеров. Твои достижения записаны в анналах истории.',
    icon: '🏆',
    condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 2000 }),
    targetRole: 'executor'
  },
  {
    id: 'task-hunter-100',
    name: 'Охотник за заданиями',
    description: '🗡️ 100 задач выполнено! Ты настоящий охотник за проектами. Ни одна задача не ускользнет от тебя.',
    icon: '🗡️',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 100 }),
    targetRole: 'executor'
  },
  {
    id: 'social-butterfly',
    name: 'Социальная бабочка',
    description: '🦋 Получил 50+ положительных отзывов! Ты мастер общения и работы с людьми. Все тебя любят!',
    icon: '🦋',
    condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 50 }),
    targetRole: 'executor'
  },
  // ========== ДОСТИЖЕНИЯ ДЛЯ ЗАКАЗЧИКОВ ==========
  {
    id: 'customer-first-task',
    name: 'Первый заказ',
    description: '📦 Создал свою первую задачу! Начало плодотворного сотрудничества с исполнителями.',
    icon: '📦',
    condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 1 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-active-5',
    name: 'Активный заказчик',
    description: '💼 Создал 5 задач! Ты активно используешь платформу для решения своих задач.',
    icon: '💼',
    condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 5 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-active-10',
    name: 'Опытный заказчик',
    description: '🎯 Создал 10 задач! Ты знаешь, как эффективно работать с исполнителями.',
    icon: '🎯',
    condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 10 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-active-25',
    name: 'Ветеран заказов',
    description: '🏆 Создал 25 задач! Ты опытный заказчик, который знает цену качественной работы.',
    icon: '🏆',
    condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 25 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-completed-1',
    name: 'Первая победа',
    description: '✅ Завершил первую задачу! Твой проект успешно выполнен исполнителем.',
    icon: '✅',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-completed-5',
    name: 'Успешный заказчик',
    description: '🌟 Завершил 5 задач! Твои проекты находят отличных исполнителей.',
    icon: '🌟',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-completed-10',
    name: 'Мастер заказов',
    description: '💎 Завершил 10 задач! Ты мастер в создании и управлении проектами.',
    icon: '💎',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-completed-25',
    name: 'Легенда заказов',
    description: '👑 Завершил 25 задач! Ты легендарный заказчик, с которым мечтают работать исполнители.',
    icon: '👑',
    condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-fast-payer',
    name: 'Быстрый плательщик',
    description: '⚡ Оплатил 5 задач в срок! Ты ценишь время и труд исполнителей.',
    icon: '⚡',
    condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 5 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-generous',
    name: 'Щедрый заказчик',
    description: '💰 Потратил более 50000₽ на задачи! Ты инвестируешь в качество и профессионализм.',
    icon: '💰',
    condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 50000 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-reviewer',
    name: 'Активный оценщик',
    description: '⭐ Оставил 10 отзывов! Ты помогаешь другим заказчикам выбирать лучших исполнителей.',
    icon: '⭐',
    condition: JSON.stringify({ type: 'reviewsGiven', operator: 'gte', value: 10 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-regular',
    name: 'Постоянный клиент',
    description: '🔄 Завершил задачи в течение 3 месяцев подряд! Ты регулярно используешь платформу.',
    icon: '🔄',
    condition: JSON.stringify({ type: 'monthlyActive', operator: 'gte', value: 3 }),
    targetRole: 'customer'
  },
  {
    id: 'customer-collaborator',
    name: 'Отличный партнер',
    description: '🤝 Работал с 5+ разными исполнителями! Ты умеешь находить лучших специалистов.',
    icon: '🤝',
    condition: JSON.stringify({ type: 'uniqueExecutors', operator: 'gte', value: 5 }),
    targetRole: 'customer'
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
            condition: badge.condition,
            targetRole: badge.targetRole || null
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

