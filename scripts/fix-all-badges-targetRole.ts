import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Скрипт для исправления targetRole у всех достижений
 * Создает недостающие достижения для заказчиков и обновляет targetRole у существующих
 */
async function main() {
  console.log('🔧 Исправление targetRole у всех достижений...\n')

  // Получаем все достижения из seed
  const allBadgesFromSeed = [
    // Достижения для исполнителей
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
    // Достижения для заказчиков
    {
      id: 'customer-first-task',
      name: 'Первая заявка',
      description: '🎯 Твой первый заказ создан! Начало великого пути. Ты сделал первый шаг к решению своих задач через платформу профессионалов. Путешествие только начинается!',
      icon: '🎯',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 1 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-active-5',
      name: 'Активный заказчик',
      description: '📊 5 заказов создано! Ты активно используешь платформу. Твои проекты находят отклик у исполнителей, а репутация растет. Ты на правильном пути!',
      icon: '📊',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-active-10',
      name: 'Опытный заказчик',
      description: '🎪 10 заказов в портфеле! Ты знаешь, как формулировать задачи и находить лучших исполнителей. Твой опыт ценен для сообщества. Продолжай в том же духе!',
      icon: '🎪',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-active-25',
      name: 'Мастер заказов',
      description: '🎖️ 25 заказов создано! Ты настоящий мастер в формулировании задач. Исполнители мечтают работать с такими заказчиками как ты. Твоя репутация предшествует тебе!',
      icon: '🎖️',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 25 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-completed-1',
      name: 'Первая победа',
      description: '🎊 Первый проект завершен! Твой заказ выполнен на отлично. Это начало серии успешных проектов и плодотворного сотрудничества. Первая победа всегда особенная!',
      icon: '🎊',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-completed-5',
      name: 'Успешный заказчик',
      description: '🎁 5 проектов завершено! Твои задачи находят отличных исполнителей. Качество и скорость выполнения радуют, а репутация сияет. Ты набираешь обороты!',
      icon: '🎁',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-completed-10',
      name: 'Ветеран проектов',
      description: '🏅 10 побед в портфеле! Ты опытный заказчик, который умеет доводить проекты до идеального результата. Твои ожидания всегда оправдываются. Мастерство очевидно!',
      icon: '🏅',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-completed-25',
      name: 'Легенда заказов',
      description: '👑 25 завершенных проектов! Ты легендарный заказчик. О тебе говорят, с тобой хотят работать. Твои проекты - эталон качества. Ты вошел в историю платформы!',
      icon: '👑',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-fast-payer',
      name: 'Быстрый плательщик',
      description: '💸 5 проектов оплачено без задержек! Ты ценишь время и труд исполнителей. Твоя репутация надежного плательщика привлекает лучших специалистов. Слава о тебе распространяется!',
      icon: '💸',
      condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-generous',
      name: 'Щедрый инвестор',
      description: '💵 Более 50000₽ инвестировано в проекты! Ты понимаешь ценность качественной работы и готов платить за профессионализм. Твои инвестиции окупаются результатом. Ты знаешь цену мастерству!',
      icon: '💵',
      condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 50000 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-reviewer',
      name: 'Мудрый оценщик',
      description: '🎖️ 10 отзывов оставлено! Ты помогаешь сообществу выбирать лучших исполнителей. Твои отзывы - навигатор для других заказчиков. Твоя мудрость направляет других!',
      icon: '🎖️',
      condition: JSON.stringify({ type: 'reviewsGiven', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-regular',
      name: 'Постоянный клиент',
      description: '🎯 Активность 3 месяца подряд! Ты регулярно используешь платформу. Твоя постоянная активность показывает серьезность намерений. Ты стал частью сообщества!',
      icon: '🎯',
      condition: JSON.stringify({ type: 'monthlyActive', operator: 'gte', value: 3 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-collaborator',
      name: 'Мастер сотрудничества',
      description: '🤝 Работал с 5+ разными исполнителями! Ты умеешь находить лучших специалистов для каждого проекта. Твоя сеть контактов впечатляет. Ты строишь команду профессионалов!',
      icon: '🤝',
      condition: JSON.stringify({ type: 'uniqueExecutors', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    }
  ]

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0

  console.log(`📋 Обработка ${allBadgesFromSeed.length} достижений...\n`)

  for (const badge of allBadgesFromSeed) {
    try {
      const existing = await prisma.badge.findUnique({
        where: { id: badge.id }
      })

      if (existing) {
        // Обновляем существующее достижение, включая targetRole
        await prisma.badge.update({
          where: { id: badge.id },
          data: {
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            condition: badge.condition,
            targetRole: badge.targetRole // Явно устанавливаем targetRole
          }
        })
        updatedCount++
        console.log(`🔄 Обновлен: ${badge.name} (${badge.id}) -> targetRole: "${badge.targetRole}"`)
      } else {
        // Создаем новое достижение
        await prisma.badge.create({
          data: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            condition: badge.condition,
            targetRole: badge.targetRole
          }
        })
        createdCount++
        console.log(`✅ Создан: ${badge.name} (${badge.id}) -> targetRole: "${badge.targetRole}"`)
      }
    } catch (error: any) {
      console.error(`❌ Ошибка при обработке badge ${badge.id}:`, error.message)
      skippedCount++
    }
  }

  console.log(`\n✅ Готово!`)
  console.log(`   📊 Создано: ${createdCount}`)
  console.log(`   🔄 Обновлено: ${updatedCount}`)
  console.log(`   ⚠️  Пропущено: ${skippedCount}`)
  console.log(`   📦 Всего обработано: ${allBadgesFromSeed.length}`)

  // Проверяем результат
  console.log(`\n🔍 Проверка результата...`)
  const customerBadges = await prisma.badge.count({
    where: { targetRole: 'customer' }
  })
  const executorBadges = await prisma.badge.count({
    where: { targetRole: 'executor' }
  })
  const nullBadges = await prisma.badge.count({
    where: { targetRole: null }
  })

  console.log(`   📊 Для заказчиков: ${customerBadges}`)
  console.log(`   📊 Для исполнителей: ${executorBadges}`)
  console.log(`   📊 Без роли (null): ${nullBadges}`)

  if (customerBadges === 0) {
    console.log(`\n⚠️  ВНИМАНИЕ: Достижения для заказчиков не найдены!`)
  } else {
    console.log(`\n✅ Достижения для заказчиков созданы успешно!`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

