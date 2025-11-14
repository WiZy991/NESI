import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url)
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
		const skip = (page - 1) * limit
		const search = searchParams.get('search')?.toLowerCase()
		const location = searchParams.get('location')?.toLowerCase()

		const whereClause = {
			role: 'executor' as const,
			...(search
				? {
						OR: [
							{ fullName: { contains: search, mode: 'insensitive' as const } },
							{ skills: { has: search } },
						],
				  }
				: {}),
			...(location
				? { location: { contains: location, mode: 'insensitive' as const } }
				: {}),
		}

		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where: whereClause,
				select: {
					id: true,
					fullName: true,
					email: true,
					role: true,
					location: true,
					skills: true,
					avatarFileId: true,
					xp: true,
					completedTasksCount: true,
					avgRating: true,
					level: {
						select: { id: true, name: true },
					},
					_count: {
						select: { reviewsReceived: true },
					},
				},
				orderBy: [
					{ xp: 'desc' },
					{ completedTasksCount: 'desc' },
					{ avgRating: 'desc' },
				],
				skip,
				take: limit,
			}),
			prisma.user.count({ where: whereClause }),
		])

		// Добавляем вычисляемый avatarUrl
		const usersWithAvatars = users.map(u => ({
			...u,
			avatarUrl: u.avatarFileId ? `/api/files/${u.avatarFileId}` : null,
		}))

		const response = NextResponse.json({
			users: usersWithAvatars,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})

		// Кеширование на 10 минут для списка исполнителей
		response.headers.set(
			'Cache-Control',
			'public, s-maxage=600, stale-while-revalidate=1200'
		)

		return response
	} catch (e) {
		logger.error('Ошибка получения пользователей', e)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
