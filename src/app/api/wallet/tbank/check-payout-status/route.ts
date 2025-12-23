import { getUserFromRequest } from '@/lib/auth'
import { TBankPayoutClient } from '@/lib/tbank/client'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'

/**
 * Проверка статуса выплаты через Т-Банк API
 * GET /api/wallet/tbank/check-payout-status?paymentId=...
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { searchParams } = new URL(req.url)
		const paymentId = searchParams.get('paymentId')

		if (!paymentId) {
			return NextResponse.json(
				{ error: 'PaymentId обязателен' },
				{ status: 400 }
			)
		}

		// Проверяем, что выплата принадлежит пользователю
		const payout = await prisma.tBankPayout.findFirst({
			where: {
				paymentId: paymentId,
				recipientId: user.id,
			},
			select: {
				id: true,
				paymentId: true,
				status: true,
				amount: true,
				createdAt: true,
				completedAt: true,
				recipientType: true,
			},
		})

		// Если не найдена в TBankPayout, ищем в транзакциях
		let transaction = null
		if (!payout) {
			transaction = await prisma.transaction.findFirst({
				where: {
					paymentId: paymentId,
					userId: user.id,
					type: 'withdraw',
				},
				select: {
					id: true,
					amount: true,
					createdAt: true,
					status: true,
				},
			})
		}

		if (!payout && !transaction) {
			return NextResponse.json(
				{ error: 'Выплата не найдена' },
				{ status: 404 }
			)
		}

		// Проверяем статус через Т-Банк API
		const payoutClient = new TBankPayoutClient()
		const statusResult = await payoutClient.getPayoutState(paymentId)

		console.log('🔍 [CHECK-PAYOUT-STATUS] Статус выплаты:', {
			paymentId: paymentId,
			currentStatus: payout?.status || transaction?.status,
			tbankStatus: statusResult.Status,
			success: statusResult.Success,
			errorCode: statusResult.ErrorCode,
			message: statusResult.Message,
		})

		// Обновляем статус в БД, если изменился
		if (statusResult.Success && statusResult.Status) {
			if (payout && statusResult.Status !== payout.status) {
				await prisma.tBankPayout.update({
					where: { id: payout.id },
					data: {
						status: statusResult.Status,
						completedAt: statusResult.Status === 'COMPLETED' ? new Date() : undefined,
					},
				})

				// Если выплата отклонена - возвращаем средства
				if (statusResult.Status === 'REJECTED') {
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
									paymentId: paymentId,
								},
							},
						},
					})

					logger.warn('Выплата отклонена, средства возвращены', {
						paymentId: paymentId,
						userId: user.id,
						amount: toNumber(payout.amount),
					})
				}

				logger.info('Статус выплаты обновлен', {
					paymentId: paymentId,
					oldStatus: payout.status,
					newStatus: statusResult.Status,
				})
			}
		}

		return NextResponse.json({
			success: statusResult.Success,
			status: statusResult.Status || payout?.status || transaction?.status,
			paymentId: paymentId,
			errorCode: statusResult.ErrorCode,
			message: statusResult.Message,
			amount: payout ? toNumber(payout.amount) : transaction ? toNumber(transaction.amount) : 0,
			createdAt: payout?.createdAt || transaction?.createdAt,
			completedAt: statusResult.Status === 'COMPLETED' ? new Date() : payout?.completedAt,
			recipientType: payout?.recipientType,
			note: statusResult.Status === 'COMPLETING' 
				? 'Выплата обрабатывается. Обычно занимает 1-15 минут для СБП.'
				: statusResult.Status === 'COMPLETED'
				? 'Выплата успешно завершена. Средства должны поступить на карту в течение нескольких минут.'
				: statusResult.Status === 'REJECTED'
				? 'Выплата отклонена. Средства возвращены на баланс платформы.'
				: 'Проверьте статус в личном кабинете Т-Банка или обратитесь в поддержку.',
		})
	} catch (error: any) {
		console.error('❌ [CHECK-PAYOUT-STATUS] Ошибка проверки статуса:', error)
		logger.error('Ошибка проверки статуса выплаты', error, {
			paymentId: req.url.split('paymentId=')[1]?.split('&')[0],
		})

		return NextResponse.json(
			{
				error: error?.message || 'Ошибка проверки статуса выплаты',
			},
			{ status: 500 }
		)
	}
}
