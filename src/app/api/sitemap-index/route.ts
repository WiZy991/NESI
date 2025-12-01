/**
 * API route для генерации sitemap index
 * Доступен по адресу: /api/sitemap-index
 * Редиректит на /sitemap-index.xml
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  
  // Редирект на правильный путь
  return NextResponse.redirect(`${baseUrl}/sitemap-index.xml`, 301)
}

