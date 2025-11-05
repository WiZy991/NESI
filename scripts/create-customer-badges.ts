import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Создаем badges для заказчиков...')

  const customerBadges = [
    // Первая задача
    {
      id: 'customer-first-task',
      name: 'Первая задача',
      description: 'Вы создали свою первую задачу! Это начало большого пути. Продолжайте использовать платформу для решения своих задач.',
      icon: '🎯',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 1 }),
      targetRole: 'customer'
    },
    // Созданные задачи
    {
      id: 'customer-task-creator-5',
      name: 'Активный заказчик',
      description: '5 созданных задач! Вы активно используете платформу для решения своих задач. Отличный старт!',
      icon: '📝',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-task-creator-10',
      name: 'Постоянный клиент',
      description: '10 созданных задач! Вы регулярно используете платформу. Спасибо за доверие!',
      icon: '⭐',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-task-creator-25',
      name: 'Верный партнер',
      description: '25 созданных задач! Вы настоящий партнер нашей платформы. Ваш вклад неоценим!',
      icon: '🤝',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 25 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-task-creator-50',
      name: 'Легенда платформы',
      description: '50 созданных задач! Вы легенда нашей платформы. Ваша активность вдохновляет других!',
      icon: '👑',
      condition: JSON.stringify({ type: 'createdTasks', operator: 'gte', value: 50 }),
      targetRole: 'customer'
    },
    // Оплаченные задачи
    {
      id: 'customer-first-paid',
      name: 'Первая оплата',
      description: 'Вы оплатили свою первую задачу! Надеемся, результат вас порадовал.',
      icon: '💳',
      condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 1 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-paid-5',
      name: 'Надежный плательщик',
      description: '5 оплаченных задач! Вы всегда вовремя оплачиваете работу. Исполнители это ценят!',
      icon: '💰',
      condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-paid-10',
      name: 'Премиум клиент',
      description: '10 оплаченных задач! Вы ценный клиент нашей платформы. Спасибо за сотрудничество!',
      icon: '💎',
      condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-paid-25',
      name: 'VIP заказчик',
      description: '25 оплаченных задач! Вы VIP-клиент! Мы ценим ваше доверие и долгосрочное сотрудничество.',
      icon: '🏆',
      condition: JSON.stringify({ type: 'paidTasks', operator: 'gte', value: 25 }),
      targetRole: 'customer'
    },
    // Потраченная сумма
    {
      id: 'customer-spent-10k',
      name: 'Первые 10 тысяч',
      description: 'Вы потратили 10,000₽ на платформе! Инвестиции в качественные решения окупаются.',
      icon: '💵',
      condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 10000 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-spent-50k',
      name: 'Серьезный инвестор',
      description: '50,000₽ потрачено! Вы серьезно относитесь к качеству и готовы инвестировать в результат.',
      icon: '💸',
      condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 50000 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-spent-100k',
      name: 'Крупный клиент',
      description: '100,000₽ потрачено! Вы крупный клиент платформы. Ваше доверие - наша гордость!',
      icon: '💴',
      condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 100000 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-spent-500k',
      name: 'Магнат',
      description: '500,000₽ потрачено! Вы настоящий магнат платформы. Ваш бизнес на высшем уровне!',
      icon: '💶',
      condition: JSON.stringify({ type: 'totalSpent', operator: 'gte', value: 500000 }),
      targetRole: 'customer'
    },
    // Месячная активность
    {
      id: 'customer-monthly-active',
      name: 'Месячный активист',
      description: 'Вы активны каждый месяц! Регулярность - ключ к успеху.',
      icon: '📅',
      condition: JSON.stringify({ type: 'monthlyActive', operator: 'gte', value: 3 }),
      targetRole: 'customer'
    },
    // Уникальные исполнители
    {
      id: 'customer-diverse-team-5',
      name: 'Команда мечты',
      description: 'Работали с 5 разными исполнителями! Вы умеете находить лучших специалистов.',
      icon: '👥',
      condition: JSON.stringify({ type: 'uniqueExecutors', operator: 'gte', value: 5 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-diverse-team-10',
      name: 'Мастер найма',
      description: 'Работали с 10 разными исполнителями! Вы настоящий мастер найма талантов.',
      icon: '🎯',
      condition: JSON.stringify({ type: 'uniqueExecutors', operator: 'gte', value: 10 }),
      targetRole: 'customer'
    },
    {
      id: 'customer-diverse-team-20',
      name: 'Создатель команды',
      description: 'Работали с 20 разными исполнителями! Вы создали настоящую команду профессионалов.',
      icon: '🌟',
      condition: JSON.stringify({ type: 'uniqueExecutors', operator: 'gte', value: 20 }),
      targetRole: 'customer'
    }
  ]

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0

  for (const badge of customerBadges) {
    try {
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
            targetRole: badge.targetRole as any
          }
        })
        updatedCount++
        console.log(`🔄 Обновлен: ${badge.name} (${badge.id})`)
      } else {
        await prisma.badge.create({
          data: badge as any
        })
        createdCount++
        console.log(`✅ Создан: ${badge.name} (${badge.id})`)
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке badge ${badge.id}:`, error)
      skippedCount++
    }
  }

  console.log(`\n✅ Готово! Создано: ${createdCount}, Обновлено: ${updatedCount}, Пропущено: ${skippedCount}`)
  console.log(`📊 Всего badges для заказчиков: ${customerBadges.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при создании badges для заказчиков:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
