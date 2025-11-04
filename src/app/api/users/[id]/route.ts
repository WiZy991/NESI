import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: params.id },
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
					include: { badge: true },
					orderBy: { earnedAt: 'desc' },
					take: 6, // показываем только последние 6 значков
				},
				certifications: {
					include: { subcategory: true },
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

		// Добавляем avatarUrl, чтобы фронту было удобно
		const userWithAvatar = {
			...user,
			avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}` : null,
		}

		return NextResponse.json({ user: userWithAvatar })
	} catch (error) {
		console.error('[USER_API_ERROR]', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
