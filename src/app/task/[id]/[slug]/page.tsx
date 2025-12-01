/**
 * Страница задачи с SEO
 * URL: /task/{id}/{seo-slug}/
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { generateTaskMeta } from '@/lib/seo/metaTags'
import { generateJobPostingSchema } from '@/lib/seo/schemaOrg'
import { JsonLdScript } from '@/lib/seo/schemaOrg'
import { CanonicalUrl } from '@/components/seo/CanonicalUrl'
import { slugify } from '@/lib/seo/slugify'
import TaskDetailPageContent from '@/components/TaskDetailPageContent'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params
  
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!task || task.status !== 'open') {
      return {}
    }

    // Проверяем slug
    const expectedSlug = task.seoSlug || slugify(task.title)
    if (slug !== expectedSlug) {
      return {}
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/task/${id}/${slug}`
    const budget = task.price ? Number(task.price) : 0
    const deadline = task.deadline ? task.deadline.toISOString() : undefined

    return generateTaskMeta(
      task.title,
      budget,
      deadline,
      task.description,
      undefined,
      url
    )
  } catch (error) {
    return {}
  }
}

export default async function TaskPage({ params }: PageProps) {
  const { id, slug } = await params
  
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        seoSlug: true,
        status: true,
      },
    })

    if (!task || task.status !== 'open') {
      notFound()
    }

    // Проверяем slug
    const expectedSlug = task.seoSlug || slugify(task.title)
    if (slug !== expectedSlug) {
      notFound()
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    const url = `${baseUrl}/task/${id}/${slug}`

    // Загружаем данные для Schema.org
    const fullTask = await prisma.task.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        price: true,
        deadline: true,
        createdAt: true,
        skillsRequired: true,
      },
    })

    if (!fullTask) {
      notFound()
    }

    const budget = fullTask.price ? Number(fullTask.price) : 0

    // Schema.org разметка
    const jobPostingSchema = generateJobPostingSchema({
      title: fullTask.title,
      description: fullTask.description,
      datePosted: fullTask.createdAt.toISOString(),
      skills: fullTask.skillsRequired || [],
      budget,
      currency: 'RUB',
    })

    return (
      <>
        {/* Schema.org JSON-LD */}
        <JsonLdScript data={jobPostingSchema} />

        {/* Canonical URL */}
        <CanonicalUrl url={url} />

        {/* Используем существующий компонент задачи */}
        <TaskDetailPageContent taskId={id} />
      </>
    )
  } catch (error) {
    notFound()
  }
}

