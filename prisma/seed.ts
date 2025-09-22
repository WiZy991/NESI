import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // =========================
  // Категории и подкатегории
  // =========================
  const categories = [
    {
      name: 'IT и программирование',
      subcategories: [
        { name: 'Frontend', minPrice: 1000 },
        { name: 'Backend', minPrice: 1200 },
        { name: 'Базы данных', minPrice: 900 },
        { name: 'DevOps', minPrice: 1500 },
      ],
    },
    {
      name: 'Дизайн',
      subcategories: [
        { name: 'UI/UX дизайн', minPrice: 1300 },
        { name: 'Графический дизайн', minPrice: 1100 },
        { name: 'Анимация и видео', minPrice: 1400 },
      ],
    },
    {
      name: 'Контент и копирайтинг',
      subcategories: [
        { name: 'Написание статей', minPrice: 800 },
        { name: 'Редактирование', minPrice: 850 },
        { name: 'Сценарии', minPrice: 1000 },
      ],
    },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name }, // теперь работает, т.к. name @unique
      update: {},
      create: {
        name: category.name,
        subcategories: {
          create: category.subcategories,
        },
      },
    })
    console.log(`✅ Категория: ${category.name}`)
  }

  // =========================
  // Админ
  // =========================
  const email = 'admin@nesi.local'
  const plain = 'admin123' // поменяешь после первого входа
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
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
