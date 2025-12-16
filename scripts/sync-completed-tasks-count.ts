import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Скрипт для синхронизации completedTasksCount у всех пользователей
 * 
 * Проблема: completedTasksCount не увеличивался при завершении задач,
 * поэтому у всех пользователей он мог остаться 0.
 * 
 * Этот скрипт исправляет это, подсчитывая реальное количество
 * завершённых задач для каждого исполнителя.
 * 
 * Запуск: npx ts-node scripts/sync-completed-tasks-count.ts
 */
async function main() {
  console.log('🔧 Синхронизация completedTasksCount...\n')

  // Получаем всех пользователей с их текущим completedTasksCount
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      completedTasksCount: true,
    }
  })

  console.log(`📊 Найдено пользователей: ${users.length}\n`)

  let updated = 0
  let skipped = 0

  for (const user of users) {
    // Считаем реальное количество завершённых задач где пользователь был исполнителем
    const actualCount = await prisma.task.count({
      where: {
        executorId: user.id,
        status: 'completed',
      }
    })

    // Если счётчик отличается - обновляем
    if (user.completedTasksCount !== actualCount) {
      await prisma.user.update({
        where: { id: user.id },
        data: { completedTasksCount: actualCount }
      })

      console.log(`✅ ${user.fullName || user.email}: ${user.completedTasksCount} → ${actualCount}`)
      updated++
    } else {
      skipped++
    }
  }

  console.log(`\n📊 Результаты:`)
  console.log(`   ✅ Обновлено: ${updated}`)
  console.log(`   ⏭️  Без изменений: ${skipped}`)
  console.log(`\n✨ Готово!`)

  // Показываем пример как теперь работает комиссия
  console.log(`\n💰 Как работает комиссия:`)
  console.log(`   • completedTasksCount < 3 → комиссия 0%`)
  console.log(`   • completedTasksCount >= 3 + уровень 1-2 → комиссия 10%`)
  console.log(`   • completedTasksCount >= 3 + уровень 3 → комиссия 9%`)
  console.log(`   • completedTasksCount >= 3 + уровень 4 → комиссия 8%`)
  console.log(`   • completedTasksCount >= 3 + уровень 5 → комиссия 7%`)
  console.log(`   • completedTasksCount >= 3 + уровень 6+ → комиссия 6%`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

