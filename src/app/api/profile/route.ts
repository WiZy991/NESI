import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'

export const runtime = 'nodejs'

export async function GET(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	try {
		// 1️⃣ Один запрос для получения всех данных + параллельный расчет avgRating
		const [fullUser, avgRatingResult] = await Promise.all([
			prisma.user.findUnique({
				where: { id: user.id },
				select: {
					id: true,
					email: true,
					fullName: true,
					role: true,
					description: true,
					location: true,
					skills: true,
					avatarFileId: true,
					balance: true,
					frozenBalance: true,
					xp: true,
					completedTasksCount: true,
					createdAt: true,
					avatarFile: {
						select: { id: true },
					},
					// Ограничиваем reviewsReceived - берем только последние 20 для быстрой загрузки
					reviewsReceived: {
						select: {
							id: true,
							rating: true,
							comment: true,
							createdAt: true,
							fromUser: {
								select: { id: true, fullName: true, email: true },
							},
							task: {
								select: { id: true, title: true },
							},
						},
						orderBy: { createdAt: 'desc' },
						take: 20, // Ограничение для производительности
					},
					// Дополнительные данные для исполнителя (загружаются только если role === 'executor')
					level: true,
					badges: {
						select: {
							id: true,
							earnedAt: true,
							badge: {
								select: {
									id: true,
									name: true,
									description: true,
									icon: true,
									targetRole: true, // Добавляем targetRole для фильтрации
									condition: true, // Добавляем condition для проверки универсальных badges
								},
							},
						},
						orderBy: { earnedAt: 'desc' },
					},
					certifications: {
						select: {
							id: true,
							level: true,
							grantedAt: true,
							subcategory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: { grantedAt: 'desc' },
					},
					executedTasks: {
						where: { status: 'completed' },
						select: {
							id: true,
							title: true,
							description: true,
							price: true,
							completedAt: true,
							customer: {
								select: { id: true, fullName: true, email: true },
							},
							review: {
								select: {
									id: true,
									rating: true,
									comment: true,
								},
							},
						},
						orderBy: { completedAt: 'desc' },
						take: 10,
					},
					_count: {
						select: {
							executedTasks: { where: { status: 'completed' } },
							reviewsReceived: true,
							responses: true,
						},
					},
				},
			}),
			// Параллельно вычисляем avgRating через агрегацию (быстрее чем загружать все reviews)
			prisma.review.aggregate({
				where: { toUserId: user.id },
				_avg: { rating: true },
				_count: { rating: true },
			}),
		])

		if (!fullUser)
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			)

		// 2️⃣ Вычисляем avgRating из результата агрегации
		const avgRating =
			avgRatingResult._avg.rating && avgRatingResult._count.rating > 0
				? avgRatingResult._avg.rating
				: null

		// 2️⃣ Вычисляем бонусный XP за сертификации (10 XP за каждую пройденную сертификацию)
		const passedCertifications = await prisma.certificationAttempt.count({
			where: { userId: user.id, passed: true },
		})
		const xpComputed = (fullUser.xp ?? 0) + passedCertifications * 10

		// 3️⃣ Аватар
		const avatarUrl = fullUser.avatarFileId
			? `/api/files/${fullUser.avatarFileId}`
			: null

		// 4️⃣ Добавляем статистику для заказчика (оптимизировано - один запрос вместо нескольких)
		let customerStats = null
		if (fullUser.role === 'customer') {
			// Используем один запрос с агрегацией вместо множественных запросов
			const [taskStats, totalSpentResult, uniqueExecutorsResult] = await Promise.all([
				// Агрегируем задачи заказчика одним запросом
				prisma.task.groupBy({
					by: ['status'],
					where: { customerId: user.id },
					_count: { id: true },
				}),
				// Сумма всех расходов заказчика
				prisma.transaction.aggregate({
					where: {
						userId: user.id,
						type: 'payment',
						amount: { lt: 0 },
					},
					_sum: { amount: true },
				}),
				// Уникальные исполнители через distinct
				prisma.task.findMany({
					where: {
						customerId: user.id,
						executorId: { not: null },
						status: 'completed',
					},
					select: { executorId: true },
					distinct: ['executorId'],
				}),
			])

			// Вычисляем статистику из группировки
			const createdTasksCount = taskStats.reduce((sum, stat) => sum + stat._count.id, 0)
			const completedTasksCount = taskStats.find(s => s.status === 'completed')?._count.id || 0
			const uniqueExecutors = uniqueExecutorsResult.length
			const totalSpent = totalSpentResult._sum.amount
				? Math.abs(Number(totalSpentResult._sum.amount))
				: 0

			customerStats = {
				createdTasks: createdTasksCount,
				completedTasks: completedTasksCount,
				totalSpent,
				uniqueExecutors,
			}
		}

		// 5️⃣ Фильтруем достижения по роли пользователя
		// Оставляем только те достижения, которые подходят для роли пользователя
		// Поля, специфичные для исполнителей
		const executorOnlyFields = ['passedTests', 'completedTasks']
		// Поля, специфичные для заказчиков
		const customerOnlyFields = [
			'createdTasks',
			'paidTasks',
			'totalSpent',
			'monthlyActive',
			'uniqueExecutors',
		]

		let filteredBadges = (fullUser.badges || []).filter((userBadge: any) => {
			// Защита от отсутствующих данных
			if (!userBadge || !userBadge.badge) {
				return false
			}
			const badge = userBadge.badge as any

			// Если badge специально для другой роли - фильтруем
			if (badge.targetRole === 'executor' && fullUser.role !== 'executor') {
				return false
			}
			if (badge.targetRole === 'customer' && fullUser.role !== 'customer') {
				return false
			}

			// Если badge универсальный (targetRole = null), проверяем условие
			if (badge.targetRole === null && badge.condition) {
				try {
					const condition = JSON.parse(badge.condition)
					const conditionType = condition.type as string

					// Если условие специфично для другой роли - фильтруем
					if (
						fullUser.role === 'customer' &&
						executorOnlyFields.includes(conditionType)
					) {
						return false
					}
					if (
						fullUser.role === 'executor' &&
						customerOnlyFields.includes(conditionType)
					) {
						return false
					}

					// Исключаем достижения, связанные с XP и уровнями для заказчиков
					if (
						fullUser.role === 'customer' &&
						(conditionType === 'totalXP' || conditionType === 'level')
					) {
						return false
					}
				} catch (error) {
					// Если не удалось распарсить условие, проверяем по тексту
					const condition = badge.condition?.toLowerCase() || ''
					const description = badge.description?.toLowerCase() || ''
					const name = badge.name?.toLowerCase() || ''

					const xpKeywords = [
						'xp',
						'опыт',
						'уровень',
						'level',
						'очки опыта',
						'totalxp',
					]
					if (
						fullUser.role === 'customer' &&
						xpKeywords.some(
							keyword =>
								condition.includes(keyword) ||
								description.includes(keyword) ||
								name.includes(keyword)
						)
					) {
						return false
					}
				}
			}

			return true
		})

		// Дополнительная фильтрация для заказчиков: исключаем достижения, связанные с XP и уровнями
		if (fullUser.role === 'customer') {
			filteredBadges = filteredBadges.filter((userBadge: any) => {
				const badge = userBadge.badge as any
				const condition = badge.condition?.toLowerCase() || ''
				const description = badge.description?.toLowerCase() || ''
				const name = badge.name?.toLowerCase() || ''

				// Исключаем достижения, связанные с XP, уровнями, опытом
				const xpKeywords = [
					'xp',
					'опыт',
					'уровень',
					'level',
					'очки опыта',
					'totalxp',
				]
				const hasXpReference = xpKeywords.some(
					keyword =>
						condition.includes(keyword) ||
						description.includes(keyword) ||
						name.includes(keyword)
				)

				return !hasXpReference
			})
		}

		// 6️⃣ Возвращаем оптимизированный ответ
		return NextResponse.json({
			user: {
				...fullUser,
				badges: filteredBadges, // Возвращаем отфильтрованные достижения
				avatarUrl,
				avgRating,
				xpComputed, // XP с учетом бонуса за сертификации
				isExecutor: fullUser.role === 'executor',
				customerStats, // Статистика для заказчика
			},
		})
	} catch (error) {
		logger.error('Ошибка загрузки профиля', error, { userId: user?.id })
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

export async function PATCH(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	try {
		const {
			sanitizeText,
			validateStringLength,
			validateEmail,
			isValidFileName,
			normalizeFileName,
		} = await import('@/lib/security')
		const { validateFile } = await import('@/lib/fileValidation')

		const contentType = req.headers.get('content-type') || ''
		let dataToUpdate: any = {}

		// === MULTIPART ===
		if (contentType.includes('multipart/form-data')) {
			const formData = await req.formData()

			const fullName = formData.get('fullName') as string
			const role = formData.get('role') as string
			const password = formData.get('password') as string | null
			const description = formData.get('description') as string | null
			const location = formData.get('location') as string | null
			const skills = formData.get('skills') as string | null
			const avatar = formData.get('avatar') as File | null

			if (!fullName || !role) {
				return NextResponse.json(
					{ error: 'Имя и роль обязательны' },
					{ status: 400 }
				)
			}

			// Валидация и санитизация полей
			const fullNameValidation = validateStringLength(
				fullName.trim(),
				100,
				'Имя'
			)
			if (!fullNameValidation.valid) {
				return NextResponse.json(
					{ error: fullNameValidation.error },
					{ status: 400 }
				)
			}

			if (description) {
				const descValidation = validateStringLength(
					description.trim(),
					1000,
					'Описание'
				)
				if (!descValidation.valid) {
					return NextResponse.json(
						{ error: descValidation.error },
						{ status: 400 }
					)
				}
			}

			if (location) {
				const locationValidation = validateStringLength(
					location.trim(),
					200,
					'Местоположение'
				)
				if (!locationValidation.valid) {
					return NextResponse.json(
						{ error: locationValidation.error },
						{ status: 400 }
					)
				}
			}

			// Генерируем SEO slug для пользователя при изменении имени
			const { slugify, createUniqueSlug } = await import('@/lib/seo/slugify')
			const existingUserSlugs = await prisma.user.findMany({
				where: { seoSlug: { not: null } },
				select: { seoSlug: true },
			}).then(users => users.map(u => u.seoSlug!).filter(Boolean))
			const userSlug = createUniqueSlug(fullName.trim(), existingUserSlugs)

			dataToUpdate = {
				fullName: sanitizeText(fullName.trim()),
				seoSlug: userSlug,
				role,
				description: description ? sanitizeText(description.trim()) : null,
				location: location ? sanitizeText(location.trim()) : null,
			}

			// Обработка навыков
			if (skills !== null) {
				const parsed = skills
					.split(',')
					.map(s => s.trim())
					.filter(Boolean)
				dataToUpdate.skills = parsed.length > 0 ? parsed : []
			}

			// Хэш пароля (если передан)
			if (password && password.length > 0) {
				const hashed = await bcrypt.hash(password, 10)
				dataToUpdate.password = hashed
			}

			// Сохранение аватара с валидацией
			if (avatar && avatar.size > 0) {
				try {
					// Проверка размера файла (максимум 5MB для аватара)
					const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB
					if (avatar.size > MAX_AVATAR_SIZE) {
						return NextResponse.json(
							{
								error: `Размер файла слишком большой. Максимум ${
									MAX_AVATAR_SIZE / 1024 / 1024
								}MB`,
							},
							{ status: 400 }
						)
					}

					// Проверка имени файла
					if (!isValidFileName(avatar.name)) {
						return NextResponse.json(
							{ error: 'Недопустимое имя файла аватара' },
							{ status: 400 }
						)
					}

					// Валидация файла
					const fileValidation = await validateFile(avatar, true)
					if (!fileValidation.valid) {
						return NextResponse.json(
							{ error: fileValidation.error || 'Ошибка валидации файла' },
							{ status: 400 }
						)
					}

					// Читаем файл в буфер
					let bytes: Buffer
					try {
						const arrayBuffer = await avatar.arrayBuffer()
						bytes = Buffer.from(arrayBuffer)
					} catch (bufferError: any) {
						logger.error('Ошибка при чтении файла в буфер', bufferError, { userId: user.id })
						return NextResponse.json(
							{
								error: 'Ошибка при обработке файла',
							},
							{ status: 500 }
						)
					}

					const safeFileName = normalizeFileName(avatar.name)
					const mimeType = fileValidation.detectedMimeType || avatar.type

					// Сохраняем файл в базу данных
					const savedFile = await prisma.file.create({
						data: {
							id: randomUUID(),
							filename: safeFileName,
							mimetype: mimeType,
							size: avatar.size,
							data: bytes,
						},
					})

					dataToUpdate.avatarFileId = savedFile.id
				} catch (avatarError: any) {
					logger.error('Ошибка при сохранении аватара', avatarError, { userId: user.id })
					return NextResponse.json(
						{
							error: 'Ошибка при сохранении аватара',
						},
						{ status: 500 }
					)
				}
			}
		}

		// === JSON ===
		else {
			const body = await req.json()
			const { fullName, role, password, description, location, skills } = body

			if (!fullName || !role) {
				return NextResponse.json(
					{ error: 'Имя и роль обязательны' },
					{ status: 400 }
				)
			}

			// Валидация и санитизация полей
			const fullNameValidation = validateStringLength(
				fullName.trim(),
				100,
				'Имя'
			)
			if (!fullNameValidation.valid) {
				return NextResponse.json(
					{ error: fullNameValidation.error },
					{ status: 400 }
				)
			}

			if (description) {
				const descValidation = validateStringLength(
					description.trim(),
					1000,
					'Описание'
				)
				if (!descValidation.valid) {
					return NextResponse.json(
						{ error: descValidation.error },
						{ status: 400 }
					)
				}
			}

			if (location) {
				const locationValidation = validateStringLength(
					location.trim(),
					200,
					'Местоположение'
				)
				if (!locationValidation.valid) {
					return NextResponse.json(
						{ error: locationValidation.error },
						{ status: 400 }
					)
				}
			}

			dataToUpdate = {
				fullName: sanitizeText(fullName.trim()),
				role,
				description: description ? sanitizeText(description.trim()) : null,
				location: location ? sanitizeText(location.trim()) : null,
			}

			if (skills !== undefined) {
				if (Array.isArray(skills)) {
					dataToUpdate.skills = skills
				} else if (typeof skills === 'string') {
					const parsed = skills
						.split(',')
						.map(s => s.trim())
						.filter(Boolean)
					dataToUpdate.skills = parsed.length > 0 ? parsed : []
				} else {
					dataToUpdate.skills = []
				}
			}

			if (password && password.length > 0) {
				const hashed = await bcrypt.hash(password, 10)
				dataToUpdate.password = hashed
			}
		}

		// === Обновление пользователя ===
		const updatedUser = await prisma.user.update({
			where: { id: user.id },
			data: dataToUpdate,
			include: { avatarFile: true },
		})

		const avatarUrl = updatedUser.avatarFileId
			? `/api/files/${updatedUser.avatarFileId}`
			: null

		return NextResponse.json({ user: { ...updatedUser, avatarUrl } })
	} catch (err: any) {
		logger.error('Ошибка обновления профиля', err, { userId: user?.id })
		return NextResponse.json(
			{
				error: 'Ошибка обновления профиля',
			},
			{ status: 500 }
		)
	}
}
