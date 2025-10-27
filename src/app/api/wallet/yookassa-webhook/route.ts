/**
 * Вебхук для обработки уведомлений от ЮKassa
 * Документация: https://yookassa.ru/developers/using-api/webhooks
 */

import prisma from '@/lib/prisma'
import { parseYooKassaAmount } from '@/lib/yookassa'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()

		console.log('Получен вебхук от ЮKassa:', body)

		// Проверяем тип события
		if (body.event !== 'payment.succeeded') {
			console.log('Игнорируем событие:', body.event)
			return NextResponse.json({ received: true })
		}

		const payment = body.object

		// Проверяем статус платежа
		if (payment.status !== 'succeeded' || !payment.paid) {
			console.log('Платеж не завершен:', payment.status)
			return NextResponse.json({ received: true })
		}

		// Получаем метаданные
		const userId = payment.metadata?.userId
		if (!userId) {
			console.error('userId не найден в метаданных платежа')
			return NextResponse.json({ error: 'userId not found' }, { status: 400 })
		}

		// Получаем сумму платежа
		const amount = parseYooKassaAmount(payment)
		const amountDecimal = new Prisma.Decimal(amount)

		// Проверяем, не был ли этот платеж уже обработан
		const existingTransaction = await prisma.transaction.findFirst({
			where: {
				type: 'yookassa_deposit',
				reason: { contains: payment.id },
			},
		})

		if (existingTransaction) {
			console.log('Платеж уже обработан:', payment.id)
			return NextResponse.json({ received: true, duplicate: true })
		}

		// Начисляем средства пользователю
		await prisma.user.update({
			where: { id: userId },
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

		// Создаем уведомление для пользователя
		await prisma.notification.create({
			data: {
				userId: userId,
				type: 'payment',
				message: `Баланс пополнен на ${amount.toFixed(2)} ₽`,
				link: '/wallet',
			},
		})

		console.log(`✅ Баланс пользователя ${userId} пополнен на ${amount} ₽`)

		return NextResponse.json({
			received: true,
			processed: true,
			amount: amount,
		})
	} catch (error: any) {
		console.error('Ошибка обработки вебхука ЮKassa:', error)
		return NextResponse.json(
			{ error: 'Webhook processing failed', details: error.message },
			{ status: 500 }
		)
	}
}
