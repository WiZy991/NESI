import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { TBankClient } from '@/lib/tbank/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/deals/close
 * Закрывает сделку Мультирасчетов
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { dealId } = await req.json()

		if (!dealId) {
			return NextResponse.json(
				{ error: 'Не указан ID сделки' },
				{ status: 400 }
			)
		}

		// Находим сделку
		const deal = await prisma.tBankDeal.findUnique({
			where: { id: dealId },
		})

		if (!deal) {
			return NextResponse.json({ error: 'Сделка не найдена' }, { status: 404 })
		}

		// Проверяем права (только владелец или админ)
		if (deal.userId !== user.id && user.role !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		// Закрываем через API Т-Банка
		const client = new TBankClient()
		const result = await client.closeDeal(deal.spAccumulationId)

		if (!result.Success) {
			return NextResponse.json(
				{
					error: result.Message || 'Не удалось закрыть сделку',
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Обновляем статус в БД
		await prisma.tBankDeal.update({
			where: { id: dealId },
			data: {
				status: 'CLOSED',
				closedAt: new Date(),
			},
		})

		logger.info('Сделка Т-Банк закрыта', {
			userId: user.id,
			dealId: deal.id,
			spAccumulationId: deal.spAccumulationId,
		})

		return NextResponse.json({
			success: true,
			message: 'Сделка успешно закрыта',
		})
	} catch (error) {
		logger.error('Ошибка закрытия сделки', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
