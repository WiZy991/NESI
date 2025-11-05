import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const user = await prisma.user.findUnique({
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
				avgRating: true,
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
							}
						}
					},
					orderBy: { earnedAt: 'desc' },
					take: 6, // показываем только последние 6 значков
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
					orderBy: { createdAt: 'desc' }
				},
				_count: {
					select: {
						executedTasks: {
							where: { status: 'completed' },
						},
						reviewsReceived: true,
					},
				},
			},
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			)
		}

		// Фильтруем достижения по роли пользователя
		const filteredBadges = (user.badges || []).filter(userBadge => {
			// Защита от отсутствующих данных
			if (!userBadge || !userBadge.badge) {
				return false
			}
			const badge = userBadge.badge
			// Если у достижения указана роль, она должна совпадать с ролью пользователя
			// Если targetRole = null, достижение для всех ролей
			if (badge.targetRole === null || badge.targetRole === user.role) {
				return true
			}
			return false
		})

		// Фильтруем сертификации - только для исполнителей
		const filteredCertifications = user.role === 'executor' ? (user.certifications || []) : []

		// Добавляем avatarUrl и применяем фильтры
		const userWithAvatar = {
			...user,
			badges: filteredBadges, // Отфильтрованные достижения
			certifications: filteredCertifications, // Сертификации только для исполнителей
			avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}` : null,
		}

		return NextResponse.json({ user: userWithAvatar })
	} catch (error) {
		console.error('[USER_API_ERROR]', error)
		console.error('[USER_API_ERROR] Stack:', error instanceof Error ? error.stack : 'No stack')
		return NextResponse.json({ 
			error: 'Ошибка сервера',
			message: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}
