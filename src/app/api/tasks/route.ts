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
        ...(subcategoryId ? { subcategoryId } : {}),
      },
      orderBy: { createdAt: sort },
      include: {
        customer: {
          select: { fullName: true },
        },
        files: true, // 🔥 теперь будем подтягивать файлы
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

    // сначала создаём задачу
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price,
        deadline,
        customerId: user.id,
        subcategoryId,
      },
    })

    // сохраняем файлы
    const files = formData.getAll('files')
    for (const entry of files) {
      if (entry instanceof File) {
        const buffer = Buffer.from(await entry.arrayBuffer())
        await prisma.file.create({
          data: {
            filename: entry.name,
            mimetype: entry.type,
            size: entry.size,
            data: buffer,
            task: { connect: { id: task.id } },
          },
        })
      }
    }

    const taskWithFiles = await prisma.task.findUnique({
      where: { id: task.id },
      include: { files: true },
    })

    return NextResponse.json({ task: taskWithFiles })
  } catch (err) {
    console.error('Ошибка при создании задачи:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
