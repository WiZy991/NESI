/**
 * API для проверки статуса платежа
 */

import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getYooKassaPayment, parseYooKassaAmount } from '@/lib/yookassa'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const paymentId = req.nextUrl.searchParams.get('paymentId')
		if (!paymentId) {
			return NextResponse.json(
				{ error: 'paymentId не указан' },
				{ status: 400 }
			)
		}

		// Получаем информацию о платеже из ЮKassa
		const payment = await getYooKassaPayment(paymentId)

		// Проверяем, что платеж принадлежит текущему пользователю
		if (payment.metadata?.userId !== user.id) {
			return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
		}

		// Если платеж успешен, проверяем был ли он уже зачислен
		if (payment.status === 'succeeded' && payment.paid) {
			const existingTransaction = await prisma.transaction.findFirst({
				where: {
					userId: user.id,
					type: 'yookassa_deposit',
					reason: { contains: payment.id },
				},
			})

			// Если транзакция еще не создана, создаем ее (на случай если вебхук не сработал)
			if (!existingTransaction) {
				const amount = parseYooKassaAmount(payment)
				const amountDecimal = new Prisma.Decimal(amount)

				await prisma.user.update({
					where: { id: user.id },
					data: {
						balance: { increment: amountDecimal },
						transactions: {
							create: {
								amount: amountDecimal,
								type: 'yookassa_deposit',
								reason: `Пополнение через ЮKassa (ID: ${payment.id})`,
								status: 'completed',
							},
						},
					},
				})

				await prisma.notification.create({
					data: {
						userId: user.id,
						type: 'payment',
						message: `Баланс пополнен на ${amount.toFixed(2)} ₽`,
						link: '/wallet',
					},
				})
			}

			return NextResponse.json({
				status: 'succeeded',
				paid: true,
				amount: parseYooKassaAmount(payment),
				processed: true,
			})
		}

		// Возвращаем текущий статус платежа
		return NextResponse.json({
			status: payment.status,
			paid: payment.paid,
			amount: parseYooKassaAmount(payment),
			processed: false,
		})
	} catch (error: any) {
		console.error('Ошибка проверки платежа:', error)
		return NextResponse.json(
			{ error: 'Не удалось проверить платеж', details: error.message },
			{ status: 500 }
		)
	}
}
