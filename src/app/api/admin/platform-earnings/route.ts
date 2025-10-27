import { getUserFromRequest } from '@/lib/auth'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)

		if (!user || user.role !== 'admin') {
			return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
		}

		const platformOwnerId = process.env.PLATFORM_OWNER_ID

		if (!platformOwnerId) {
			return NextResponse.json(
				{
					error: 'PLATFORM_OWNER_ID не настроен в переменных окружения',
				},
				{ status: 500 }
			)
		}

		// Получаем владельца платформы
		const platformOwner = await prisma.user.findUnique({
			where: { id: platformOwnerId },
			select: {
				id: true,
				email: true,
				fullName: true,
				balance: true,
				transactions: {
					where: { type: 'commission' },
					orderBy: { createdAt: 'desc' },
					take: 50, // Последние 50 комиссий
				},
			},
		})

		if (!platformOwner) {
			return NextResponse.json(
				{
					error: 'Пользователь с ID владельца платформы не найден',
				},
				{ status: 404 }
			)
		}

		// Считаем общую сумму комиссий
		const totalCommissions = await prisma.transaction.aggregate({
			where: {
				userId: platformOwnerId,
				type: 'commission',
			},
			_sum: {
				amount: true,
			},
			_count: true,
		})

		// Статистика за последний месяц
		const lastMonth = new Date()
		lastMonth.setMonth(lastMonth.getMonth() - 1)

		const monthlyCommissions = await prisma.transaction.aggregate({
			where: {
				userId: platformOwnerId,
				type: 'commission',
				createdAt: { gte: lastMonth },
			},
			_sum: {
				amount: true,
			},
			_count: true,
		})

		// Статистика за последнюю неделю
		const lastWeek = new Date()
		lastWeek.setDate(lastWeek.getDate() - 7)

		const weeklyCommissions = await prisma.transaction.aggregate({
			where: {
				userId: platformOwnerId,
				type: 'commission',
				createdAt: { gte: lastWeek },
			},
			_sum: {
				amount: true,
			},
			_count: true,
		})

		// Статистика за сегодня
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const todayCommissions = await prisma.transaction.aggregate({
			where: {
				userId: platformOwnerId,
				type: 'commission',
				createdAt: { gte: today },
			},
			_sum: {
				amount: true,
			},
			_count: true,
		})

		return NextResponse.json({
			platformOwner: {
				id: platformOwner.id,
				email: platformOwner.email,
				fullName: platformOwner.fullName,
				balance: toNumber(platformOwner.balance),
			},
			statistics: {
				total: {
					amount: toNumber(totalCommissions._sum.amount || 0),
					count: totalCommissions._count,
				},
				monthly: {
					amount: toNumber(monthlyCommissions._sum.amount || 0),
					count: monthlyCommissions._count,
				},
				weekly: {
					amount: toNumber(weeklyCommissions._sum.amount || 0),
					count: weeklyCommissions._count,
				},
				today: {
					amount: toNumber(todayCommissions._sum.amount || 0),
					count: todayCommissions._count,
				},
			},
			recentTransactions: platformOwner.transactions.map(tx => ({
				id: tx.id,
				amount: toNumber(tx.amount),
				reason: tx.reason,
				createdAt: tx.createdAt,
			})),
		})
	} catch (err) {
		console.error('Ошибка получения статистики платформы:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
