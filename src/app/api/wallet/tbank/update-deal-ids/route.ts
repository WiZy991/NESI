import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { checkPaymentStatus } from '@/lib/tbank'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API для обновления DealId в существующих транзакциях пополнения
 * Используется для исправления транзакций, где DealId не был сохранен
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Находим все транзакции пополнения без DealId, но с PaymentId
		const transactionsWithoutDealId = await prisma.transaction.findMany({
			where: {
				userId: user.id,
				type: 'deposit',
				dealId: null,
				paymentId: { not: null },
				status: 'completed',
			},
			select: {
				id: true,
				paymentId: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
		})

		if (transactionsWithoutDealId.length === 0) {
			return NextResponse.json({
				success: true,
				message: 'Нет транзакций для обновления',
				updated: 0,
			})
		}

		let updated = 0
		let failed = 0

		// Обновляем каждую транзакцию
		for (const tx of transactionsWithoutDealId) {
			if (!tx.paymentId) continue

			try {
				const paymentStatus = await checkPaymentStatus(tx.paymentId)

				if (paymentStatus.Success) {
					const apiDealId = paymentStatus.SpAccumulationId || paymentStatus.DealId
					const dealId = apiDealId ? String(apiDealId) : null

					if (dealId) {
						await prisma.transaction.update({
							where: { id: tx.id },
							data: { dealId },
						})

						updated++
						logger.info('DealId обновлен для транзакции', {
							transactionId: tx.id,
							paymentId: tx.paymentId,
							dealId,
						})
					} else {
						failed++
						logger.warn('DealId не найден для платежа', {
							transactionId: tx.id,
							paymentId: tx.paymentId,
						})
					}
				} else {
					failed++
					logger.warn('Не удалось получить статус платежа', {
						transactionId: tx.id,
						paymentId: tx.paymentId,
						error: paymentStatus.Message,
					})
				}
			} catch (error) {
				failed++
				logger.error('Ошибка обновления DealId', error, {
					transactionId: tx.id,
					paymentId: tx.paymentId,
				})
			}
		}

		// Если обновлено хотя бы одна транзакция, возвращаем успех
		if (updated > 0) {
			return NextResponse.json({
				success: true,
				message: `✅ Обновлено ${updated} транзакций. Теперь можно попробовать вывести средства.`,
				updated,
				failed,
				total: transactionsWithoutDealId.length,
			})
		}

		// Если ничего не обновлено, возвращаем предупреждение
		return NextResponse.json({
			success: false,
			message: failed > 0 
				? `❌ Не удалось обновить DealId для ${failed} транзакций. Возможно, вебхук еще не обработан или DealId недоступен через API.`
				: 'Нет транзакций для обновления',
			updated,
			failed,
			total: transactionsWithoutDealId.length,
		})
	} catch (error: any) {
		logger.error('Ошибка обновления DealId', error)
		return NextResponse.json(
			{ error: error.message || 'Ошибка обновления DealId' },
			{ status: 500 }
		)
	}
}
