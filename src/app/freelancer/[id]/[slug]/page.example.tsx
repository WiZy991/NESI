/**
 * Пример страницы профиля фрилансера с SEO
 * URL: /freelancer/{id}/{seo-slug}/
 * 
 * Этот файл - шаблон. После интеграции можно использовать как основу для реальной страницы.
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { generateFreelancerMeta } from '@/lib/seo/metaTags'
import { generatePersonSchema } from '@/lib/seo/schemaOrg'
import { JsonLdScript } from '@/lib/seo/schemaOrg'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import { slugify } from '@/lib/seo/slugify'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
}

// Генерация метатегов
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      level: true,
      _count: {
        select: {
          executedTasks: true,
          reviewsReceived: true,
        },
      },
    },
  })

  if (!user || user.role !== 'executor' || user.blocked) {
    return {}
  }

  // Проверяем, что slug совпадает
  const expectedSlug = user.seoSlug || slugify(user.fullName || user.email)
  if (slug !== expectedSlug) {
    notFound()
  }

  const specialization = user.skills?.[0] || 'Специалист'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  const url = `${baseUrl}/freelancer/${id}/${slug}`

  return generateFreelancerMeta(
    user.fullName || user.email,
    specialization,
    user.avgRating || 0,
    Number(user.balance) || 0,
    user._count.executedTasks || 0,
    specialization,
    user.avatarUrl || undefined,
    url
  )
}

export default async function FreelancerProfilePage({ params }: PageProps) {
  const { id, slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      level: true,
      reviewsReceived: {
        include: {
          fromUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 10,
      },
      _count: {
        select: {
          executedTasks: true,
          reviewsReceived: true,
        },
      },
    },
  })

  if (!user || user.role !== 'executor' || user.blocked) {
    notFound()
  }

  // Проверяем slug
  const expectedSlug = user.seoSlug || slugify(user.fullName || user.email)
  if (slug !== expectedSlug) {
    notFound()
  }

  const specialization = user.skills?.[0] || 'Специалист'
  const url = `${baseUrl}/freelancer/${id}/${slug}`

  // Schema.org разметка
  const personSchema = generatePersonSchema({
    name: user.fullName || user.email,
    jobTitle: specialization,
    image: user.avatarUrl || undefined,
    description: user.description || undefined,
    skills: user.skills || [],
    url,
    rating: user.avgRating || 0,
    reviewCount: user._count.reviewsReceived || 0,
    minPrice: Number(user.balance) || 0,
  })

  // Schema.org для отзывов
  const reviewSchemas = user.reviewsReceived.map(review => ({
    author: review.fromUser?.fullName || review.fromUser?.email || 'Аноним',
    reviewBody: review.comment,
    ratingValue: review.rating,
  }))

  return (
    <>
      {/* Schema.org JSON-LD */}
      <JsonLdScript data={personSchema} />
      {reviewSchemas.length > 0 && (
        <>
          {reviewSchemas.map((review, index) => (
            <JsonLdScript key={index} data={review} />
          ))}
        </>
      )}

      {/* Canonical URL */}
      <CanonicalUrl url={url} />

      {/* Контент страницы */}
      <div className="container mx-auto px-4 py-8">
        <h1>{user.fullName || user.email} — {specialization}</h1>
        
        {/* Остальной контент профиля */}
        {/* Используйте существующий компонент ProfilePageContent или создайте новый */}
      </div>
    </>
  )
}

