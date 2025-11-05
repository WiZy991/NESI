import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Скрипт для проверки и исправления проблем с достижениями на сервере
 * Запускать на сервере: npx tsx scripts/check-and-fix-badges-on-server.ts
 */
async function main() {
  console.log('🔍 Проверка системы достижений на сервере...\n')

  // 1. Проверяем наличие поля targetRole в таблице Badge
  console.log('1️⃣ Проверка структуры БД...')
  try {
    const sampleBadge = await prisma.badge.findFirst()
    if (sampleBadge) {
      const badge = sampleBadge as any
      if ('targetRole' in badge) {
        console.log('   ✅ Поле targetRole существует')
        console.log(`   📊 Пример: targetRole = "${badge.targetRole}" (тип: ${typeof badge.targetRole})`)
      } else {
        console.error('   ❌ Поле targetRole НЕ существует в таблице Badge!')
        console.error('   ⚠️  Нужно применить миграцию: npx prisma migrate deploy')
        return
      }
    } else {
      console.log('   ⚠️  Таблица Badge пуста')
    }
  } catch (error: any) {
    console.error('   ❌ Ошибка при проверке структуры БД:', error.message)
    if (error.message?.includes('targetRole')) {
      console.error('   ⚠️  Поле targetRole не существует! Примените миграцию.')
    }
    return
  }

  // 2. Проверяем количество достижений в БД
  console.log('\n2️⃣ Проверка наличия достижений...')
  const totalBadges = await prisma.badge.count()
  console.log(`   📊 Всего достижений в БД: ${totalBadges}`)

  if (totalBadges === 0) {
    console.error('   ❌ В БД нет достижений!')
    console.error('   ⚠️  Нужно запустить seed: POST /api/admin/badges/seed')
    console.error('   ⚠️  Или использовать скрипт: npx tsx scripts/create-customer-badges.ts')
    return
  }

  // 3. Проверяем распределение по ролям
  console.log('\n3️⃣ Проверка распределения по ролям...')
  const allBadges = await prisma.badge.findMany()
  
  const badgesForCustomer = allBadges.filter((b: any) => b.targetRole === 'customer').length
  const badgesForExecutor = allBadges.filter((b: any) => b.targetRole === 'executor').length
  const badgesForAll = allBadges.filter((b: any) => (b as any).targetRole === null || (b as any).targetRole === undefined || (b as any).targetRole === '').length

  console.log(`   📊 Для заказчиков (customer): ${badgesForCustomer}`)
  console.log(`   📊 Для исполнителей (executor): ${badgesForExecutor}`)
  console.log(`   📊 Для всех ролей (null): ${badgesForAll}`)

  // 4. Проверяем примеры достижений
  console.log('\n4️⃣ Примеры достижений:')
  const customerBadges = allBadges.filter((b: any) => b.targetRole === 'customer').slice(0, 3)
  if (customerBadges.length > 0) {
    console.log('   Достижения для заказчиков:')
    customerBadges.forEach((b: any) => {
      console.log(`     - ${b.icon} ${b.name} (targetRole: "${b.targetRole}")`)
    })
  }

  const executorBadges = allBadges.filter((b: any) => b.targetRole === 'executor').slice(0, 3)
  if (executorBadges.length > 0) {
    console.log('   Достижения для исполнителей:')
    executorBadges.forEach((b: any) => {
      console.log(`     - ${b.icon} ${b.name} (targetRole: "${b.targetRole}")`)
    })
  }

  // 5. Проверяем пользователей
  console.log('\n5️⃣ Проверка пользователей...')
  const customers = await prisma.user.count({ where: { role: 'customer' } })
  const executors = await prisma.user.count({ where: { role: 'executor' } })
  console.log(`   📊 Заказчиков: ${customers}`)
  console.log(`   📊 Исполнителей: ${executors}`)

  // 6. Проверяем выданные достижения
  console.log('\n6️⃣ Проверка выданных достижений...')
  const userBadgesCount = await prisma.userBadge.count()
  console.log(`   📊 Всего выдано достижений: ${userBadgesCount}`)

  const customerBadgesAwarded = await prisma.userBadge.findMany({
    include: {
      user: { select: { id: true, role: true } },
      badge: { select: { id: true, name: true, targetRole: true } }
    },
    take: 5
  })

  if (customerBadgesAwarded.length > 0) {
    console.log('   Примеры выданных достижений:')
    customerBadgesAwarded.forEach(ub => {
      const badge = ub.badge as any
      console.log(`     - Пользователь ${ub.user.role}: ${badge.name} (targetRole: "${badge.targetRole}")`)
    })
  }

  // 7. Итоговые рекомендации
  console.log('\n✅ Проверка завершена!\n')
  
  if (totalBadges === 0) {
    console.log('⚠️  ДЕЙСТВИЕ ТРЕБУЕТСЯ:')
    console.log('   1. Запустите seed: POST /api/admin/badges/seed (как админ)')
    console.log('   2. Или используйте: npx tsx scripts/create-customer-badges.ts')
  } else if (badgesForCustomer === 0) {
    console.log('⚠️  ДЕЙСТВИЕ ТРЕБУЕТСЯ:')
    console.log('   Достижения для заказчиков не найдены!')
    console.log('   Запустите: npx tsx scripts/create-customer-badges.ts')
  } else {
    console.log('✅ Система достижений настроена правильно!')
    console.log('   Если достижения все еще не работают, проверьте:')
    console.log('   1. Логи сервера при создании задачи')
    console.log('   2. Пересобран ли Prisma client: npx prisma generate')
    console.log('   3. Применены ли все миграции: npx prisma migrate deploy')
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

