/**
 * Страница категории с SEO
 * URL: /category/{slug}/
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { generateCategoryMeta } from '@/lib/seo/metaTags'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name: { contains: slug, mode: 'insensitive' } },
        ],
      },
      include: {
        subcategories: true,
      },
    })

    if (!category) {
      return {}
    }

    // Подсчитываем количество исполнителей в категории
    const freelancersCount = await prisma.user.count({
      where: {
        role: 'executor',
        blocked: false,
        verified: true,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/category/${slug}`

    return generateCategoryMeta(category.name, freelancersCount, url)
  } catch (error) {
    return {}
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  
  try {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name: { contains: slug, mode: 'insensitive' } },
        ],
      },
      include: {
        subcategories: {
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
        },
      },
    })

    if (!category) {
      notFound()
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/category/${slug}`

    // SEO-контент для категории
    const description = `Найдите лучших специалистов по ${category.name.toLowerCase()} на платформе NESI. Проверенные фрилансеры, сертификация навыков, безопасные сделки.`
    
    const faqContent = `В категории ${category.name} вы найдете профессиональных специалистов с сертификацией. Все исполнители проходят проверку и имеют подтвержденные навыки.`

    return (
      <>
        <CanonicalUrl url={url} />

        <div className="container mx-auto px-4 py-8">
          {/* H1 */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Фрилансеры категории {category.name}
          </h1>

          {/* Краткое описание */}
          <p className="text-gray-300 text-lg mb-8 max-w-3xl">
            {description}
          </p>

          {/* H2: Топ исполнителей */}
          <h2 className="text-2xl font-semibold text-white mb-6">
            Топ исполнителей
          </h2>
          
          {/* Здесь будет список исполнителей */}
          <div className="bg-black/40 rounded-xl p-6 mb-8">
            <p className="text-gray-400">Список исполнителей будет здесь</p>
          </div>

          {/* H2: Популярные услуги */}
          <h2 className="text-2xl font-semibold text-white mb-6">
            Популярные услуги
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {category.subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/category/${slug}/${subcategory.slug || subcategory.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-black/40 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  {subcategory.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  {subcategory._count.tasks} открытых задач
                </p>
              </Link>
            ))}
          </div>

          {/* H2: FAQ */}
          <h2 className="text-2xl font-semibold text-white mb-6">
            FAQ
          </h2>

          <div className="bg-black/40 rounded-xl p-6">
            <p className="text-gray-300 leading-relaxed">
              {faqContent}
            </p>
          </div>
        </div>
      </>
    )
  } catch (error) {
    notFound()
  }
}

