/**
 * Вспомогательные функции для автоматического создания чеков CloudKassir
 */

import { getCloudKassirConfig, createReceipt } from '@/lib/cloudkassir'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { toNumber } from '@/lib/money'

/**
 * Автоматически создает чек для транзакции пополнения
 */
export async function createReceiptForDeposit(transactionId: string): Promise<{
	success: boolean
	receiptId?: string
	error?: string
}> {
	try {
		// Проверяем, включено ли автоматическое создание чеков
		if (process.env.CLOUDKASSIR_AUTO_CREATE_RECEIPTS !== 'true') {
			return { success: false, error: 'Автоматическое создание чеков отключено' }
		}

		// Получаем транзакцию
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		})

		if (!transaction) {
			return { success: false, error: 'Транзакция не найдена' }
		}

		// Проверяем, что это транзакция пополнения со статусом completed
		if (transaction.type !== 'deposit' || transaction.status !== 'completed') {
			return {
				success: false,
				error: 'Чек можно создать только для завершенных транзакций пополнения',
			}
		}

		// Проверяем, что чек еще не был создан
		if (transaction.receiptId) {
			return {
				success: true,
				receiptId: transaction.receiptId,
			}
		}

		// Получаем конфигурацию CloudKassir
		const config = getCloudKassirConfig()

		// Формируем чек
		const amount = toNumber(transaction.amount)
		const receiptResponse = await createReceipt(config, {
			inn: config.inn,
			type: 'Income', // Приход
			invoiceId: transactionId,
			accountId: transaction.userId,
			customerReceipt: {
				items: [
					{
						label:
							transaction.reason.length > 124
								? transaction.reason.substring(0, 124)
								: transaction.reason,
						price: amount,
						quantity: 1,
						amount: amount,
						vat: null, // НДС не облагается (можно настроить через env)
						method: 4, // Полный расчет
						object: 4, // Услуга
					},
				],
				taxationSystem: Number(process.env.CLOUDKASSIR_TAXATION_SYSTEM || '1'), // УСН Доход
				amounts: {
					electronic: amount,
				},
				email: transaction.user.email || undefined,
				phone: transaction.user.phone || undefined,
				isInternetPayment: true,
				russiaTimeZone: Number(process.env.CLOUDKASSIR_TIMEZONE || '2'), // Москва (RTZ 2)
			},
		})

		if (!receiptResponse.Success) {
			logger.error('Ошибка создания чека CloudKassir', {
				error: receiptResponse.Message,
				transactionId,
				userId: transaction.userId,
			})

			return {
				success: false,
				error: receiptResponse.Message || 'Ошибка создания чека',
			}
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

		logger.info('Чек CloudKassir создан автоматически', {
			receiptId: receiptResponse.Model?.Id,
			transactionId,
			userId: transaction.userId,
			amount,
		})

		return {
			success: true,
			receiptId: receiptResponse.Model?.Id,
		}
	} catch (error: any) {
		logger.error('Ошибка автоматического создания чека CloudKassir', error)

		if (error.message?.includes('not configured')) {
			return { success: false, error: 'CloudKassir не настроен' }
		}

		return {
			success: false,
			error: error.message || 'Ошибка создания чека',
		}
	}
}

