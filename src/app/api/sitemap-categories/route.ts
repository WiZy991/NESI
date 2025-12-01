/**
 * API route для генерации sitemap категорий
 * Генерирует sitemap для всех категорий и подкатегорий
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
    
    // Получаем все категории с подкатегориями
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
      },
    })

    const urls: Array<{
      loc: string
      lastmod: string
      changefreq: 'weekly' | 'monthly'
      priority: number
    }> = []

    categories.forEach(category => {
      const categorySlug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-')
      
      // URL категории
      urls.push({
        loc: `${baseUrl}/category/${categorySlug}`,
        lastmod: category.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.8,
      })

      // URLs подкатегорий
      category.subcategories.forEach(subcategory => {
        const subcategorySlug = subcategory.slug || subcategory.name.toLowerCase().replace(/\s+/g, '-')
        urls.push({
          loc: `${baseUrl}/category/${categorySlug}/${subcategorySlug}`,
          lastmod: subcategory.updatedAt.toISOString(),
          changefreq: 'weekly',
          priority: 0.7,
        })
      })
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
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    })
  } catch (error) {
    console.error('Error generating categories sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

