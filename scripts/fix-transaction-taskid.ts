import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Скрипт для обновления существующих транзакций типа 'payment' и 'commission',
 * добавляя taskId на основе reason (который содержит название задачи)
 * 
 * ВАЖНО: Этот скрипт обновит только те транзакции, для которых можно найти задачу
 * по названию в reason. Для более точного обновления можно использовать другие методы.
 */
async function main() {
  console.log('🔧 Начинаем обновление транзакций...\n')

  // Получаем все транзакции типа 'payment' и 'commission' без taskId
  const transactionsWithoutTaskId = await prisma.transaction.findMany({
    where: {
      taskId: null,
      type: {
        in: ['payment', 'commission']
      }
    },
    select: {
      id: true,
      userId: true,
      type: true,
      reason: true,
      createdAt: true
    }
  })

  console.log(`📊 Найдено транзакций без taskId: ${transactionsWithoutTaskId.length}\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const transaction of transactionsWithoutTaskId) {
    try {
      // Извлекаем название задачи из reason
      // Формат: "Оплата за задачу \"Название задачи\"" или "Комиссия X% с задачи \"Название задачи\""
      const match = transaction.reason.match(/задачу\s+"([^"]+)"/)
      
      if (!match) {
        console.log(`⚠️ Не удалось извлечь название задачи из reason: "${transaction.reason}"`)
        skipped++
        continue
      }

      const taskTitle = match[1]

      // Ищем задачу по названию и userId заказчика
      // Ищем завершенные задачи этого пользователя
      const task = await prisma.task.findFirst({
        where: {
          title: taskTitle,
          customerId: transaction.userId,
          status: 'completed',
          completedAt: {
            // Ищем задачи, завершенные примерно в то же время (с запасом в 1 час)
            gte: new Date(transaction.createdAt.getTime() - 60 * 60 * 1000),
            lte: new Date(transaction.createdAt.getTime() + 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          title: true
        }
      })

      if (!task) {
        console.log(`⚠️ Не найдена задача "${taskTitle}" для пользователя ${transaction.userId}`)
        skipped++
        continue
      }

      // Обновляем транзакцию
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          taskId: task.id
        }
      })

      console.log(`✅ Обновлена транзакция ${transaction.id} -> задача "${task.title}" (${task.id})`)
      updated++
    } catch (error) {
      console.error(`❌ Ошибка при обновлении транзакции ${transaction.id}:`, error)
      errors++
    }
  }

  console.log(`\n📊 Результаты:`)
  console.log(`   ✅ Обновлено: ${updated}`)
  console.log(`   ⚠️ Пропущено: ${skipped}`)
  console.log(`   ❌ Ошибок: ${errors}`)
  console.log(`\n✨ Готово!`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

