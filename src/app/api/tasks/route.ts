import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
		const mine = searchParams.get('mine') === 'true'
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50) // Максимум 50
		const skip = (page - 1) * limit

		const tasks = await prisma.task.findMany({
			where: {
				...(mine ? { customerId: user.id } : {}),
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
			skip,
			take: limit,
			select: {
				id: true,
				title: true,
				description: true,
				price: true,
				deadline: true,
				status: true,
				createdAt: true,
				customer: { select: { id: true, fullName: true } },
				files: {
					select: { id: true, filename: true, mimetype: true, size: true },
				},
				_count: { select: { responses: true } },
			},
		})

		// Получаем общее количество для пагинации
		const total = await prisma.task.count({
			where: {
				...(mine ? { customerId: user.id } : {}),
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
		})

		const response = NextResponse.json({
			tasks,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})

		// Кеширование для публичных данных на 5 минут
		if (!mine && !search) {
			response.headers.set(
				'Cache-Control',
				'public, s-maxage=300, stale-while-revalidate=600'
			)
		}

		return response
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
							.filter(f => f instanceof File)
							.map(async file => {
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
