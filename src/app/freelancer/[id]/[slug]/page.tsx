/**
 * Страница профиля фрилансера с SEO
 * URL: /freelancer/{id}/{seo-slug}/
 */

import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { generateFreelancerMeta } from '@/lib/seo/metaTags'
import { generatePersonSchema } from '@/lib/seo/schemaOrg'
import { JsonLdScript } from '@/lib/seo/schemaOrg'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import { slugify } from '@/lib/seo/slugify'
import FreelancerProfileRedirect from './FreelancerProfileRedirect'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
}

// Генерация метатегов
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params
  
  try {
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
    const expectedSlug = user.seoSlug || slugify(user.fullName || user.email || '')
    if (slug !== expectedSlug) {
      return {}
    }

    const specialization = user.skills?.[0] || 'Специалист'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/freelancer/${id}/${slug}`
    
    // Вычисляем рейтинг
    const avgRatingResult = await prisma.review.aggregate({
      where: { toUserId: id },
      _avg: { rating: true },
    })
    const avgRating = avgRatingResult._avg.rating || 0

    return generateFreelancerMeta(
      user.fullName || user.email || 'Исполнитель',
      specialization,
      avgRating,
      0, // minPrice будет вычисляться отдельно если нужно
      user._count.executedTasks || 0,
      specialization,
      user.avatarFileId ? `${baseUrl}/api/files/${user.avatarFileId}` : undefined,
      url
    )
  } catch (error) {
    return {}
  }
}

export default async function FreelancerProfilePage({ params }: PageProps) {
  const { id, slug } = await params
  
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        blocked: true,
        fullName: true,
        email: true,
        seoSlug: true,
      },
    })

    if (!user || user.role !== 'executor' || user.blocked) {
      notFound()
    }

    // Проверяем slug
    const expectedSlug = user.seoSlug || slugify(user.fullName || user.email || '')
    if (slug !== expectedSlug) {
      // Редирект на правильный slug
      redirect(`/freelancer/${id}/${expectedSlug}`)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/freelancer/${id}/${slug}`

    // Загружаем данные для Schema.org
    const [fullUser, reviews, avgRatingResult] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          fullName: true,
          email: true,
          description: true,
          skills: true,
          avatarFileId: true,
          _count: {
            select: {
              reviewsReceived: true,
            },
          },
        },
      }),
      prisma.review.findMany({
        where: { toUserId: id },
        include: {
          fromUser: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        take: 5,
      }),
      prisma.review.aggregate({
        where: { toUserId: id },
        _avg: { rating: true },
        _count: true,
      }),
    ])

    if (!fullUser) {
      notFound()
    }

    const specialization = fullUser.skills?.[0] || 'Специалист'
    const avgRating = avgRatingResult._avg.rating || 0

    // Schema.org разметка
    const personSchema = generatePersonSchema({
      name: fullUser.fullName || fullUser.email || 'Исполнитель',
      jobTitle: specialization,
      image: fullUser.avatarFileId ? `${baseUrl}/api/files/${fullUser.avatarFileId}` : undefined,
      description: fullUser.description || undefined,
      skills: fullUser.skills || [],
      url,
      rating: avgRating,
      reviewCount: avgRatingResult._count || 0,
    })

    // Используем клиентский компонент для отображения профиля
    // SEO метатеги уже добавлены через generateMetadata
    return (
      <>
        {/* Schema.org JSON-LD */}
        <JsonLdScript data={personSchema} />

        {/* Canonical URL */}
        <CanonicalUrl url={url} />

        {/* Редирект на существующую страницу профиля */}
        <FreelancerProfileRedirect userId={id} />
      </>
    )
  } catch (error) {
    notFound()
  }
}

