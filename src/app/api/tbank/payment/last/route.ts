import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tbank/payment/last
 * Получает последний платеж пользователя для восстановления paymentId
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Находим последний платеж пользователя (за последние 30 минут)
		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

		const lastPayment = await prisma.tBankPayment.findFirst({
			where: {
				deal: {
					userId: user.id,
				},
				createdAt: {
					gte: thirtyMinutesAgo,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				paymentId: true,
				status: true,
				amount: true,
				createdAt: true,
			},
		})

		if (!lastPayment) {
			return NextResponse.json(
				{ error: 'Последний платеж не найден' },
				{ status: 404 }
			)
		}

		logger.info('Последний платеж найден', {
			userId: user.id,
			paymentId: lastPayment.paymentId,
			status: lastPayment.status,
		})

		return NextResponse.json({
			success: true,
			paymentId: lastPayment.paymentId,
			status: lastPayment.status,
			amount: Number(lastPayment.amount),
			createdAt: lastPayment.createdAt,
		})
	} catch (error) {
		logger.error('Ошибка получения последнего платежа', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
