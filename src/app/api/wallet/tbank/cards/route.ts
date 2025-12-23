/**
 * API для работы с привязанными картами T-Bank
 * 
 * GET - получить список привязанных карт пользователя
 * DELETE - удалить привязанную карту
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { TBankPayoutClient } from '@/lib/tbank/client'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

/**
 * GET /api/wallet/tbank/cards
 * 
 * Возвращает список привязанных карт пользователя
 * Синхронизирует с T-Bank если нужно
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Получаем карты из нашей БД (перед синком)
		let cards = await prisma.tBankCard.findMany({
			where: { 
				userId: user.id,
				status: 'A', // Только активные
			},
			orderBy: [
				{ isDefault: 'desc' }, // Дефолтная карта первой
				{ createdAt: 'desc' },
			],
			select: {
				id: true,
				cardId: true,
				pan: true,
				expDate: true,
				isDefault: true,
				createdAt: true,
			},
		})

		// Всегда пытаемся синхронизировать с Т-Банк (карты могли быть привязаны, но webhook не дошёл)
		try {
			const client = new TBankPayoutClient()
			const remote = await client.getCardList(user.id)

			if (remote.Success && remote.Cards && remote.Cards.length > 0) {
				// Проверяем, есть ли уже дефолтные активные карты
				const hasDefault = await prisma.tBankCard.count({
					where: { userId: user.id, status: 'A', isDefault: true },
				})

				for (const [index, rc] of remote.Cards.entries()) {
					// Проверяем, существует ли карта и не была ли она удалена пользователем
					const existingCard = await prisma.tBankCard.findUnique({
						where: {
							// @ts-ignore composite unique
							userId_cardId: { userId: user.id, cardId: rc.CardId },
						},
						select: { status: true },
					})

					// Если карта была удалена пользователем (status: 'D'), не восстанавливаем её
					if (existingCard && existingCard.status === 'D') {
						logger.info('Skipping sync for user-deleted card', {
							userId: user.id,
							cardId: rc.CardId,
						})
						continue
					}

					await prisma.tBankCard.upsert({
						where: {
							// @ts-ignore composite unique
							userId_cardId: { userId: user.id, cardId: rc.CardId },
						},
						update: {
							pan: rc.Pan || 'Unknown',
							expDate: rc.ExpDate || 'Unknown',
							// Восстанавливаем статус только если карта не была удалена
							status: existingCard?.status === 'D' ? 'D' : 'A',
							rebillId: rc.RebillId || null,
							cardType: 1,
							updatedAt: new Date(),
						},
						create: {
							userId: user.id,
							cardId: rc.CardId,
							pan: rc.Pan || 'Unknown',
							expDate: rc.ExpDate || 'Unknown',
							status: 'A',
							rebillId: rc.RebillId || null,
							cardType: 1,
							isDefault: hasDefault === 0 && index === 0,
						},
					})
				}

				// Перечитываем из БД после синка
				cards = await prisma.tBankCard.findMany({
					where: { 
						userId: user.id,
						status: 'A',
					},
					orderBy: [
						{ isDefault: 'desc' },
						{ createdAt: 'desc' },
					],
					select: {
						id: true,
						cardId: true,
						pan: true,
						expDate: true,
						isDefault: true,
						createdAt: true,
					},
				})
			}
		} catch (syncError) {
			logger.warn('TBank sync cards failed', {
				userId: user.id,
				error: syncError instanceof Error ? syncError.message : String(syncError),
			})
		}

		return NextResponse.json({
			success: true,
			cards: cards.map(card => ({
				id: card.id,
				cardId: card.cardId,
				pan: card.pan, // Маскированный номер карты
				expDate: card.expDate,
				isDefault: card.isDefault,
				createdAt: card.createdAt,
			})),
		})

	} catch (error) {
		logger.error('Get cards error', error instanceof Error ? error : undefined, {
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		return NextResponse.json(
			{ error: 'Ошибка получения списка карт' },
			{ status: 500 }
		)
	}
}

/**
 * DELETE /api/wallet/tbank/cards?cardId=xxx
 * 
 * Удаляет привязанную карту
 */
export async function DELETE(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const cardId = req.nextUrl.searchParams.get('cardId')
		
		if (!cardId) {
			return NextResponse.json({ error: 'Не указан ID карты' }, { status: 400 })
		}

		// Находим карту в БД
		const card = await prisma.tBankCard.findFirst({
			where: {
				userId: user.id,
				cardId,
			},
		})

		if (!card) {
			return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		// Удаляем карту из T-Bank E2C
		// ВАЖНО: Используем E2C клиент, так как карты привязываются через E2C
		const client = new TBankPayoutClient()
		
		try {
			const removeResult = await client.removeCard(user.id, cardId)
			
			if (!removeResult.Success) {
				logger.warn('TBank E2C RemoveCard failed, but removing from DB anyway', {
					userId: user.id,
					cardId,
					errorCode: removeResult.ErrorCode,
					message: removeResult.Message,
				})
				// Не прерываем - удаляем из нашей БД в любом случае
			}
		} catch (tbankError) {
			logger.warn('TBank E2C RemoveCard error, but removing from DB anyway', {
				userId: user.id,
				cardId,
				error: tbankError instanceof Error ? tbankError.message : String(tbankError),
			})
			// Не прерываем - удаляем из нашей БД в любом случае
		}

		// Помечаем карту как удаленную в нашей БД
		await prisma.tBankCard.update({
			where: { id: card.id },
			data: {
				status: 'D', // Deleted
				isDefault: false,
			},
		})

		// Если это была дефолтная карта, назначаем новую дефолтную
		if (card.isDefault) {
			const nextCard = await prisma.tBankCard.findFirst({
				where: {
					userId: user.id,
					status: 'A',
				},
				orderBy: { createdAt: 'desc' },
			})

			if (nextCard) {
				await prisma.tBankCard.update({
					where: { id: nextCard.id },
					data: { isDefault: true },
				})
			}
		}

		logger.info('Card removed', {
			userId: user.id,
			cardId,
			pan: card.pan,
		})

		return NextResponse.json({ success: true })

	} catch (error) {
		logger.error('Delete card error', error instanceof Error ? error : undefined, {
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		return NextResponse.json(
			{ error: 'Ошибка удаления карты' },
			{ status: 500 }
		)
	}
}

/**
 * PATCH /api/wallet/tbank/cards
 * 
 * Устанавливает карту по умолчанию
 */
export async function PATCH(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const body = await req.json()
		const { cardId } = body

		if (!cardId) {
			return NextResponse.json({ error: 'Не указан ID карты' }, { status: 400 })
		}

		// Находим карту
		const card = await prisma.tBankCard.findFirst({
			where: {
				userId: user.id,
				cardId,
				status: 'A',
			},
		})

		if (!card) {
			return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		// Сбрасываем isDefault у всех карт пользователя и устанавливаем для выбранной
		await prisma.$transaction([
			prisma.tBankCard.updateMany({
				where: { userId: user.id },
				data: { isDefault: false },
			}),
			prisma.tBankCard.update({
				where: { id: card.id },
				data: { isDefault: true },
			}),
		])

		logger.info('Default card set', {
			userId: user.id,
			cardId,
			pan: card.pan,
		})

		return NextResponse.json({ success: true })

	} catch (error) {
		logger.error('Set default card error', error instanceof Error ? error : undefined, {
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		return NextResponse.json(
			{ error: 'Ошибка установки карты по умолчанию' },
			{ status: 500 }
		)
	}
}

