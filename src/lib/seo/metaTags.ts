/**
 * Утилиты для генерации SEO метатегов
 */

import type { Metadata } from 'next'

export interface SEOData {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
}

/**
 * Генерирует метатеги для профиля исполнителя
 */
export function generateFreelancerMeta(
  name: string,
  specialization: string,
  rating: number,
  minPrice: number,
  worksCount: number,
  category: string,
  avatar?: string,
  url?: string
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  const fullUrl = url || `${baseUrl}/freelancer/${name}`
  const image = avatar || `${baseUrl}/og-image.png`
  
  const title = `${name} — ${specialization} | Рейтинг ${rating} | NESI`
  const description = `${name} — специалист категории ${category}. ${worksCount} выполненных проектов, рейтинг ${rating}. Цена от ${minPrice}₽. Наймите исполнителя на NESI.`

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      title,
      description: `Рейтинг ${rating}, цена от ${minPrice}₽`,
      images: [{ url: image }],
      url: fullUrl,
    },
    twitter: {
      card: 'summary',
      title,
      description: `Рейтинг ${rating}, цена от ${minPrice}₽`,
      images: [image],
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Генерирует метатеги для страницы задачи
 */
export function generateTaskMeta(
  title: string,
  budget: number,
  deadline?: string,
  description?: string,
  image?: string,
  url?: string
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  const fullUrl = url || `${baseUrl}/task/${title}`
  const ogImage = image || `${baseUrl}/og-image.png`
  
  const metaTitle = `${title} — бюджет ${budget}₽ | NESI`
  const metaDescription = description
    ? `Задача: ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}. ${deadline ? `Срок: ${deadline}. ` : ''}Бюджет: ${budget}₽. Наймите исполнителя на NESI.`
    : `Задача: ${title}. ${deadline ? `Срок: ${deadline}. ` : ''}Бюджет: ${budget}₽. Наймите исполнителя на NESI.`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      type: 'article',
      title,
      description: `Бюджет ${budget}₽`,
      images: [{ url: ogImage }],
      url: fullUrl,
      ...(deadline && { publishedTime: deadline }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Бюджет ${budget}₽`,
      images: [ogImage],
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Генерирует метатеги для категории
 */
export function generateCategoryMeta(
  categoryName: string,
  freelancersCount: number,
  url?: string
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  const fullUrl = url || `${baseUrl}/category/${categoryName}`
  
  const title = `Лучшие специалисты по ${categoryName} — ТОП фрилансеров | NESI`
  const description = `Категория ${categoryName}. ${freelancersCount} проверенных фрилансеров, прошедших сертификацию. Быстрый подбор специалиста.`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: fullUrl,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Генерирует метатеги для главной страницы
 */
export function generateHomeMeta(): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  
  const title = 'NESI — фриланс-платформа нового поколения'
  const description = 'На NESI вы найдёте проверенных исполнителей, сертификацию навыков, защищённые сделки и удобный чат.'

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: baseUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: baseUrl,
    },
  }
}

