/**
 * Генераторы Schema.org JSON-LD разметки для SEO
 */

export interface PersonSchema {
  name: string
  jobTitle: string
  image?: string
  description?: string
  skills?: string[]
  url: string
  rating?: number
  reviewCount?: number
  minPrice?: number
}

export interface JobPostingSchema {
  title: string
  description: string
  datePosted: string
  skills?: string[]
  budget: number
  currency?: string
}

export interface ReviewSchema {
  author: string
  reviewBody: string
  ratingValue: number
}

/**
 * Генерирует Schema.org разметку для профиля исполнителя (Person)
 */
export function generatePersonSchema(data: PersonSchema): object {
  const schema: any = {
    '@context': 'https://schema.org/',
    '@type': 'Person',
    name: data.name,
    jobTitle: data.jobTitle,
    url: data.url,
  }

  if (data.image) {
    schema.image = data.image
  }

  if (data.description) {
    schema.description = data.description
  }

  if (data.skills && data.skills.length > 0) {
    schema.skill = data.skills
  }

  if (data.rating !== undefined && data.reviewCount !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating,
      reviewCount: data.reviewCount,
    }
  }

  if (data.minPrice !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'RUB',
      price: data.minPrice,
      availability: 'https://schema.org/InStock',
    }
  }

  return schema
}

/**
 * Генерирует Schema.org разметку для страницы задачи (JobPosting)
 */
export function generateJobPostingSchema(data: JobPostingSchema): object {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: data.title,
    description: data.description,
    datePosted: data.datePosted,
    employmentType: 'contract',
    jobLocationType: 'TELECOMMUTE',
    ...(data.skills && data.skills.length > 0 && { skills: data.skills.join(', ') }),
    hiringOrganization: {
      '@type': 'Organization',
      name: 'NESI',
      sameAs: baseUrl,
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: data.currency || 'RUB',
      value: {
        '@type': 'QuantitativeValue',
        value: data.budget,
      },
    },
  }
}

/**
 * Генерирует Schema.org разметку для отзыва (Review)
 */
export function generateReviewSchema(data: ReviewSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: data.author,
    },
    reviewBody: data.reviewBody,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: data.ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
  }
}

/**
 * Генерирует массив Schema.org разметки для нескольких отзывов
 */
export function generateReviewsSchema(reviews: ReviewSchema[]): object[] {
  return reviews.map(review => generateReviewSchema(review))
}

/**
 * Компонент React для встраивания JSON-LD в <head>
 */
export function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/**
 * Компонент для встраивания нескольких JSON-LD схем
 */
export function JsonLdScripts({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <JsonLdScript key={index} data={schema} />
      ))}
    </>
  )
}

