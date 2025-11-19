import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { checkPaymentStatus, kopecksToRubles } from '@/lib/tbank'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API для ручной проверки статуса платежа и начисления средств
 * Используется, если вебхук не сработал
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
				{ error: 'Не указан paymentId' },
				{ status: 400 }
			)
		}

		console.log('🔍 [CHECK-PAYMENT] Проверка платежа:', {
			paymentId,
			userId: user.id,
		})

		// Проверяем статус платежа в Т-Банке
		const paymentStatus = await checkPaymentStatus(paymentId)

		console.log('📊 [CHECK-PAYMENT] Статус платежа:', paymentStatus)

		if (!paymentStatus.Success) {
			return NextResponse.json(
				{
					error: 'Платеж не найден или ошибка при проверке',
					details: paymentStatus.Message,
				},
				{ status: 400 }
			)
		}

		// Проверяем, обработан ли уже этот платеж
		const existingTx = await prisma.transaction.findFirst({
			where: {
				OR: [{ paymentId: paymentId }, { reason: { contains: paymentId } }],
			},
		})

		if (existingTx) {
			console.log('✅ [CHECK-PAYMENT] Платеж уже обработан')
			return NextResponse.json({
				success: true,
				message: 'Платеж уже обработан',
				alreadyProcessed: true,
			})
		}

		// Если платеж подтвержден, начисляем средства
		if (paymentStatus.Status === 'CONFIRMED') {
			const amount = kopecksToRubles(paymentStatus.Amount || 0)
			const amountDecimal = new Prisma.Decimal(amount)

			// Извлекаем userId из OrderId
			const orderId = paymentStatus.OrderId || ''
			const orderParts = orderId.split('_')
			const userId = orderParts.length >= 2 ? orderParts[1] : user.id

			if (userId !== user.id) {
				return NextResponse.json(
					{ error: 'Платеж принадлежит другому пользователю' },
					{ status: 403 }
				)
			}

			const finalDealId =
				paymentStatus.SpAccumulationId || paymentStatus.DealId || null

			console.log('💰 [CHECK-PAYMENT] Начисляем средства:', {
				userId,
				amount,
				dealId: finalDealId,
			})

			const updated = await prisma.user.update({
				where: { id: userId },
				data: {
					balance: { increment: amountDecimal },
					transactions: {
						create: {
							amount: amountDecimal,
							type: 'deposit',
							reason: `Пополнение через Т-Банк (ручная проверка, PaymentId: ${paymentId}, DealId: ${
								finalDealId || 'N/A'
							})`,
							dealId: finalDealId,
							paymentId: paymentId,
							status: 'completed',
						},
					},
				},
				select: { balance: true },
			})

			logger.info(
				`✅ Начислено ${amount} ₽ пользователю ${userId} (ручная проверка)`,
				{
					paymentId,
					dealId: finalDealId,
				}
			)

			return NextResponse.json({
				success: true,
				message: 'Средства успешно начислены',
				amount,
				newBalance: updated.balance.toString(),
			})
		} else {
			return NextResponse.json({
				success: false,
				message: `Платеж в статусе: ${paymentStatus.Status}`,
				status: paymentStatus.Status,
			})
		}
	} catch (error: any) {
		console.error('❌ [CHECK-PAYMENT] Ошибка:', error)
		logger.error('Ошибка проверки платежа T-Bank', error)
		return NextResponse.json(
			{ error: error.message || 'Ошибка проверки платежа' },
			{ status: 500 }
		)
	}
}
