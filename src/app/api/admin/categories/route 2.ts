import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
  const cats = await prisma.category.findMany({
    include: { subcategories: true },
  })
  return NextResponse.json(cats)
}

export async function PUT(req: Request) {
  const body = await req.json()
  const { id, minPrice } = body
  await prisma.subcategory.update({ where: { id }, data: { minPrice } })
  return NextResponse.json({ ok: true })
}
