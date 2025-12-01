/**
 * API route для генерации sitemap фрилансеров
 * Генерирует sitemap для всех публичных профилей исполнителей
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    
    // Получаем всех исполнителей с публичными профилями
    const freelancers = await prisma.user.findMany({
      where: {
        role: 'executor',
        blocked: false,
        verified: true,
      },
      select: {
        id: true,
        seoSlug: true,
        fullName: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    const urls = freelancers
      .filter(user => user.fullName) // Только с заполненным именем
      .map(user => {
        const slug = user.seoSlug || user.fullName?.toLowerCase().replace(/\s+/g, '-') || user.id
        return {
          loc: `${baseUrl}/freelancer/${user.id}/${slug}`,
          lastmod: user.updatedAt.toISOString(),
          changefreq: 'weekly' as const,
          priority: 0.8,
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
    console.error('Error generating freelancers sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

