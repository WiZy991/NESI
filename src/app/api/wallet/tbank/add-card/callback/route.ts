/**
 * Webhook для обработки нотификаций от T-Bank о привязке карты
 * 
 * Документация: раздел 4.3 "Нотификация о привязке карты"
 * 
 * После успешной привязки карты T-Bank отправляет POST-запрос 
 * с информацией о привязанной карте
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { generateTBankToken } from '@/lib/tbank/crypto'
import { TBANK_CONFIG } from '@/lib/tbank/config'

export async function POST(req: NextRequest) {
	try {
		// Получаем данные из нотификации
		let body: Record<string, any>
		
		const contentType = req.headers.get('content-type') || ''
		
		if (contentType.includes('application/json')) {
			body = await req.json()
		} else if (contentType.includes('application/x-www-form-urlencoded')) {
			const formData = await req.formData()
			body = Object.fromEntries(formData.entries())
		} else {
			// Пробуем парсить как JSON по умолчанию
			body = await req.json()
		}

		logger.info('TBank AddCard notification received', {
			terminalKey: body.TerminalKey,
			customerKey: body.CustomerKey,
			requestKey: body.RequestKey,
			cardId: body.CardId,
			pan: body.Pan,
			status: body.Status,
			success: body.Success,
		})

		// Проверяем подпись (Token)
		if (body.Token) {
			const expectedToken = generateTBankToken(
				{
					TerminalKey: body.TerminalKey,
					CustomerKey: body.CustomerKey,
					RequestKey: body.RequestKey,
					CardId: body.CardId,
					Pan: body.Pan,
					ExpDate: body.ExpDate,
					Status: body.Status,
					Success: body.Success,
					ErrorCode: body.ErrorCode,
					RebillId: body.RebillId,
				},
				TBANK_CONFIG.E2C_TERMINAL_PASSWORD
			)

			if (body.Token !== expectedToken) {
				logger.warn('TBank AddCard notification: invalid token', {
					received: body.Token,
					expected: expectedToken,
					customerKey: body.CustomerKey,
				})
				// Не отклоняем сразу - продолжаем обработку с логированием
			}
		}

		// Проверяем успешность привязки
		if (body.Success !== true && body.Success !== 'true') {
			logger.error('TBank AddCard notification: card binding failed', undefined, {
				customerKey: body.CustomerKey,
				errorCode: body.ErrorCode,
				status: body.Status,
			})
			// Всё равно возвращаем OK, чтобы T-Bank не повторял нотификацию
			return new NextResponse('OK', { status: 200 })
		}

		// CustomerKey - это userId
		const userId = body.CustomerKey

		if (!userId || !body.CardId) {
			logger.error('TBank AddCard notification: missing data', undefined, {
				customerKey: body.CustomerKey,
				cardId: body.CardId,
			})
			return new NextResponse('OK', { status: 200 })
		}

		// Проверяем, существует ли уже такая карта
		// @ts-ignore - TBankCard будет доступен после миграции
		const existingCard = await prisma.tBankCard.findUnique({
			where: {
				userId_cardId: {
					userId,
					cardId: body.CardId,
				},
			},
		})

		if (existingCard) {
			// Обновляем существующую карту
			// @ts-ignore
			await prisma.tBankCard.update({
				where: { id: existingCard.id },
				data: {
					pan: body.Pan || existingCard.pan,
					expDate: body.ExpDate || existingCard.expDate,
					status: 'A', // Активна
					rebillId: body.RebillId || existingCard.rebillId,
					updatedAt: new Date(),
				},
			})
			
			logger.info('TBank AddCard: card updated', {
				userId,
				cardId: body.CardId,
				pan: body.Pan,
			})
		} else {
			// Создаем новую запись о карте
			// Проверяем, есть ли у пользователя другие карты - если нет, делаем эту дефолтной
			// @ts-ignore
			const existingCards = await prisma.tBankCard.count({
				where: { userId, status: 'A' },
			})

			// @ts-ignore
			await prisma.tBankCard.create({
				data: {
					userId,
					cardId: body.CardId,
					pan: body.Pan || 'Unknown',
					expDate: body.ExpDate || 'Unknown',
					cardType: 1, // 1 = карта пополнения (для выплат)
					status: 'A', // Активна
					rebillId: body.RebillId || null,
					isDefault: existingCards === 0, // Первая карта - дефолтная
				},
			})

			logger.info('TBank AddCard: new card saved', {
				userId,
				cardId: body.CardId,
				pan: body.Pan,
				isDefault: existingCards === 0,
			})
		}

		// T-Bank ожидает ответ "OK" для подтверждения получения нотификации
		return new NextResponse('OK', { status: 200 })

	} catch (error) {
		logger.error('TBank AddCard callback error', error instanceof Error ? error : undefined, {
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		
		// Возвращаем ошибку - T-Bank будет повторять нотификацию
		return new NextResponse('ERROR', { status: 500 })
	}
}

