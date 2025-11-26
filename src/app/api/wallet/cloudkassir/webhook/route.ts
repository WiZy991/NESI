import { getCloudKassirConfig, verifyReceiptWebhook } from '@/lib/cloudkassir'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Webhook для получения уведомлений о чеках от CloudKassir
 * POST /api/wallet/cloudkassir/webhook
 * 
 * Документация: https://cloudpayments.ru/docs/api/kassa#receipt
 */
export async function POST(req: NextRequest) {
	try {
		const config = getCloudKassirConfig()

		// Получаем тело запроса как строку для проверки HMAC
		const bodyText = await req.text()
		const body = JSON.parse(bodyText)

		// Проверяем HMAC подпись (если передана)
		const receivedHmac = req.headers.get('X-Content-HMAC') || req.headers.get('Content-HMAC')
		if (receivedHmac) {
			const isValid = verifyReceiptWebhook(config.apiSecret, bodyText, receivedHmac)
			if (!isValid) {
				logger.warn('Неверная HMAC подпись в webhook CloudKassir', {
					receiptId: body.Id,
				})
				return NextResponse.json({ code: 1 }, { status: 401 })
			}
		}

		// Обрабатываем уведомление о чеке
		const {
			Id: receiptId,
			DocumentNumber,
			SessionNumber,
			Number: receiptNumber,
			FiscalSign,
			DeviceNumber,
			RegNumber,
			FiscalNumber,
			Inn,
			Type,
			Ofd,
			Url: receiptUrl,
			QrCodeUrl,
			TransactionId,
			Amount,
			DateTime,
			InvoiceId,
			AccountId,
		} = body

		logger.info('Получено уведомление о чеке CloudKassir', {
			receiptId,
			transactionId: TransactionId,
			invoiceId: InvoiceId,
			accountId: AccountId,
			amount: Amount,
		})

		// Обновляем транзакцию, если указан InvoiceId (ID транзакции)
		if (InvoiceId) {
			try {
				await prisma.transaction.update({
					where: { id: InvoiceId },
					data: {
						receiptId: receiptId,
						receiptData: {
							documentNumber: DocumentNumber,
							sessionNumber: SessionNumber,
							receiptNumber: receiptNumber,
							fiscalSign: FiscalSign,
							deviceNumber: DeviceNumber,
							regNumber: RegNumber,
							fiscalNumber: FiscalNumber,
							ofd: Ofd,
							receiptUrl: receiptUrl,
							qrCodeUrl: QrCodeUrl,
							dateTime: DateTime,
						} as any,
					},
				})

				logger.info('Транзакция обновлена данными чека', {
					transactionId: InvoiceId,
					receiptId,
				})
			} catch (error: any) {
				logger.error('Ошибка обновления транзакции данными чека', {
					error: error.message,
					transactionId: InvoiceId,
					receiptId,
				})
				// Не прерываем выполнение, так как чек уже пробит
			}
		}

		// Возвращаем успешный ответ
		return NextResponse.json({ code: 0 })
	} catch (error: any) {
		logger.error('Ошибка обработки webhook CloudKassir', error)

		// Возвращаем ошибку, чтобы CloudKassir повторил отправку
		return NextResponse.json(
			{ code: 1, message: error.message },
			{ status: 500 }
		)
	}
}

