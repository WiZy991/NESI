import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Обновляем targetRole для существующих badges...')

  // Поля, специфичные для исполнителей
  const executorOnlyFields = ['passedTests']
  
  // Поля, специфичные для заказчиков
  const customerOnlyFields = ['createdTasks', 'paidTasks', 'totalSpent', 'monthlyActive', 'uniqueExecutors']

  // Получаем все badges
  const badges = await prisma.badge.findMany({
    select: {
      id: true,
      name: true,
      condition: true,
      targetRole: true
    }
  })

  console.log(`📦 Найдено ${badges.length} badges для проверки`)

  let updatedCount = 0
  let skippedCount = 0

  for (const badge of badges) {
    try {
      // Парсим условие
      const condition = JSON.parse(badge.condition)
      const conditionType = condition.type as string

      // Определяем targetRole на основе типа условия
      let targetRole: string | null = null

      if (executorOnlyFields.includes(conditionType)) {
        targetRole = 'executor'
      } else if (customerOnlyFields.includes(conditionType)) {
        targetRole = 'customer'
      } else {
        // Универсальные поля (completedTasks, avgRating, positiveReviews, totalXP, level)
        // Оставляем null для всех ролей
        targetRole = null
      }

      // Обновляем только если targetRole изменился
      if (badge.targetRole !== targetRole) {
        await prisma.badge.update({
          where: { id: badge.id },
          data: { targetRole: targetRole as any } // Обход проблемы с типами
        })
        console.log(`✅ Обновлен: ${badge.name} (${badge.id}) → targetRole: ${targetRole || 'null (универсальный)'}`)
        updatedCount++
      } else {
        console.log(`⏭️  Пропущен: ${badge.name} (${badge.id}) - targetRole уже правильный: ${badge.targetRole || 'null'}`)
        skippedCount++
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке badge ${badge.id} (${badge.name}):`, error)
    }
  }

  console.log(`\n✅ Готово! Обновлено: ${updatedCount}, Пропущено: ${skippedCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при обновлении badges:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
