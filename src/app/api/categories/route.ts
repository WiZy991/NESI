// /api/categories/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true },
    })

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('Ошибка при получении категорий:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
