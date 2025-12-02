import { getUserFromRequest } from '@/lib/auth'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit'

export async function GET(req: Request) {
	const user = await getUserFromRequest(req).catch(() => null)
	// Разрешаем доступ для гостей (для просмотра задач)

	try {
		const { searchParams } = new URL(req.url)

		const search = searchParams.get('search')?.toLowerCase()
		const status = searchParams.get('status') || undefined
		const sortParam = searchParams.get('sort') || 'new'
		const subcategoryId = searchParams.get('subcategory') || undefined
		const categoryId = searchParams.get('category') || undefined
		const mine = searchParams.get('mine') === 'true'
		const minPrice = searchParams.get('minPrice')
			? parseFloat(searchParams.get('minPrice')!)
			: undefined
		const maxPrice = searchParams.get('maxPrice')
			? parseFloat(searchParams.get('maxPrice')!)
			: undefined
		const hasDeadline = searchParams.get('hasDeadline')
		const dateFilter = searchParams.get('dateFilter') || ''
		const minRating = searchParams.get('minRating')
			? parseFloat(searchParams.get('minRating')!)
			: undefined
		const hasFiles = searchParams.get('hasFiles')
		const minResponses = searchParams.get('minResponses')
			? parseInt(searchParams.get('minResponses')!, 10)
			: undefined
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
		const skip = (page - 1) * limit

		// Формируем условия where
		const where: Prisma.TaskWhereInput = {
			...(mine && user ? { customerId: user.id } : {}),
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

		const orderByClauses: Prisma.TaskOrderByWithRelationInput[] =
			mine && user
				? [{ kanbanColumn: 'asc' }, { kanbanOrder: 'asc' }, orderBy]
				: [orderBy]

		// Если используется фильтр по количеству откликов, нужно получить все задачи для корректной фильтрации
		const needsFullFetch = minResponses !== undefined || sortParam === 'responses'
		
		const selectFields = {
			id: true,
			title: true,
			description: true,
			price: true,
			escrowAmount: true,
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
				},
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
		}

		let tasks: any[]
		let total: number

		if (needsFullFetch) {
			// Получаем все задачи для корректной фильтрации и сортировки
			const allTasks = await prisma.task.findMany({
				where,
				orderBy: orderByClauses,
				select: selectFields,
			})

			// Фильтруем по количеству откликов
			let filteredTasks = allTasks
			if (minResponses !== undefined) {
				filteredTasks = allTasks.filter(
					task => task._count.responses >= minResponses
				)
			}

			// Сортируем по откликам если нужно
			let sortedTasks = filteredTasks
			if (sortParam === 'responses') {
				sortedTasks = [...filteredTasks].sort(
					(a, b) => b._count.responses - a._count.responses
				)
			}

			// Применяем пагинацию к отфильтрованным и отсортированным задачам
			total = sortedTasks.length
			tasks = sortedTasks.slice(skip, skip + limit)
		} else {
			// Обычный случай - получаем задачи с пагинацией
			const [fetchedTasks, fetchedTotal] = await Promise.all([
				prisma.task.findMany({
					where,
					orderBy: orderByClauses,
					skip,
					take: limit,
					select: selectFields,
				}),
				prisma.task.count({ where }),
			])
			tasks = fetchedTasks
			total = fetchedTotal
		}

		const response = NextResponse.json({
			tasks,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})

		if (!mine && !search && user) {
			response.headers.set(
				'Cache-Control',
				'public, s-maxage=300, stale-while-revalidate=600'
			)
		}

		return response
	} catch (err) {
		logger.error('Ошибка при фильтрации задач', err)
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

	// Rate limiting для создания задач
	const taskCreateRateLimit = createUserRateLimit({
		windowMs: 60 * 1000, // 1 минута
		maxRequests: 5, // Максимум 5 задач в минуту
	})
	const rateLimitResult = await taskCreateRateLimit(req)

	if (!rateLimitResult.success) {
		return NextResponse.json(
			{ error: 'Слишком много запросов на создание задач. Подождите немного.' },
			{
				status: 429,
				headers: {
					'Retry-After': Math.ceil(
						(rateLimitResult.resetTime - Date.now()) / 1000
					).toString(),
					'X-RateLimit-Limit': '5',
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
				},
			}
		)
	}

	try {
		const {
			sanitizeText,
			validateStringLength,
			normalizeFileName,
			isValidFileName,
		} = await import('@/lib/security')
		const { validateFile } = await import('@/lib/fileValidation')

		let formData: FormData
		try {
			formData = await req.formData()
		} catch (formDataError: any) {
			logger.error('Ошибка парсинга formData', formDataError, {
				userId: user.id,
				errorMessage: formDataError?.message,
			})
			return NextResponse.json(
				{ error: 'Ошибка обработки данных формы' },
				{ status: 400 }
			)
		}

		const title = formData.get('title')?.toString() || ''
		const description = formData.get('description')?.toString() || ''
		const price = formData.get('price') ? Number(formData.get('price')) : null
		const deadline = formData.get('deadline')
			? new Date(formData.get('deadline')!.toString())
			: null
		const subcategoryId = formData.get('subcategoryId')?.toString() || null
		const skillsRequiredJson = formData.get('skillsRequired')?.toString()
		let skillsRequired: string[] = []
		if (skillsRequiredJson) {
			try {
				skillsRequired = JSON.parse(skillsRequiredJson) as string[]
				// Валидация: убеждаемся, что это массив строк
				if (!Array.isArray(skillsRequired)) {
					skillsRequired = []
				} else {
					skillsRequired = skillsRequired.filter(skill => typeof skill === 'string' && skill.trim().length > 0)
				}
			} catch (parseError) {
				logger.warn('Ошибка парсинга skillsRequired', { error: parseError, json: skillsRequiredJson })
				skillsRequired = []
			}
		}

		// Валидация заголовка
		const titleValidation = validateStringLength(title.trim(), 200, 'Заголовок')
		if (!titleValidation.valid || !title.trim()) {
			return NextResponse.json(
				{ error: titleValidation.error || 'Заполни заголовок' },
				{ status: 400 }
			)
		}

		// Валидация описания
		const descriptionValidation = validateStringLength(
			description.trim(),
			5000,
			'Описание'
		)
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
			try {
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
			} catch (fileError: any) {
				logger.error('Ошибка обработки файла', fileError, {
					fileName: file?.name,
					fileSize: file?.size,
				})
				return NextResponse.json(
					{ error: `Ошибка обработки файла: ${file.name}` },
					{ status: 400 }
				)
			}
		}

		let todoCount = 0
		try {
			todoCount = await prisma.task.count({
				where: {
					customerId: user.id,
					kanbanColumn: 'TODO',
				},
			})
		} catch (countError: any) {
			logger.warn('Ошибка подсчета задач в TODO', countError)
			// Продолжаем с todoCount = 0
		}

		// Генерируем SEO slug для задачи
		const { slugify, createUniqueSlug } = await import('@/lib/seo/slugify')
		const existingTaskSlugs = await prisma.task.findMany({
			where: { seoSlug: { not: null } },
			select: { seoSlug: true },
		}).then(tasks => tasks.map(t => t.seoSlug!).filter(Boolean))
		const taskSlug = createUniqueSlug(sanitizedTitle, existingTaskSlugs)

		let task
		try {
			task = await prisma.task.create({
				data: {
					title: sanitizedTitle,
					seoSlug: taskSlug,
					description: sanitizedDescription,
					price,
					deadline,
					customerId: user.id,
					subcategoryId,
					skillsRequired,
					kanbanColumn: 'TODO',
					kanbanOrder: todoCount,
					files: {
						create: validatedFiles,
					},
				},
				include: { files: true },
			})
		} catch (createError: any) {
			logger.error('Ошибка создания задачи в БД', createError, {
				userId: user.id,
				title: sanitizedTitle,
				subcategoryId,
				skillsRequired,
				errorMessage: createError?.message,
				errorCode: createError?.code,
			})
			throw createError
		}

		// Отправляем уведомления исполнителям с нужными навыками (асинхронно, не блокируем ответ)
		if (skillsRequired.length > 0) {
			// Запускаем отправку уведомлений асинхронно, не ждем завершения
			Promise.resolve().then(async () => {
				try {
					// Находим всех исполнителей с хотя бы одним из требуемых навыков
					const executors = await prisma.user.findMany({
						where: {
							role: 'executor',
							skills: {
								hasSome: skillsRequired,
							},
						},
						select: {
							id: true,
							fullName: true,
							email: true,
						},
					})

					if (executors.length === 0) {
						logger.debug('Нет исполнителей с требуемыми навыками', {
							taskId: task.id,
							skillsRequired,
						})
						return
					}

					// Отправляем уведомления через SSE и создаем записи в БД
					const { sendNotificationToUser } = await import('@/app/api/notifications/stream/route')
					const { createNotification } = await import('@/lib/createNotification')

					for (const executor of executors) {
						try {
							// Создаем уведомление в БД
							await createNotification(
								executor.id,
								`Новая задача "${sanitizedTitle}" требует навыки, которые у вас есть!`,
								`/tasks/${task.id}`,
								'newTaskWithSkills'
							)

							// Отправляем через SSE
							sendNotificationToUser(executor.id, {
								type: 'newTaskWithSkills',
								title: 'Новая задача по вашим навыкам',
								message: `Задача "${sanitizedTitle}" требует навыки, которые у вас есть!`,
								link: `/tasks/${task.id}`,
								taskId: task.id,
								taskTitle: sanitizedTitle,
								requiredSkills: skillsRequired,
							})
						} catch (executorError) {
							logger.warn('Ошибка отправки уведомления конкретному исполнителю', {
								executorId: executor.id,
								taskId: task.id,
								error: executorError,
							})
							// Продолжаем отправку другим исполнителям
						}
					}

					logger.info('Уведомления отправлены исполнителям с нужными навыками', {
						taskId: task.id,
						skillsRequired,
						executorsCount: executors.length,
					})
				} catch (notifyError) {
					logger.error('Ошибка отправки уведомлений исполнителям', notifyError, {
						taskId: task.id,
						skillsRequired,
					})
					// Не прерываем создание задачи из-за ошибки уведомлений
				}
			}).catch(err => {
				logger.error('Критическая ошибка в асинхронной отправке уведомлений', err)
			})
		}

		// ✅ Проверяем достижения для заказчика при создании задачи
		// Важно: проверяем после сохранения задачи в БД
		// ✅ Проверяем достижения после создания задачи (для заказчика)
		let awardedBadges: Array<{
			id: string
			name: string
			icon: string
			description?: string
		}> = []
		try {
			logger.debug('Проверка достижений для заказчика после создания задачи', { userId: user.id, taskId: task.id })
			const newBadges = await checkAndAwardBadges(user.id)
			if (newBadges.length > 0) {
				// Получаем полную информацию о достижениях (включая description)
				const badgeIds = newBadges.map(b => b.id)
				const fullBadges = await prisma.badge.findMany({
					where: { id: { in: badgeIds } },
					select: { id: true, name: true, icon: true, description: true },
				})
				awardedBadges = fullBadges.map(badge => ({
					id: badge.id,
					name: badge.name,
					icon: badge.icon,
					description: badge.description,
				}))
				logger.info('Заказчик получил достижения при создании задачи', {
					userId: user.id,
					taskId: task.id,
					badgeCount: awardedBadges.length,
					badgeNames: awardedBadges.map(b => b.name),
				})
			}
		} catch (badgeError) {
			logger.error('Ошибка проверки достижений при создании задачи', badgeError, { userId: user.id, taskId: task.id })
		}

		return NextResponse.json({ task, awardedBadges })
	} catch (err: any) {
		logger.error('Ошибка при создании задачи', err, { 
			userId: user?.id,
			errorMessage: err?.message,
			errorStack: err?.stack,
		})
		
		// Более детальное сообщение об ошибке для отладки
		const errorMessage = err?.message || 'Ошибка сервера'
		return NextResponse.json(
			{ 
				error: 'Ошибка сервера',
				details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
			}, 
			{ status: 500 }
		)
	}
}
