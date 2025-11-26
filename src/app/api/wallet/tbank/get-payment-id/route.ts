import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API для получения последнего PaymentId пользователя
 * Используется для ручной проверки платежа
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Ищем последние транзакции пополнения (даже если они не завершены)
		// Или транзакции, связанные с Т-Банк
		const recentTransactions = await prisma.transaction.findMany({
			where: {
				userId: user.id,
				OR: [
					{ type: 'deposit' },
					{ reason: { contains: 'Т-Банк' } },
					{ reason: { contains: 'T-Bank' } },
				],
			},
			orderBy: { createdAt: 'desc' },
			take: 10,
			select: {
				id: true,
				amount: true,
				type: true,
				reason: true,
				createdAt: true,
				paymentId: true,
				dealId: true,
				status: true,
			},
		})

		// Извлекаем PaymentId из reason, если он там есть
		const paymentIds = recentTransactions
			.map(tx => {
				// Пытаемся извлечь PaymentId из reason
				const paymentIdMatch = tx.reason.match(/PaymentId:\s*(\d+)/i)
				return paymentIdMatch ? paymentIdMatch[1] : tx.paymentId || null
			})
			.filter(Boolean)

		return NextResponse.json({
			recentTransactions,
			paymentIds: [...new Set(paymentIds)], // Уникальные PaymentId
		})
	} catch (error: any) {
		logger.error('Ошибка получения PaymentId', error)
		return NextResponse.json(
			{ error: error.message || 'Ошибка получения данных' },
			{ status: 500 }
		)
	}
}
