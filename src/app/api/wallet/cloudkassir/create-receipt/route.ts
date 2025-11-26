import { getUserFromRequest } from '@/lib/auth'
import { getCloudKassirConfig, createReceipt } from '@/lib/cloudkassir'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint для формирования кассового чека через CloudKassir
 * POST /api/wallet/cloudkassir/create-receipt
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const body = await req.json()
		const {
			amount,
			transactionId,
			email,
			phone,
			description = 'Оплата услуг',
		} = body

		if (!amount || amount <= 0) {
			return NextResponse.json(
				{ error: 'Некорректная сумма' },
				{ status: 400 }
			)
		}

		if (!transactionId) {
			return NextResponse.json(
				{ error: 'Не указан ID транзакции' },
				{ status: 400 }
			)
		}

		// Получаем конфигурацию CloudKassir
		const config = getCloudKassirConfig()

		// Получаем информацию о транзакции
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		})

		if (!transaction) {
			return NextResponse.json(
				{ error: 'Транзакция не найдена' },
				{ status: 404 }
			)
		}

		// Проверяем, что транзакция принадлежит пользователю
		if (transaction.userId !== user.id) {
			return NextResponse.json(
				{ error: 'Доступ запрещен' },
				{ status: 403 }
			)
		}

		// Проверяем, что чек еще не был создан
		if (transaction.receiptId) {
			return NextResponse.json(
				{
					success: true,
					receiptId: transaction.receiptId,
					message: 'Чек уже был создан ранее',
				},
				{ status: 200 }
			)
		}

		// Формируем чек
		const receiptAmount = Number(amount)
		const receiptResponse = await createReceipt(config, {
			inn: config.inn,
			type: 'Income', // Приход
			invoiceId: transactionId,
			accountId: user.id,
			customerReceipt: {
				items: [
					{
						label: description.length > 124 ? description.substring(0, 124) : description,
						price: receiptAmount,
						quantity: 1,
						amount: receiptAmount,
						vat: null, // НДС не облагается (можно настроить)
						method: 4, // Полный расчет
						object: 4, // Услуга
					},
				],
				taxationSystem: Number(process.env.CLOUDKASSIR_TAXATION_SYSTEM || '1'), // УСН Доход (можно настроить)
				amounts: {
					electronic: receiptAmount,
				},
				email: email || transaction.user.email || undefined,
				phone: phone || undefined,
				isInternetPayment: true,
				russiaTimeZone: 2, // Москва (RTZ 2)
			},
		})

		if (!receiptResponse.Success) {
			logger.error('Ошибка создания чека CloudKassir', {
				error: receiptResponse.Message,
				transactionId,
				userId: user.id,
			})

			return NextResponse.json(
				{
					error: receiptResponse.Message || 'Ошибка создания чека',
					warning: receiptResponse.Warning,
				},
				{ status: 400 }
			)
		}

		// Сохраняем ID чека в транзакции
		if (receiptResponse.Model?.Id) {
			await prisma.transaction.update({
				where: { id: transactionId },
				data: {
					receiptId: receiptResponse.Model.Id,
				},
			})
		}

		logger.info('Чек CloudKassir создан', {
			receiptId: receiptResponse.Model?.Id,
			transactionId,
			userId: user.id,
			amount: receiptAmount,
		})

		return NextResponse.json({
			success: true,
			receiptId: receiptResponse.Model?.Id,
			receiptUrl: receiptResponse.Model?.ReceiptLocalUrl,
			message: receiptResponse.Message,
			warning: receiptResponse.Warning,
		})
	} catch (error: any) {
		logger.error('Ошибка создания чека CloudKassir', error)

		if (error.message?.includes('not configured')) {
			return NextResponse.json(
				{ error: 'CloudKassir не настроен' },
				{ status: 500 }
			)
		}

		return NextResponse.json(
			{ error: error.message || 'Ошибка создания чека' },
			{ status: 500 }
		)
	}
}

