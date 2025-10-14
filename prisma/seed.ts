import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Обновляем категории и подкатегории с актуальными минимальными ценами...')

  const categories = [
    {
      name: 'IT и программирование',
      subcategories: [
        { name: 'Frontend', minPrice: 2000 },
        { name: 'Backend', minPrice: 2200 },
        { name: 'Базы данных', minPrice: 2000 },
        { name: 'DevOps', minPrice: 2500 },
      ],
    },
    {
      name: 'Дизайн',
      subcategories: [
        { name: 'UI/UX дизайн', minPrice: 5000 },
        { name: 'Графический дизайн', minPrice: 15000 },
        { name: 'Анимация и видео', minPrice: 2000 },
      ],
    },
    {
      name: 'Контент и копирайтинг',
      subcategories: [
        { name: 'Написание статей', minPrice: 700 },
        { name: 'Редактирование', minPrice: 150 },
        { name: 'Сценарии', minPrice: 3000 },
      ],
    },
  ]

  for (const category of categories) {
    // upsert категории
    const cat = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name },
    })

    console.log(`✅ Категория: ${category.name}`)

    // upsert подкатегорий (обновляет minPrice если уже есть)
    for (const sub of category.subcategories) {
      await prisma.subcategory.upsert({
        where: { name: sub.name },
        update: {
          minPrice: sub.minPrice,
          categoryId: cat.id,
        },
        create: {
          name: sub.name,
          minPrice: sub.minPrice,
          categoryId: cat.id,
        },
      })
      console.log(`   ↳ Подкатегория обновлена: ${sub.name} → ${sub.minPrice}₽`)
    }
  }

  // =========================
  // Админ
  // =========================
  const email = 'admin@nesi.local'
  const plain = 'admin123' // поменяй после первого входа
  const password = await bcrypt.hash(plain, 10)

  await prisma.user.upsert({
    where: { email },
    update: { role: 'admin' },
    create: {
      email,
      password,
      role: 'admin',
      fullName: 'Системный администратор',
    },
  })

  console.log(`✅ Админ готов: ${email} / ${plain}`)
  console.log('🌱 Наполнение завершено!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
