import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		
		// Определяем, это ID или email (email содержит @)
		const isEmail = id.includes('@')
		const whereClause = isEmail 
			? { email: id.toLowerCase().trim() }
			: { id }
		
		// Вычисляем avgRating параллельно с загрузкой пользователя
		const [user, avgRatingResult, _count] = await Promise.all([
			prisma.user.findUnique({
				where: whereClause,
				select: {
					id: true,
					fullName: true,
					email: true,
					role: true,
					accountType: true,
					companyName: true,
					skills: true,
					location: true,
					description: true,
					avatarFileId: true,
					xp: true,
					completedTasksCount: true,
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
									targetRole: true,
									condition: true, // Добавляем condition для проверки универсальных badges
								}
							}
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
								}
							}
						},
						orderBy: { grantedAt: 'desc' },
						take: 4, // показываем только последние 4 сертификации
					},
					reviewsReceived: { 
						select: { 
							id: true,
							rating: true,
							comment: true,
							createdAt: true,
							taskId: true,
							task: {
								select: {
									id: true,
									title: true
								}
							},
							fromUser: {
								select: {
									id: true,
									fullName: true,
									email: true
								}
							}
						},
						orderBy: { createdAt: 'desc' },
						take: 10,
					},
				},
			}),
			// Вычисляем avgRating через агрегацию (как в /api/profile)
		// Будем вычислять после получения пользователя
		Promise.resolve(null),
			// Получаем количество отзывов и выполненных задач
			prisma.user.findUnique({
				where: whereClause,
				select: {
					_count: {
						select: {
							reviewsReceived: true,
							executedTasks: { where: { status: 'completed' } },
						},
					},
				},
			}),
		])

		if (!user) {
			return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		const avatarUrl = user.avatarFileId ? `/api/files/${user.avatarFileId}` : null
		
		// Вычисляем avgRating из результата агрегации (если был получен)
		const avgRating = avgRatingResult && avgRatingResult._avg.rating && avgRatingResult._count.rating > 0
			? avgRatingResult._avg.rating
			: null
		
		// Если avgRating не был вычислен, вычисляем его сейчас
		const finalAvgRating = avgRating || (await prisma.review.aggregate({
			where: { toUserId: user.id },
			_avg: { rating: true },
			_count: { rating: true },
		}))._avg.rating || null
		
		// Вычисляем бонусный XP за сертификации (10 XP за каждую пройденную сертификацию)
		const passedCertifications = await prisma.certificationAttempt.count({
			where: { userId: user.id, passed: true }
		})
		const xpComputed = (user.xp ?? 0) + passedCertifications * 10

		// Фильтруем достижения по роли пользователя
		// Поля, специфичные для исполнителей
		const executorOnlyFields = ['passedTests', 'completedTasks']
		// Поля, специфичные для заказчиков
		const customerOnlyFields = ['createdTasks', 'paidTasks', 'totalSpent', 'monthlyActive', 'uniqueExecutors']
		
		const userBadges = (user as any).badges || []
		const filteredBadges = userBadges.filter((userBadge: any) => {
			const badge = userBadge.badge
			if (!badge) return false
			
			// Если badge специально для другой роли - фильтруем
			if (badge.targetRole === 'executor' && user.role !== 'executor') {
				return false
			}
			if (badge.targetRole === 'customer' && user.role !== 'customer') {
				return false
			}
			
			// Если badge универсальный (targetRole = null), проверяем условие
			if (badge.targetRole === null && badge.condition) {
				try {
					const condition = JSON.parse(badge.condition)
					const conditionType = condition.type as string

					// Если условие специфично для другой роли - фильтруем
					if (user.role === 'customer' && executorOnlyFields.includes(conditionType)) {
						return false
					}
					if (user.role === 'executor' && customerOnlyFields.includes(conditionType)) {
			return false
					}
				} catch (error) {
					// Если не удалось распарсить условие, оставляем badge
					logger.warn('Ошибка парсинга условия для badge', error, {
						badgeId: badge.id,
						userId: id,
					})
				}
			}
			
			return true
		})

		// Ограничиваем количество badges до 6 для отображения
		const limitedBadges = filteredBadges.slice(0, 6)

		// Получаем настройки пользователя (фон профиля) безопасно
		let profileBackground = 'default'
		try {
			const userSettings = await prisma.userSettings.findUnique({
				where: { userId: id },
				select: { profileBackground: true },
			})
			if (userSettings?.profileBackground) {
				profileBackground = userSettings.profileBackground
			}
		} catch (settingsError: any) {
			// Если поле profileBackground еще не существует в БД или таблица не найдена
			if (settingsError.message?.includes('profileBackground') || settingsError.code === 'P2021') {
				logger.debug('Поле profileBackground не найдено в БД, используем дефолтное значение', { userId: id })
			} else {
				logger.warn('Ошибка получения настроек пользователя', settingsError, { userId: id })
			}
		}

		return NextResponse.json({
			user: {
			...user,
				badges: limitedBadges, // Отфильтрованные и ограниченные badges
				avatarUrl,
				avgRating: finalAvgRating, // Вычисленный рейтинг
				xpComputed, // XP с учетом бонуса за сертификации
				_count: _count?._count, // Добавляем _count для статистики
				profileBackground, // Фон профиля
			},
		})
	} catch (error) {
		logger.error('Ошибка получения пользователя', error, { userId: id })
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
