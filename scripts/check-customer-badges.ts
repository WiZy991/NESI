import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Проверяем badges у заказчиков...\n')

  // Получаем заказчиков с их badges
  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    select: {
      id: true,
      email: true,
      fullName: true,
      badges: {
        select: {
          id: true,
          earnedAt: true,
          badge: {
            select: {
              id: true,
              name: true,
              targetRole: true,
              condition: true
            }
          }
        },
        orderBy: { earnedAt: 'desc' }
      }
    }
  })

  for (const customer of customers) {
    if (customer.badges.length === 0) continue

    console.log(`\n👤 ${customer.fullName || customer.email} (${customer.id})`)
    console.log(`   Badges: ${customer.badges.length}`)
    
    for (const userBadge of customer.badges) {
      const badge = userBadge.badge
      let conditionInfo = ''
      
      try {
        const condition = JSON.parse(badge.condition)
        conditionInfo = ` (условие: ${condition.type}, значение: ${condition.value})`
      } catch {
        conditionInfo = ' (не удалось распарсить условие)'
      }

      const roleStatus = badge.targetRole === null 
        ? '🌐 универсальный' 
        : badge.targetRole === 'customer'
        ? '✅ для заказчика'
        : '❌ для исполнителя'
      
      console.log(`   - ${badge.icon} ${badge.name} ${roleStatus}${conditionInfo}`)
    }
  }

  console.log(`\n\n📊 Итого: ${customers.length} заказчиков`)
  const totalBadges = customers.reduce((sum, c) => sum + c.badges.length, 0)
  console.log(`📦 Всего badges у заказчиков: ${totalBadges}`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
