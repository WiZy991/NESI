import { getUserFromRequest } from '@/lib/auth'
import { TBankPayoutClient } from '@/lib/tbank/client'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'

/**
 * Проверка статуса всех выплат пользователя
 * GET /api/wallet/tbank/check-all-payouts
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Получаем все выплаты пользователя
		const payouts = await prisma.tBankPayout.findMany({
			where: {
				recipientId: user.id,
			},
			orderBy: { createdAt: 'desc' },
			take: 10, // Последние 10 выплат
			select: {
				id: true,
				paymentId: true,
				status: true,
				amount: true,
				createdAt: true,
				completedAt: true,
			},
		})

		if (payouts.length === 0) {
			return NextResponse.json({
				message: 'Выплаты не найдены',
				payouts: [],
			})
		}

		// Проверяем статус каждой выплаты через Т-Банк API
		const payoutClient = new TBankPayoutClient()
		const payoutsWithStatus = await Promise.all(
			payouts.map(async (payout) => {
				try {
					const statusResult = await payoutClient.getPayoutState(payout.paymentId)

					// Обновляем статус в БД, если изменился
					if (statusResult.Success && statusResult.Status && statusResult.Status !== payout.status) {
						await prisma.tBankPayout.update({
							where: { id: payout.id },
							data: {
								status: statusResult.Status,
								completedAt: statusResult.Status === 'COMPLETED' ? new Date() : undefined,
							},
						})

						// Если выплата отклонена - возвращаем средства
						if (statusResult.Status === 'REJECTED' && payout.status !== 'REJECTED') {
							await prisma.user.update({
								where: { id: user.id },
								data: {
									balance: {
										increment: payout.amount,
									},
									transactions: {
										create: {
											amount: payout.amount,
											type: 'refund',
											reason: 'Возврат средств: выплата отклонена Т-Банком',
											paymentId: payout.paymentId,
										},
									},
								},
							})

							logger.warn('Выплата отклонена, средства возвращены', {
								paymentId: payout.paymentId,
								userId: user.id,
								amount: toNumber(payout.amount),
							})
						}

						logger.info('Статус выплаты обновлен', {
							paymentId: payout.paymentId,
							oldStatus: payout.status,
							newStatus: statusResult.Status,
						})
					}

					const elapsedMinutes = payout.createdAt
						? Math.floor((Date.now() - payout.createdAt.getTime()) / 1000 / 60)
						: 0

					let userMessage = ''
					if (statusResult.Status === 'COMPLETING') {
						userMessage = `Обрабатывается (${elapsedMinutes} мин). Обычно занимает 1-15 минут для СБП.`
					} else if (statusResult.Status === 'COMPLETED') {
						userMessage = `Завершена. Средства должны поступить на карту.`
					} else if (statusResult.Status === 'REJECTED') {
						userMessage = `Отклонена. Средства возвращены на баланс.`
					} else {
						userMessage = `Статус: ${statusResult.Status}`
					}

					return {
						paymentId: payout.paymentId,
						amount: toNumber(payout.amount),
						localStatus: payout.status,
						tbankStatus: statusResult.Status,
						success: statusResult.Success,
						errorCode: statusResult.ErrorCode,
						message: statusResult.Message,
						userMessage: userMessage,
						createdAt: payout.createdAt,
						completedAt: statusResult.Status === 'COMPLETED' ? new Date() : payout.completedAt,
						elapsedMinutes: elapsedMinutes,
					}
				} catch (error: any) {
					logger.error('Ошибка проверки статуса выплаты', error, {
						paymentId: payout.paymentId,
					})

					return {
						paymentId: payout.paymentId,
						amount: toNumber(payout.amount),
						localStatus: payout.status,
						tbankStatus: null,
						success: false,
						error: error?.message || 'Ошибка проверки статуса',
						createdAt: payout.createdAt,
						elapsedMinutes: payout.createdAt
							? Math.floor((Date.now() - payout.createdAt.getTime()) / 1000 / 60)
							: 0,
					}
				}
			})
		)

		return NextResponse.json({
			success: true,
			count: payoutsWithStatus.length,
			payouts: payoutsWithStatus,
		})
	} catch (error: any) {
		console.error('❌ [CHECK-ALL-PAYOUTS] Ошибка проверки статусов:', error)
		logger.error('Ошибка проверки статусов выплат', error)

		return NextResponse.json(
			{
				error: error?.message || 'Ошибка проверки статусов выплат',
			},
			{ status: 500 }
		)
	}
}

