import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)

    const search = searchParams.get('search')?.toLowerCase()
    const status = searchParams.get('status') || undefined
    const minPrice = parseInt(searchParams.get('minPrice') || '', 10)
    const maxPrice = parseInt(searchParams.get('maxPrice') || '', 10)
    const sort = searchParams.get('sort') === 'old' ? 'asc' : 'desc'
    const subcategoryId = searchParams.get('subcategory') || undefined  // 🛠 исправлено

    const tasks = await prisma.task.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(isFinite(minPrice) ? { price: { gte: minPrice } } : {}),
        ...(isFinite(maxPrice) ? { price: { lte: maxPrice } } : {}),
        ...(subcategoryId ? { subcategoryId } : {}), // 🎯 теперь сработает
      },
      orderBy: { createdAt: sort },
      include: {
        customer: {
          select: { fullName: true },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (err) {
    console.error('Ошибка при фильтрации задач:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Только заказчики могут создавать задачи' }, { status: 403 })
  }

  try {
    const { title, description, price, deadline, subcategoryId } = await req.json()

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Заполни заголовок и описание' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: price ?? null,
        deadline: deadline ? new Date(deadline) : null,
        customerId: user.id,
        subcategoryId: subcategoryId || null,
      },
    })

    return NextResponse.json({ task })
  } catch (err) {
    console.error('Ошибка при создании задачи:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
