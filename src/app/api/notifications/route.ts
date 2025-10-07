// app/api/notifications/route.ts
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	const { searchParams } = new URL(req.url)
	const page = parseInt(searchParams.get('page') || '1', 10)
	const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
	const skip = (page - 1) * limit

	const [notifications, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where: {
				userId: user.id,
				NOT: {
					type: 'login',
				},
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
			select: {
				id: true,
				type: true,
				message: true,
				link: true,
				isRead: true,
				createdAt: true,
			},
		}),
		prisma.notification.count({
			where: {
				userId: user.id,
				NOT: {
					type: 'login',
				},
			},
		}),
		prisma.notification.count({
			where: {
				userId: user.id,
				isRead: false,
				NOT: {
					type: 'login',
				},
			},
		}),
	])

	const response = NextResponse.json({
		notifications,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
		unreadCount,
	})

	// Кеширование на 30 секунд для уведомлений
	response.headers.set(
		'Cache-Control',
		'private, max-age=30, stale-while-revalidate=60'
	)

	return response
}
