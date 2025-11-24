import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/payment/by-order
 * Получает paymentId по orderId
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { orderId } = await req.json()

		if (!orderId) {
			return NextResponse.json({ error: 'Не указан OrderId' }, { status: 400 })
		}

		// Находим платеж по orderId
		const payment = await prisma.tBankPayment.findFirst({
			where: {
				orderId: orderId,
				deal: {
					userId: user.id,
				},
			},
			select: {
				paymentId: true,
				status: true,
				amount: true,
			},
		})

		if (!payment) {
			logger.warn('Платеж не найден по OrderId', {
				orderId,
				userId: user.id,
			})
			return NextResponse.json({ error: 'Платеж не найден' }, { status: 404 })
		}

		logger.info('Платеж найден по OrderId', {
			orderId,
			paymentId: payment.paymentId,
			userId: user.id,
		})

		return NextResponse.json({
			success: true,
			paymentId: payment.paymentId,
			status: payment.status,
			amount: Number(payment.amount),
		})
	} catch (error) {
		logger.error('Ошибка получения платежа по OrderId', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
