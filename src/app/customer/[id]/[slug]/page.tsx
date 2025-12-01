/**
 * Страница профиля заказчика с SEO
 * URL: /customer/{id}/{seo-slug}/
 */

import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/seo/slugify'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import CustomerProfileRedirect from './CustomerProfileRedirect'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params
  
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        fullName: true,
        email: true,
        role: true,
        blocked: true,
        seoSlug: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    })

    if (!user || user.role !== 'customer' || user.blocked) {
      return {}
    }

    const expectedSlug = user.seoSlug || slugify(user.fullName || user.email || '')
    if (slug !== expectedSlug) {
      return {}
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/customer/${id}/${slug}`
    const name = user.fullName || user.email || 'Заказчик'

    return {
      title: `${name} — Заказчик | NESI`,
      description: `${name} — заказчик на платформе NESI. Создано задач: ${user._count.tasks || 0}.`,
      openGraph: {
        type: 'profile',
        title: `${name} — Заказчик`,
        description: `Создано задач: ${user._count.tasks || 0}`,
        url,
      },
      twitter: {
        card: 'summary',
        title: `${name} — Заказчик`,
        description: `Создано задач: ${user._count.tasks || 0}`,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    return {}
  }
}

export default async function CustomerProfilePage({ params }: PageProps) {
  const { id, slug } = await params
  
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        blocked: true,
        fullName: true,
        email: true,
        seoSlug: true,
      },
    })

    if (!user || user.role !== 'customer' || user.blocked) {
      notFound()
    }

    const expectedSlug = user.seoSlug || slugify(user.fullName || user.email || '')
    if (slug !== expectedSlug) {
      redirect(`/customer/${id}/${expectedSlug}`)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/customer/${id}/${slug}`

    // Редирект на существующую страницу профиля
    return (
      <>
        <CanonicalUrl url={url} />
        <CustomerProfileRedirect userId={id} />
      </>
    )
  } catch (error) {
    notFound()
  }
}

