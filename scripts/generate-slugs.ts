/**
 * Скрипт для генерации SEO-friendly slug'ов для существующих данных
 * 
 * Использование:
 * npx tsx scripts/generate-slugs.ts
 */

import prisma from '../src/lib/prisma'
import { slugify, createUniqueSlug } from '../src/lib/seo/slugify'

async function generateSlugs() {
  console.log('🚀 Начинаю генерацию slug\'ов...\n')

  try {
    // 1. Генерируем slug'и для пользователей
    console.log('📝 Генерация slug\'ов для пользователей...')
    const users = await prisma.user.findMany({
      where: { fullName: { not: null } },
      select: { id: true, fullName: true, seoSlug: true },
    })

    const existingUserSlugs = await prisma.user.findMany({
      where: { seoSlug: { not: null } },
      select: { seoSlug: true },
    }).then(users => users.map(u => u.seoSlug!).filter(Boolean))

    let userCount = 0
    for (const user of users) {
      if (!user.seoSlug && user.fullName) {
        const slug = createUniqueSlug(user.fullName, existingUserSlugs)
        existingUserSlugs.push(slug)

        await prisma.user.update({
          where: { id: user.id },
          data: { seoSlug: slug },
        })

        userCount++
        if (userCount % 100 === 0) {
          console.log(`  ✅ Обработано пользователей: ${userCount}/${users.length}`)
        }
      }
    }
    console.log(`✅ Сгенерировано slug'ов для пользователей: ${userCount}\n`)

    // 2. Генерируем slug'и для задач
    console.log('📝 Генерация slug\'ов для задач...')
    const tasks = await prisma.task.findMany({
      select: { id: true, title: true, seoSlug: true },
    })

    const existingTaskSlugs = await prisma.task.findMany({
      where: { seoSlug: { not: null } },
      select: { seoSlug: true },
    }).then(tasks => tasks.map(t => t.seoSlug!).filter(Boolean))

    let taskCount = 0
    for (const task of tasks) {
      if (!task.seoSlug) {
        const slug = createUniqueSlug(task.title, existingTaskSlugs)
        existingTaskSlugs.push(slug)

        await prisma.task.update({
          where: { id: task.id },
          data: { seoSlug: slug },
        })

        taskCount++
        if (taskCount % 100 === 0) {
          console.log(`  ✅ Обработано задач: ${taskCount}/${tasks.length}`)
        }
      }
    }
    console.log(`✅ Сгенерировано slug'ов для задач: ${taskCount}\n`)

    // 3. Генерируем slug'и для категорий
    console.log('📝 Генерация slug\'ов для категорий...')
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    })

    const existingCategorySlugs = await prisma.category.findMany({
      where: { slug: { not: null } },
      select: { slug: true },
    }).then(cats => cats.map(c => c.slug!).filter(Boolean))

    let categoryCount = 0
    for (const category of categories) {
      if (!category.slug) {
        const slug = createUniqueSlug(category.name, existingCategorySlugs)
        existingCategorySlugs.push(slug)

        await prisma.category.update({
          where: { id: category.id },
          data: { slug },
        })

        categoryCount++
      }
    }
    console.log(`✅ Сгенерировано slug'ов для категорий: ${categoryCount}\n`)

    // 4. Генерируем slug'и для подкатегорий
    console.log('📝 Генерация slug\'ов для подкатегорий...')
    const subcategories = await prisma.subcategory.findMany({
      select: { id: true, name: true, slug: true },
    })

    const existingSubcategorySlugs = await prisma.subcategory.findMany({
      where: { slug: { not: null } },
      select: { slug: true },
    }).then(subs => subs.map(s => s.slug!).filter(Boolean))

    let subcategoryCount = 0
    for (const subcategory of subcategories) {
      if (!subcategory.slug) {
        const slug = createUniqueSlug(subcategory.name, existingSubcategorySlugs)
        existingSubcategorySlugs.push(slug)

        await prisma.subcategory.update({
          where: { id: subcategory.id },
          data: { slug },
        })

        subcategoryCount++
      }
    }
    console.log(`✅ Сгенерировано slug'ов для подкатегорий: ${subcategoryCount}\n`)

    console.log('🎉 Генерация slug\'ов завершена успешно!')
    console.log(`\n📊 Итого:`)
    console.log(`  - Пользователи: ${userCount}`)
    console.log(`  - Задачи: ${taskCount}`)
    console.log(`  - Категории: ${categoryCount}`)
    console.log(`  - Подкатегории: ${subcategoryCount}`)
  } catch (error) {
    console.error('❌ Ошибка при генерации slug\'ов:', error)
    throw error
  }
}

// Запуск скрипта
generateSlugs()
  .catch((error) => {
    console.error('Критическая ошибка:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

