/**
 * API route для генерации sitemap задач
 * Генерирует sitemap для всех открытых задач
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    
    // Получаем все открытые задачи
    const tasks = await prisma.task.findMany({
      where: {
        status: 'open',
      },
      select: {
        id: true,
        title: true,
        seoSlug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50000, // Ограничение для производительности
    })

    const urls = tasks.map(task => {
      const slug = task.seoSlug || task.title.toLowerCase().replace(/\s+/g, '-') || task.id
      return {
        loc: `${baseUrl}/task/${task.id}/${slug}`,
        lastmod: task.updatedAt.toISOString(),
        changefreq: 'daily' as const,
        priority: 0.9,
      }
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating tasks sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

