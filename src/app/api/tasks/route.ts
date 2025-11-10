import type { Prisma } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'

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
		const dateFilter = searchParams.get('dateFilter') || ''
		const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined
		const hasFiles = searchParams.get('hasFiles')
		const minResponses = searchParams.get('minResponses') ? parseInt(searchParams.get('minResponses')!, 10) : undefined
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
		const skip = (page - 1) * limit

		// Формируем условия where
		const where: Prisma.TaskWhereInput = {
			...(mine ? { customerId: user.id } : {}),
		}

		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		if (status) {
			where.status = status
		}

		if (subcategoryId) {
			where.subcategoryId = subcategoryId
		}

		// Фильтр по дате создания
		if (dateFilter) {
			const now = new Date()
			let startDate: Date

			switch (dateFilter) {
				case 'today':
					startDate = new Date(now.setHours(0, 0, 0, 0))
					break
				case 'week':
					startDate = new Date(now)
					startDate.setDate(now.getDate() - 7)
					break
				case 'month':
					startDate = new Date(now)
					startDate.setMonth(now.getMonth() - 1)
					break
				case 'year':
					startDate = new Date(now)
					startDate.setFullYear(now.getFullYear() - 1)
					break
				default:
					startDate = new Date(0) // Все время
			}

			if (dateFilter !== '') {
				where.createdAt = {
					gte: startDate,
				}
			}
		}

		// Фильтр по цене
		if (minPrice !== undefined || maxPrice !== undefined) {
			const priceFilter: Prisma.DecimalFilter = {}
			if (minPrice !== undefined) priceFilter.gte = minPrice
			if (maxPrice !== undefined) priceFilter.lte = maxPrice
			where.price = priceFilter
		}

		// Фильтр по наличию дедлайна
		if (hasDeadline === 'true') {
			where.deadline = { not: null }
		} else if (hasDeadline === 'false') {
			where.deadline = null
		}

		// Фильтр по рейтингу заказчика
		if (minRating !== undefined) {
			where.customer = {
				is: {
					avgRating: {
						gte: minRating,
					},
				},
			}
		}

		// Фильтр по наличию файлов
		if (hasFiles === 'true') {
			where.files = {
				some: {},
			}
		} else if (hasFiles === 'false') {
			where.files = {
				none: {},
			}
		}

		// Фильтр по количеству откликов будет применен после получения данных
		// (Prisma не поддерживает фильтрацию по _count напрямую)

		// Фильтр по категории через subcategory
		if (categoryId && !subcategoryId) {
			where.subcategory = {
				is: {
					categoryId,
				},
			}
		}

		// Определяем сортировку
		let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'desc' }
		
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

		const orderByClauses: Prisma.TaskOrderByWithRelationInput[] = mine
			? [{ kanbanColumn: 'asc' }, { kanbanOrder: 'asc' }, orderBy]
			: [orderBy]

		const [tasks, total] = await Promise.all([
			prisma.task.findMany({
				where,
				orderBy: orderByClauses,
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
					kanbanColumn: true,
					kanbanOrder: true,
					customer: { 
						select: { 
							id: true, 
							fullName: true,
							avgRating: true,
						} 
					},
					executor: {
						select: {
							id: true,
							fullName: true,
							email: true,
						},
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

		// Фильтруем по количеству откликов (после получения данных, так как Prisma не поддерживает фильтрацию по _count)
		let filteredTasks = tasks
		if (minResponses !== undefined) {
			filteredTasks = tasks.filter(task => task._count.responses >= minResponses)
		}

		// Если нужна сортировка по откликам, делаем это на стороне сервера
		let sortedTasks = filteredTasks
		if (sortParam === 'responses') {
			sortedTasks = [...filteredTasks].sort((a, b) => b._count.responses - a._count.responses)
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
		const { sanitizeText, validateStringLength, normalizeFileName, isValidFileName } = await import('@/lib/security')
		const { validateFile } = await import('@/lib/fileValidation')

		const formData = await req.formData()

		const title = formData.get('title')?.toString() || ''
		const description = formData.get('description')?.toString() || ''
		const price = formData.get('price') ? Number(formData.get('price')) : null
		const deadline = formData.get('deadline')
			? new Date(formData.get('deadline')!.toString())
			: null
		const subcategoryId = formData.get('subcategoryId')?.toString() || null

		// Валидация заголовка
		const titleValidation = validateStringLength(title.trim(), 200, 'Заголовок')
		if (!titleValidation.valid || !title.trim()) {
			return NextResponse.json(
				{ error: titleValidation.error || 'Заполни заголовок' },
				{ status: 400 }
			)
		}

		// Валидация описания
		const descriptionValidation = validateStringLength(description.trim(), 5000, 'Описание')
		if (!descriptionValidation.valid || !description.trim()) {
			return NextResponse.json(
				{ error: descriptionValidation.error || 'Заполни описание' },
				{ status: 400 }
			)
		}

		// Санитизация текста
		const sanitizedTitle = sanitizeText(title.trim())
		const sanitizedDescription = sanitizeText(description.trim())

		// Валидация и обработка файлов
		const files = formData.getAll('files') as File[]
		const validatedFiles = []

		for (const file of files) {
			if (!(file instanceof File) || file.size === 0) continue

			// Проверка имени файла
			if (!isValidFileName(file.name)) {
				return NextResponse.json(
					{ error: `Недопустимое имя файла: ${file.name}` },
					{ status: 400 }
				)
			}

			// Валидация файла
			const fileValidation = await validateFile(file, true)
			if (!fileValidation.valid) {
				return NextResponse.json(
					{ error: fileValidation.error || 'Ошибка валидации файла' },
					{ status: 400 }
				)
			}

			const buffer = Buffer.from(await file.arrayBuffer())
			const safeFileName = normalizeFileName(file.name)
			const mimeType = fileValidation.detectedMimeType || file.type

			validatedFiles.push({
				filename: safeFileName,
				mimetype: mimeType,
				size: file.size,
				data: buffer,
			})
		}

		const todoCount = await prisma.task.count({
			where: {
				customerId: user.id,
				kanbanColumn: 'TODO',
			},
		})

		const task = await prisma.task.create({
			data: {
				title: sanitizedTitle,
				description: sanitizedDescription,
				price,
				deadline,
				customerId: user.id,
				subcategoryId,
				kanbanColumn: 'TODO',
				kanbanOrder: todoCount,
				files: {
					create: validatedFiles,
				},
			},
			include: { files: true },
		})

		// ✅ Проверяем достижения для заказчика при создании задачи
		// Важно: проверяем после сохранения задачи в БД
		// ✅ Проверяем достижения после создания задачи (для заказчика)
		let awardedBadges: Array<{ id: string; name: string; icon: string; description?: string }> = []
		try {
			console.log(`[Badges] 🎯 Проверка достижений для заказчика ${user.id} после создания задачи ${task.id}`)
			const newBadges = await checkAndAwardBadges(user.id)
			if (newBadges.length > 0) {
				// Получаем полную информацию о достижениях (включая description)
				const badgeIds = newBadges.map(b => b.id)
				const fullBadges = await prisma.badge.findMany({
					where: { id: { in: badgeIds } },
					select: { id: true, name: true, icon: true, description: true }
				})
				awardedBadges = fullBadges.map(badge => ({
					id: badge.id,
					name: badge.name,
					icon: badge.icon,
					description: badge.description
				}))
				console.log(`[Badges] ✅ Заказчик ${user.id} получил ${awardedBadges.length} достижений при создании задачи:`, awardedBadges.map(b => b.name))
			} else {
				console.log(`[Badges] ℹ️ Заказчик ${user.id} не получил новых достижений при создании задачи`)
			}
		} catch (badgeError) {
			console.error('[Badges] ❌ Ошибка проверки достижений при создании задачи:', badgeError)
		}

		return NextResponse.json({ task, awardedBadges })
	} catch (err) {
		console.error('Ошибка при создании задачи:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
