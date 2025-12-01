/**
 * Страница подкатегории с SEO
 * URL: /category/{slug}/{subslug}/
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { generateCategoryMeta } from '@/lib/seo/metaTags'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string; subslug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subslug } = await params
  
  try {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name: { contains: slug, mode: 'insensitive' } },
        ],
      },
    })

    if (!category) {
      return {}
    }

    const subcategory = await prisma.subcategory.findFirst({
      where: {
        categoryId: category.id,
        OR: [
          { slug: subslug },
          { name: { contains: subslug, mode: 'insensitive' } },
        ],
      },
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: 'open',
              },
            },
          },
        },
      },
    })

    if (!subcategory) {
      return {}
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/category/${slug}/${subslug}`

    const title = `${subcategory.name} — ТОП фрилансеров | NESI`
    const description = `Подкатегория ${subcategory.name}. ${subcategory._count.tasks} открытых задач. Проверенные специалисты с сертификацией.`

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        url,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    return {}
  }
}

export default async function SubcategoryPage({ params }: PageProps) {
  const { slug, subslug } = await params
  
  try {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name: { contains: slug, mode: 'insensitive' } },
        ],
      },
    })

    if (!category) {
      notFound()
    }

    const subcategory = await prisma.subcategory.findFirst({
      where: {
        categoryId: category.id,
        OR: [
          { slug: subslug },
          { name: { contains: subslug, mode: 'insensitive' } },
        ],
      },
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: 'open',
              },
            },
          },
        },
      },
    })

    if (!subcategory) {
      notFound()
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/category/${slug}/${subslug}`

    // Получаем задачи этой подкатегории
    const tasks = await prisma.task.findMany({
      where: {
        subcategoryId: subcategory.id,
        status: 'open',
      },
      include: {
        customer: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    return (
      <>
        <CanonicalUrl url={url} />

        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-emerald-400 transition">
              Главная
            </Link>
            {' / '}
            <Link href={`/category/${slug}`} className="hover:text-emerald-400 transition">
              {category.name}
            </Link>
            {' / '}
            <span className="text-white">{subcategory.name}</span>
          </nav>

          {/* H1 */}
          <h1 className="text-4xl font-bold text-white mb-4">
            {subcategory.name} — ТОП фрилансеров
          </h1>

          {/* Краткое описание */}
          <p className="text-gray-300 text-lg mb-8 max-w-3xl">
            Найдите лучших специалистов по {subcategory.name.toLowerCase()} на платформе NESI. 
            Проверенные фрилансеры, сертификация навыков, безопасные сделки.
          </p>

          {/* Статистика */}
          <div className="bg-black/40 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  {subcategory._count.tasks}
                </div>
                <div className="text-gray-400">Открытых задач</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  От {Number(subcategory.minPrice)}₽
                </div>
                <div className="text-gray-400">Минимальная цена</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  ✓
                </div>
                <div className="text-gray-400">Сертификация доступна</div>
              </div>
            </div>
          </div>

          {/* H2: Задачи */}
          <h2 className="text-2xl font-semibold text-white mb-6">
            Открытые задачи
          </h2>

          {tasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="bg-black/40 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition"
                >
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {task.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                    {task.description}
                  </p>
                  {task.price && (
                    <div className="text-emerald-400 font-semibold">
                      {Number(task.price).toLocaleString('ru-RU')}₽
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-black/40 rounded-xl p-8 text-center mb-8">
              <p className="text-gray-400">Пока нет открытых задач</p>
            </div>
          )}

          {/* H2: FAQ */}
          <h2 className="text-2xl font-semibold text-white mb-6">
            FAQ
          </h2>

          <div className="bg-black/40 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Что включает услуга {subcategory.name.toLowerCase()}?
                </h3>
                <p className="text-gray-300 text-sm">
                  Наши специалисты предоставляют профессиональные услуги по {subcategory.name.toLowerCase()} 
                  с гарантией качества. Все исполнители проходят проверку и имеют подтвержденные навыки.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Как выбрать исполнителя?
                </h3>
                <p className="text-gray-300 text-sm">
                  Обращайте внимание на рейтинг, количество отзывов и портфолио. 
                  Рекомендуем выбирать исполнителей с сертификацией в этой подкатегории.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  } catch (error) {
    notFound()
  }
}

