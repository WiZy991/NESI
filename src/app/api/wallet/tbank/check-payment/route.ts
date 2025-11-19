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

			// SpAccumulationId может быть числом, конвертируем в строку
			const apiDealId = paymentStatus.SpAccumulationId || paymentStatus.DealId
			let finalDealId = apiDealId ? String(apiDealId) : null

			console.log('🔍 [CHECK-PAYMENT] Получен ответ от GetState:', {
				hasSpAccumulationId: !!paymentStatus.SpAccumulationId,
				hasDealId: !!paymentStatus.DealId,
				spAccumulationId: paymentStatus.SpAccumulationId,
				dealId: paymentStatus.DealId,
				allFields: Object.keys(paymentStatus),
				note: 'GetState может не возвращать DealId - он приходит только в вебхуке',
			})

			// Если DealId не получен из GetState, пытаемся найти его в существующих транзакциях
			if (!finalDealId) {
				const existingTx = await prisma.transaction.findFirst({
					where: {
						userId: userId,
						paymentId: paymentId,
					},
					select: { dealId: true },
				})
				if (existingTx?.dealId) {
					finalDealId = existingTx.dealId
					console.log('📋 [CHECK-PAYMENT] Найден DealId из существующей транзакции:', finalDealId)
				}
			}

			// ВАЖНО: GetState может не вернуть DealId, он приходит только в вебхуке
			// Если DealId не получен, предупреждаем пользователя
			if (!finalDealId) {
				console.warn('⚠️ [CHECK-PAYMENT] DealId не получен из GetState. Это нормально - DealId приходит только в вебхуке после успешного холдирования средств.')
			}

			console.log('💰 [CHECK-PAYMENT] Начисляем средства:', {
				userId,
				amount,
				dealId: finalDealId,
				paymentId,
			})

			// Проверяем, не создана ли уже транзакция
			const existingTransaction = await prisma.transaction.findFirst({
				where: {
					userId: userId,
					paymentId: paymentId,
				},
			})

			let updated
			if (existingTransaction) {
				// Обновляем существующую транзакцию с DealId, если его не было
				if (!existingTransaction.dealId && finalDealId) {
					await prisma.transaction.update({
						where: { id: existingTransaction.id },
						data: { dealId: finalDealId },
					})
					console.log('✅ [CHECK-PAYMENT] Обновлен DealId в существующей транзакции')
				}
				updated = await prisma.user.findUnique({
					where: { id: userId },
					select: { balance: true },
				})
			} else {
				// Создаем новую транзакцию
				updated = await prisma.user.update({
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
			}

			logger.info(
				`✅ Начислено ${amount} ₽ пользователю ${userId} (ручная проверка)`,
				{
					paymentId,
					dealId: finalDealId,
				}
			)

			// Если DealId не был получен, предупреждаем пользователя
			const responseMessage = finalDealId 
				? 'Средства успешно начислены'
				: 'Средства успешно начислены. Внимание: DealId не был получен. Он придет в вебхуке после обработки платежа Т-Банком. Для вывода средств может потребоваться подождать 1-2 минуты или использовать кнопку "Обновить DealId".'

			return NextResponse.json({
				success: true,
				message: responseMessage,
				amount,
				newBalance: updated.balance.toString(),
				dealId: finalDealId,
				warning: !finalDealId ? 'DealId не получен. Он придет в вебхуке после обработки платежа Т-Банком.' : undefined,
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
