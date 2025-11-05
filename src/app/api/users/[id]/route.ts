import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		
		// Вычисляем avgRating параллельно с загрузкой пользователя
		const [user, avgRatingResult, _count] = await Promise.all([
			prisma.user.findUnique({
				where: { id },
				select: {
					id: true,
					fullName: true,
					email: true,
					role: true,
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
								} as any // Обход проблемы с типами Prisma
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
			prisma.review.aggregate({
				where: { toUserId: id },
				_avg: { rating: true },
				_count: { rating: true },
			}),
			// Получаем количество отзывов и выполненных задач
			prisma.user.findUnique({
				where: { id },
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
		
		// Вычисляем avgRating из результата агрегации
		const avgRating = avgRatingResult._avg.rating && avgRatingResult._count.rating > 0
			? avgRatingResult._avg.rating
			: null
		
		// Вычисляем бонусный XP за сертификации (10 XP за каждую пройденную сертификацию)
		const passedCertifications = await prisma.certificationAttempt.count({
			where: { userId: id, passed: true }
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
					console.error(`[Users API] Ошибка парсинга условия для badge ${badge.id}:`, error)
				}
			}
			
			return true
		})

		// Ограничиваем количество badges до 6 для отображения
		const limitedBadges = filteredBadges.slice(0, 6)

		return NextResponse.json({
			user: {
			...user,
				badges: limitedBadges, // Отфильтрованные и ограниченные badges
				avatarUrl,
				avgRating, // Вычисленный рейтинг
				xpComputed, // XP с учетом бонуса за сертификации
				_count: _count?._count, // Добавляем _count для статистики
			},
		})
	} catch (error) {
		console.error('Ошибка получения пользователя:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
