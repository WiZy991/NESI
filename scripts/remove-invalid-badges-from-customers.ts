import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Ищем и удаляем неподходящие badges у заказчиков...')

  // Поля, специфичные для исполнителей (универсальные badges с этими условиями тоже для исполнителей)
  // completedTasks - задачи, которые исполнитель выполнил (не имеет смысла для заказчиков в контексте достижений)
  const executorOnlyFields = ['passedTests', 'completedTasks']
  
  // Поля, специфичные для заказчиков
  const customerOnlyFields = ['createdTasks', 'paidTasks', 'totalSpent', 'monthlyActive', 'uniqueExecutors']

  // Получаем всех заказчиков
  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    select: {
      id: true,
      email: true,
      fullName: true,
      badges: {
        select: {
          id: true,
          badgeId: true,
          badge: {
            select: {
              id: true,
              name: true,
              targetRole: true,
              condition: true
            }
          }
        }
      }
    }
  })

  console.log(`📦 Найдено ${customers.length} заказчиков`)

  let totalRemoved = 0
  let usersAffected = 0

  for (const customer of customers) {
    const badgesToRemove: string[] = []

    for (const userBadge of customer.badges) {
      const badge = userBadge.badge
      
      // Если badge специально для executor - удаляем
      if (badge.targetRole === 'executor') {
        badgesToRemove.push(userBadge.id)
        console.log(`  ❌ [${customer.email || customer.fullName}] Удаляем "${badge.name}" (targetRole=executor)`)
        continue
      }

      // Если badge универсальный (null), проверяем условие
      if (badge.targetRole === null) {
        try {
          const condition = JSON.parse(badge.condition)
          const conditionType = condition.type as string

          // Если условие специфично для исполнителей - удаляем у заказчика
          if (executorOnlyFields.includes(conditionType)) {
            badgesToRemove.push(userBadge.id)
            console.log(`  ❌ [${customer.email || customer.fullName}] Удаляем универсальный "${badge.name}" (условие: ${conditionType} - только для исполнителей)`)
          }
        } catch (error) {
          console.error(`  ⚠️  Ошибка парсинга условия для badge ${badge.id}:`, error)
        }
      }
    }

    // Удаляем неподходящие badges
    if (badgesToRemove.length > 0) {
      await prisma.userBadge.deleteMany({
        where: {
          id: { in: badgesToRemove }
        }
      })
      totalRemoved += badgesToRemove.length
      usersAffected++
      console.log(`  ✅ [${customer.email || customer.fullName}] Удалено ${badgesToRemove.length} неподходящих badges`)
    }
  }

  console.log(`\n✅ Готово!`)
  console.log(`📊 Удалено badges: ${totalRemoved}`)
  console.log(`👥 Затронуто пользователей: ${usersAffected}`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при удалении badges:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
