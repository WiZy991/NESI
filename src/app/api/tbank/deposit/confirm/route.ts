import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { TBankClient } from '@/lib/tbank/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/deposit/confirm
 * Подтверждает платеж (для двухстадийной схемы)
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { paymentId } = await req.json()

		if (!paymentId) {
			return NextResponse.json(
				{ error: 'Не указан ID платежа' },
				{ status: 400 }
			)
		}

		// Находим платеж
		const payment = await prisma.tBankPayment.findUnique({
			where: { paymentId },
			include: { deal: true },
		})

		if (!payment) {
			return NextResponse.json({ error: 'Платеж не найден' }, { status: 404 })
		}

		// Проверяем права
		if (payment.deal.userId !== user.id && user.role !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		// Подтверждаем через API
		const client = new TBankClient()
		const result = await client.confirmPayment(paymentId)

		if (!result.Success) {
			return NextResponse.json(
				{
					error: result.Message || 'Не удалось подтвердить платеж',
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Обновляем статус платежа
		await prisma.tBankPayment.update({
			where: { paymentId },
			data: {
				status: result.Status || 'CONFIRMED',
				confirmedAt: new Date(),
			},
		})

		logger.info('Платеж подтвержден', {
			userId: user.id,
			paymentId,
		})

		return NextResponse.json({
			success: true,
			status: result.Status,
		})
	} catch (error) {
		logger.error('Ошибка подтверждения платежа', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
