# 🎯 Полная SEO-архитектура для NESI

## ✅ Выполненные компоненты

### 1. Prisma Schema обновлена
- ✅ Добавлено поле `seoSlug` в модель `User`
- ✅ Добавлено поле `seoSlug` в модель `Task`
- ✅ Добавлено поле `slug` в модель `Category`
- ✅ Добавлено поле `slug` в модель `Subcategory`

### 2. Утилиты для SEO
- ✅ `src/lib/seo/slugify.ts` - Транслитерация и создание SEO-friendly slug'ов
- ✅ `src/lib/seo/metaTags.ts` - Генерация метатегов для всех типов страниц
- ✅ `src/lib/seo/schemaOrg.ts` - Schema.org JSON-LD разметка

### 3. SEO компоненты
- ✅ `src/components/seo/CanonicalUrl.tsx` - Canonical URL
- ✅ `src/components/seo/PaginationLinks.tsx` - rel=next/prev для пагинации

### 4. Sitemap система
- ✅ `src/app/sitemap-index.ts` - Главный индексный файл
- ✅ `src/app/sitemap-static.ts` - Статичные страницы
- ✅ `src/app/api/sitemap-freelancers/route.ts` - Профили фрилансеров
- ✅ `src/app/api/sitemap-tasks/route.ts` - Задачи
- ✅ `src/app/api/sitemap-categories/route.ts` - Категории и подкатегории

### 5. Robots.txt
- ✅ Обновлен согласно требованиям

## 📋 Следующие шаги для полной реализации

### Шаг 1: Применить миграцию Prisma

```bash
# Создать миграцию
npx prisma migrate dev --name add_seo_slugs

# Или на продакшене
npx prisma migrate deploy
```

### Шаг 2: Создать скрипт для генерации slug'ов для существующих данных

Создайте файл `scripts/generate-slugs.ts`:

```typescript
import prisma from '@/lib/prisma'
import { slugify, createUniqueSlug } from '@/lib/seo/slugify'

async function generateSlugs() {
  // Генерируем slug'и для пользователей
  const users = await prisma.user.findMany({
    where: { fullName: { not: null } },
    select: { id: true, fullName: true, seoSlug: true }
  })

  for (const user of users) {
    if (!user.seoSlug && user.fullName) {
      const existingSlugs = await prisma.user.findMany({
        where: { seoSlug: { not: null } },
        select: { seoSlug: true }
      }).then(users => users.map(u => u.seoSlug!).filter(Boolean))

      const slug = createUniqueSlug(user.fullName, existingSlugs)
      
      await prisma.user.update({
        where: { id: user.id },
        data: { seoSlug: slug }
      })
    }
  }

  // Генерируем slug'и для задач
  const tasks = await prisma.task.findMany({
    select: { id: true, title: true, seoSlug: true }
  })

  for (const task of tasks) {
    if (!task.seoSlug) {
      const existingSlugs = await prisma.task.findMany({
        where: { seoSlug: { not: null } },
        select: { seoSlug: true }
      }).then(tasks => tasks.map(t => t.seoSlug!).filter(Boolean))

      const slug = createUniqueSlug(task.title, existingSlugs)
      
      await prisma.task.update({
        where: { id: task.id },
        data: { seoSlug: slug }
      })
    }
  }

  // Генерируем slug'и для категорий
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true }
  })

  for (const category of categories) {
    if (!category.slug) {
      const existingSlugs = await prisma.category.findMany({
        where: { slug: { not: null } },
        select: { slug: true }
      }).then(cats => cats.map(c => c.slug!).filter(Boolean))

      const slug = createUniqueSlug(category.name, existingSlugs)
      
      await prisma.category.update({
        where: { id: category.id },
        data: { slug }
      })
    }
  }

  // Генерируем slug'и для подкатегорий
  const subcategories = await prisma.subcategory.findMany({
    select: { id: true, name: true, slug: true }
  })

  for (const subcategory of subcategories) {
    if (!subcategory.slug) {
      const existingSlugs = await prisma.subcategory.findMany({
        where: { slug: { not: null } },
        select: { slug: true }
      }).then(subs => subs.map(s => s.slug!).filter(Boolean))

      const slug = createUniqueSlug(subcategory.name, existingSlugs)
      
      await prisma.subcategory.update({
        where: { id: subcategory.id },
        data: { slug }
      })
    }
  }

  console.log('✅ Slug\'и сгенерированы!')
}

generateSlugs()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Шаг 3: Создать новые маршруты с правильной URL-структурой

Нужно создать следующие маршруты:

1. `/freelancer/[id]/[slug]/page.tsx` - Профиль исполнителя
2. `/customer/[id]/[slug]/page.tsx` - Профиль заказчика  
3. `/task/[id]/[slug]/page.tsx` - Страница задачи
4. `/category/[slug]/page.tsx` - Категория
5. `/category/[slug]/[subslug]/page.tsx` - Подкатегория

### Шаг 4: Интегрировать аналитику

Добавить Google Analytics 4 и Yandex Metrika в `src/app/layout.tsx`.

### Шаг 5: Автоматическая генерация slug'ов при создании

Обновить API endpoints для автоматической генерации slug'ов:
- При создании задачи
- При обновлении профиля пользователя
- При создании/обновлении категории

## 📝 Важные замечания

1. **Миграция данных**: После применения миграции Prisma, обязательно запустите скрипт генерации slug'ов для существующих данных.

2. **Автоматическая генерация**: В будущем slug'и должны генерироваться автоматически при создании/обновлении записей.

3. **Редиректы**: После перехода на новую URL-структуру, старые URL должны редиректиться на новые (301 редирект).

4. **Sitemap обновление**: Sitemap файлы обновляются автоматически каждые 12-24 часа благодаря кешированию.

## 🔗 Ссылки на файлы

- Утилиты slugify: `src/lib/seo/slugify.ts`
- Метатеги: `src/lib/seo/metaTags.ts`
- Schema.org: `src/lib/seo/schemaOrg.ts`
- Компоненты: `src/components/seo/`
- Sitemap: `src/app/sitemap-*.ts` и `src/app/api/sitemap-*/route.ts`
- Robots: `src/app/robots.ts`

