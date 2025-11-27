# 📄 ШАБЛОН СТРАНИЦЫ КАТЕГОРИИ

## Пример: src/app/tasks/development/page.tsx

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

// Конфигурация категорий
const CATEGORIES = {
  development: {
    name: 'Разработка',
    description: 'Задачи по разработке программного обеспечения',
    slug: 'development',
    keywords: ['разработка', 'программирование', 'код', 'разработчик'],
  },
  design: {
    name: 'Дизайн',
    description: 'Задачи по дизайну интерфейсов и графики',
    slug: 'design',
    keywords: ['дизайн', 'ui', 'ux', 'графика'],
  },
  // ... другие категории
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map(slug => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const category = CATEGORIES[params.slug as keyof typeof CATEGORIES]
  if (!category) return {}

  return {
    title: `${category.name} — Фриланс задачи и проекты | NESI`,
    description: `Каталог задач по ${category.name.toLowerCase()} на платформе NESI. Найдите удаленную работу в области ${category.name.toLowerCase()}. Безопасные платежи, система эскроу.`,
    keywords: [
      ...category.keywords,
      'фриланс',
      'удаленная работа',
      'каталог задач',
      'найти работу',
    ],
    openGraph: {
      title: `${category.name} — Фриланс задачи и проекты`,
      description: `Каталог задач по ${category.name.toLowerCase()} на платформе NESI.`,
      type: 'website',
    },
    alternates: {
      canonical: `/tasks/${category.slug}`,
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = CATEGORIES[params.slug as keyof typeof CATEGORIES]
  if (!category) notFound()

  // Получаем задачи категории
  const tasks = await prisma.task.findMany({
    where: {
      status: 'open',
      subcategory: {
        category: {
          name: {
            contains: category.name,
            mode: 'insensitive',
          },
        },
      },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { fullName: true } },
      subcategory: {
        include: { category: true },
      },
    },
  })

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="mb-6" aria-label="Хлебные крошки">
        <ol className="flex items-center gap-2 text-sm text-gray-400">
          <li><Link href="/" className="hover:text-emerald-400">Главная</Link></li>
          <li>/</li>
          <li><Link href="/tasks" className="hover:text-emerald-400">Каталог задач</Link></li>
          <li>/</li>
          <li className="text-emerald-400">{category.name}</li>
        </ol>
      </nav>

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-6">
        Задачи по {category.name.toLowerCase()}
      </h1>

      {/* SEO-текст */}
      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-6 mb-8">
        <p className="text-gray-300 leading-relaxed mb-4">
          Каталог задач по {category.name.toLowerCase()} на платформе NESI. 
          Здесь вы найдете проекты для разработчиков, дизайнеров и других специалистов 
          в области {category.name.toLowerCase()}. Все задачи проверены модераторами, 
          условия прозрачны, платежи безопасны.
        </p>
        <h2 className="text-xl font-semibold text-emerald-300 mb-3">
          Популярные подкатегории
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li>Веб-разработка</li>
          <li>Мобильная разработка</li>
          <li>Backend разработка</li>
        </ul>
      </div>

      {/* FAQ */}
      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-emerald-300 mb-4">
          Часто задаваемые вопросы
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">
              Как найти задачу по {category.name.toLowerCase()}?
            </h3>
            <p className="text-gray-300">
              Используйте фильтры на странице каталога задач. Выберите категорию 
              "{category.name}" и просмотрите доступные проекты.
            </p>
          </div>
          {/* ... еще вопросы */}
        </div>
      </div>

      {/* Список задач */}
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-black/40 border border-emerald-500/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              <Link href={`/tasks/${task.id}`} className="hover:text-emerald-400">
                {task.title}
              </Link>
            </h3>
            <p className="text-gray-300 text-sm mb-2">{task.description}</p>
            {task.price && (
              <p className="text-emerald-400 font-semibold">{task.price} ₽</p>
            )}
          </div>
        ))}
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `Задачи по ${category.name.toLowerCase()}`,
            description: `Каталог задач по ${category.name.toLowerCase()} на платформе NESI`,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks/${category.slug}`,
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Главная',
                  item: process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Каталог задач',
                  item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks`,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: category.name,
                  item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks/${category.slug}`,
                },
              ],
            },
          }),
        }}
      />
    </>
  )
}
```

---

## Конфигурация всех категорий

Создать файл: `src/lib/seo/categories.ts`

```typescript
export const TASK_CATEGORIES = {
  development: {
    name: 'Разработка',
    slug: 'development',
    description: 'Задачи по разработке программного обеспечения',
    keywords: ['разработка', 'программирование', 'код'],
  },
  design: {
    name: 'Дизайн',
    slug: 'design',
    description: 'Задачи по дизайну интерфейсов и графики',
    keywords: ['дизайн', 'ui', 'ux'],
  },
  // ... остальные
}

export const SPECIALIST_CATEGORIES = {
  // аналогично
}
```

