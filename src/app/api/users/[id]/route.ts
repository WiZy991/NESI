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
								targetRole: true,
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
					take: 4
				}
			}
		}) as any // Временный обход для типов

		if (!user) {
			return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		// Фильтруем достижения по роли пользователя
		// Оставляем только те достижения, которые подходят для роли пользователя
		const filteredBadges = ((user as any).badges || []).filter((userBadge: any) => {
			// Проверка на существование
			if (!userBadge || !userBadge.badge) {
				return false
			}
			const badge = userBadge.badge
			// Если у достижения указана роль, она должна совпадать с ролью пользователя
			// Если targetRole = null, достижение для всех ролей
			if (badge.targetRole === null || badge.targetRole === user.role) {
				return true
			}
			// Исключаем неподходящее достижение
			console.log(`[Users API] Исключаем неподходящее достижение "${badge.name}" (targetRole: ${badge.targetRole}, роль пользователя: ${user.role})`)
			return false
		})
		
		const userBadges = (user as any).badges || []
		if (userBadges.length !== filteredBadges.length) {
			console.log(`[Users API] Отфильтровано ${userBadges.length - filteredBadges.length} неподходящих достижений для пользователя ${(user as any).id} (роль: ${(user as any).role})`)
		}

		// Ограничиваем количество badges до 6 для отображения
		const limitedBadges = filteredBadges.slice(0, 6)

		const avatarUrl = user.avatarFileId ? `/api/files/${user.avatarFileId}` : null

		return NextResponse.json({
			user: {
				...user,
				badges: limitedBadges, // Отфильтрованные и ограниченные badges
				avatarUrl,
			}
		})
	} catch (error) {
		console.error('Ошибка получения пользователя:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
