import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Скрипт для настройки достижений на сервере
 * Проверяет и создает необходимые структуры
 */
async function main() {
  console.log('🔧 Настройка системы достижений на сервере...\n')

  try {
    // 1. Проверяем наличие таблицы Badge
    console.log('1️⃣ Проверка таблицы Badge...')
    const badgeCount = await prisma.badge.count().catch(() => {
      throw new Error('Таблица Badge не существует! Примените миграции.')
    })
    console.log(`   ✅ Таблица Badge существует (записей: ${badgeCount})`)

    // 2. Проверяем наличие поля targetRole
    console.log('\n2️⃣ Проверка поля targetRole...')
    try {
      // Пробуем запросить с targetRole
      const sampleBadge = await prisma.$queryRaw<Array<{targetRole: string | null}>>`
        SELECT "targetRole" FROM "Badge" LIMIT 1
      `.catch(() => null)

      if (sampleBadge === null) {
        console.log('   ⚠️  Поле targetRole не найдено, добавляем...')
        await prisma.$executeRaw`
          ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "targetRole" TEXT;
        `
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "Badge_targetRole_idx" ON "Badge"("targetRole");
        `
        console.log('   ✅ Поле targetRole добавлено')
      } else {
        console.log('   ✅ Поле targetRole существует')
      }
    } catch (error: any) {
      if (error.message?.includes('targetRole') || error.code === '42703') {
        console.log('   ⚠️  Поле targetRole не найдено, добавляем...')
        await prisma.$executeRaw`
          ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "targetRole" TEXT;
        `
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "Badge_targetRole_idx" ON "Badge"("targetRole");
        `
        console.log('   ✅ Поле targetRole добавлено')
      } else {
        throw error
      }
    }

    // 3. Проверяем наличие достижений
    console.log('\n3️⃣ Проверка достижений...')
    const totalBadges = await prisma.badge.count()
    console.log(`   📊 Всего достижений: ${totalBadges}`)

    if (totalBadges === 0) {
      console.log('   ⚠️  Достижения не найдены!')
      console.log('   💡 Запустите: POST /api/admin/badges/seed (как админ)')
      console.log('   💡 Или: npx tsx scripts/create-customer-badges.ts')
      return
    }

    // 4. Проверяем распределение по ролям
    console.log('\n4️⃣ Проверка распределения по ролям...')
    const allBadges = await prisma.$queryRaw<Array<{targetRole: string | null}>>`
      SELECT "targetRole", COUNT(*) as count 
      FROM "Badge" 
      GROUP BY "targetRole"
    `

    const badgesForCustomer = allBadges.find(b => b.targetRole === 'customer')?.count || 0
    const badgesForExecutor = allBadges.find(b => b.targetRole === 'executor')?.count || 0
    const badgesForAll = allBadges.find(b => b.targetRole === null)?.count || 0

    console.log(`   📊 Для заказчиков: ${badgesForCustomer}`)
    console.log(`   📊 Для исполнителей: ${badgesForExecutor}`)
    console.log(`   📊 Для всех: ${badgesForAll}`)

    if (badgesForCustomer === 0) {
      console.log('\n   ⚠️  Достижения для заказчиков не найдены!')
      console.log('   💡 Запустите: npx tsx scripts/create-customer-badges.ts')
    }

    console.log('\n✅ Настройка завершена!')
    console.log('\n📝 Следующие шаги:')
    console.log('   1. Если достижений нет - запустите seed')
    console.log('   2. Проверьте работу: npx tsx scripts/check-and-fix-badges-on-server.ts')
    console.log('   3. Создайте задачу и проверьте логи сервера')

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message)
    if (error.code === '42P01') {
      console.error('   ⚠️  Таблица Badge не существует!')
      console.error('   💡 Примените миграции: npx prisma migrate resolve --applied <migration_name>')
    } else if (error.code === '42703') {
      console.error('   ⚠️  Поле targetRole не существует!')
      console.error('   💡 Добавьте поле вручную или примените миграцию')
    }
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Критическая ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

