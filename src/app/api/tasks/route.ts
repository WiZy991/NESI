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
    const subcategoryId = searchParams.get('subcategory') || undefined
    const mine = searchParams.get('mine') === 'true' // 👈 фильтр "мои задачи"

    const tasks = await prisma.task.findMany({
      where: {
        ...(mine ? { customerId: user.id } : {}), // ✅ отбираем только свои задачи
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
        ...(subcategoryId ? { subcategoryId } : {}),
      },
      orderBy: { createdAt: sort },
      include: {
        customer: { select: { fullName: true } },
        files: true, // 📎 включаем файлы
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
    return NextResponse.json(
      { error: 'Только заказчики могут создавать задачи' },
      { status: 403 }
    )
  }

  try {
    const formData = await req.formData()

    const title = formData.get('title')?.toString() || ''
    const description = formData.get('description')?.toString() || ''
    const price = formData.get('price') ? Number(formData.get('price')) : null
    const deadline = formData.get('deadline')
      ? new Date(formData.get('deadline')!.toString())
      : null
    const subcategoryId = formData.get('subcategoryId')?.toString() || null

    if (!title.trim() || !description.trim()) {
      return NextResponse.json(
        { error: 'Заполни заголовок и описание' },
        { status: 400 }
      )
    }

    // получаем все файлы
    const files = formData.getAll('files') as File[]

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price,
        deadline,
        customerId: user.id,
        subcategoryId,
        files: {
          create: await Promise.all(
            files
              .filter((f) => f instanceof File)
              .map(async (file) => {
                const buffer = Buffer.from(await file.arrayBuffer())
                return {
                  filename: file.name,
                  mimetype: file.type,
                  size: file.size,
                  data: buffer, // ⚠️ храним байты в БД
                }
              })
          ),
        },
      },
      include: { files: true },
    })

    return NextResponse.json({ task })
  } catch (err) {
    console.error('Ошибка при создании задачи:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
