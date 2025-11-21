import { logActivity } from '@/lib/antifraud'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { TBankPayoutClient } from '@/lib/tbank/client'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/tbank/withdraw/execute
 * Выполняет выплату (после Init)
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

		// Находим выплату
		const payout = await prisma.tBankPayout.findUnique({
			where: { paymentId },
			include: { deal: true },
		})

		if (!payout) {
			return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 })
		}

		// Проверяем права
		if (payout.recipientId !== user.id && user.role !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		// Выполняем выплату
		const client = new TBankPayoutClient()
		const result = await client.executePayout(paymentId)

		if (!result.Success) {
			// Размораживаем средства при ошибке
			await prisma.user.update({
				where: { id: user.id },
				data: {
					frozenBalance: {
						decrement: payout.amount,
					},
				},
			})

			await logActivity(user.id, 'withdraw_failed', req, {
				paymentId,
				error: result.Message,
			})

			return NextResponse.json(
				{
					error: result.Message || 'Не удалось выполнить выплату',
					errorCode: result.ErrorCode,
				},
				{ status: 400 }
			)
		}

		// Обновляем статус выплаты
		await prisma.tBankPayout.update({
			where: { paymentId },
			data: {
				status: result.Status || 'COMPLETED',
				completedAt: new Date(),
			},
		})

		// При успешной выплате:
		// 1. Списываем с баланса
		// 2. Размораживаем
		// 3. Создаем транзакцию
		const amountNumber = toNumber(payout.amount)
		await prisma.user.update({
			where: { id: user.id },
			data: {
				balance: {
					decrement: payout.amount,
				},
				frozenBalance: {
					decrement: payout.amount,
				},
				transactions: {
					create: {
						amount: new Prisma.Decimal(-amountNumber),
						type: 'withdraw',
						reason: 'Вывод средств через Т-Банк',
					},
				},
			},
		})

		// Обновляем баланс сделки
		await prisma.tBankDeal.update({
			where: { id: payout.dealId },
			data: {
				paidAmount: {
					increment: payout.amount,
				},
				remainingBalance: {
					decrement: payout.amount,
				},
			},
		})

		// Если финальная выплата - закрываем сделку
		if (payout.isFinal) {
			await prisma.tBankDeal.update({
				where: { id: payout.dealId },
				data: {
					status: 'CLOSED',
					closedAt: new Date(),
				},
			})
		}

		await logActivity(user.id, 'withdraw_success', req, {
			paymentId,
			amount: amountNumber,
		})

		logger.info('Выплата выполнена', {
			userId: user.id,
			paymentId,
			amount: amountNumber,
		})

		return NextResponse.json({
			success: true,
			status: result.Status,
			message: 'Средства успешно выведены',
		})
	} catch (error) {
		logger.error('Ошибка выполнения выплаты', { error })
		return NextResponse.json(
			{ error: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
