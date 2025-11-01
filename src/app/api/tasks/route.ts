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
		const sortParam = searchParams.get('sort') || 'new'
		const subcategoryId = searchParams.get('subcategory') || undefined
		const categoryId = searchParams.get('category') || undefined
		const mine = searchParams.get('mine') === 'true'
		const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
		const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
		const hasDeadline = searchParams.get('hasDeadline')
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
		const skip = (page - 1) * limit

		// Формируем условия where
		const where: any = {
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
			...(subcategoryId ? { subcategoryId } : {}),
		}

		// Фильтр по цене
		if (minPrice !== undefined || maxPrice !== undefined) {
			where.price = {}
			if (minPrice !== undefined) where.price.gte = minPrice
			if (maxPrice !== undefined) where.price.lte = maxPrice
		}

		// Фильтр по наличию дедлайна
		if (hasDeadline === 'true') {
			where.deadline = { not: null }
		} else if (hasDeadline === 'false') {
			where.deadline = null
		}

		// Фильтр по категории через subcategory
		if (categoryId && !subcategoryId) {
			where.subcategory = {
				categoryId,
			}
		}

		// Определяем сортировку
		let orderBy: any = { createdAt: 'desc' }
		
		switch (sortParam) {
			case 'old':
				orderBy = { createdAt: 'asc' }
				break
			case 'price_asc':
				orderBy = { price: 'asc' }
				break
			case 'price_desc':
				orderBy = { price: 'desc' }
				break
			case 'deadline':
				orderBy = { deadline: 'asc' }
				break
			case 'responses':
				// Сортировка по количеству откликов (через _count) не поддерживается напрямую
				// Будем использовать сортировку на стороне клиента или raw SQL
				orderBy = { createdAt: 'desc' }
				break
			default:
				orderBy = { createdAt: 'desc' }
		}

		const [tasks, total] = await Promise.all([
			prisma.task.findMany({
				where,
				orderBy,
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
					customer: { 
						select: { 
							id: true, 
							fullName: true,
							avgRating: true,
						} 
					},
					subcategory: {
						select: {
							id: true,
							name: true,
							category: { select: { id: true, name: true } },
						},
					},
					files: {
						select: { id: true, filename: true, mimetype: true, size: true },
					},
					_count: { select: { responses: true } },
				},
			}),
			prisma.task.count({ where }),
		])

		// Если нужна сортировка по откликам, делаем это на стороне сервера
		let sortedTasks = tasks
		if (sortParam === 'responses') {
			sortedTasks = [...tasks].sort((a, b) => b._count.responses - a._count.responses)
		}

		const response = NextResponse.json({
			tasks: sortedTasks,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})

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
									data: buffer,
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
