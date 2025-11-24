import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { TBankClient } from '@/lib/tbank/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/deals/create
 * Создает новую сделку Мультирасчетов
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Создаем сделку через API Т-Банка
		const client = new TBankClient()
		const result = await client.createDeal()

		if (!result.Success || !result.SpAccumulationId) {
			logger.error('Ошибка создания сделки Т-Банк', {
				userId: user.id,
				errorCode: result.ErrorCode,
				message: result.Message,
			})

			return NextResponse.json(
				{
					error: result.Message || 'Не удалось создать сделку',
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Сохраняем сделку в нашей БД
		const deal = await prisma.tBankDeal.create({
			data: {
				spAccumulationId: result.SpAccumulationId,
				userId: user.id,
				dealType: 'NN',
				status: 'OPEN',
			},
		})

		logger.info('Сделка Т-Банк создана', {
			userId: user.id,
			dealId: deal.id,
			spAccumulationId: deal.spAccumulationId,
		})

		return NextResponse.json({
			success: true,
			deal: {
				id: deal.id,
				spAccumulationId: deal.spAccumulationId,
				status: deal.status,
			},
		})
	} catch (error) {
		logger.error('Ошибка создания сделки', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
