// API для исправления отсутствующих DealId в транзакциях комиссии
// Только для администраторов

import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/fix-commission-deal-ids
 * Находит транзакции комиссии без dealId и пытается их исправить
 */
export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Проверяем, что пользователь - админ или владелец платформы
		const platformOwnerId = process.env.PLATFORM_OWNER_ID
		if (user.role !== 'admin' && user.id !== platformOwnerId) {
			return NextResponse.json(
				{ error: 'Недостаточно прав' },
				{ status: 403 }
			)
		}

		// Находим все транзакции комиссии без dealId
		const commissionTxsWithoutDealId = await prisma.transaction.findMany({
			where: {
				type: 'commission',
				dealId: null,
			},
			select: {
				id: true,
				userId: true,
				amount: true,
				reason: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
		})

		logger.info('Найдены транзакции комиссии без DealId', {
			count: commissionTxsWithoutDealId.length,
		})

		if (commissionTxsWithoutDealId.length === 0) {
			return NextResponse.json({
				success: true,
				message: 'Все транзакции комиссии уже имеют DealId',
				fixed: 0,
				total: 0,
			})
		}

		// Находим последние транзакции deposit с dealId
		// Эти dealId можно использовать для комиссий
		const depositsWithDealId = await prisma.transaction.findMany({
			where: {
				type: 'deposit',
				dealId: { not: null },
				paymentId: { not: null },
			},
			select: {
				dealId: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 10, // Берем последние 10 для выбора
		})

		if (depositsWithDealId.length === 0) {
			return NextResponse.json({
				success: false,
				error:
					'Не найдено ни одной транзакции пополнения с DealId. ' +
					'DealId появляется, когда пользователи пополняют баланс через Т-Банк.',
				commissionTxsWithoutDealId: commissionTxsWithoutDealId.length,
			})
		}

		// Используем последний DealId для всех транзакций комиссии без DealId
		// Это не идеальное решение, но позволит владельцу платформы выводить средства
		const latestDealId = depositsWithDealId[0].dealId!

		// Обновляем все транзакции комиссии
		const updateResult = await prisma.transaction.updateMany({
			where: {
				type: 'commission',
				dealId: null,
			},
			data: {
				dealId: latestDealId,
			},
		})

		logger.info('Транзакции комиссии обновлены', {
			updated: updateResult.count,
			dealId: latestDealId,
		})

		return NextResponse.json({
			success: true,
			message: `Обновлено ${updateResult.count} транзакций комиссии`,
			fixed: updateResult.count,
			total: commissionTxsWithoutDealId.length,
			usedDealId: latestDealId,
			note:
				'Теперь вы сможете выводить средства через Т-Банк. ' +
				'Используйте страницу профиля для вывода.',
		})
	} catch (error: any) {
		logger.error('Ошибка исправления DealId в транзакциях комиссии', error)
		return NextResponse.json(
			{
				error: error.message || 'Ошибка сервера',
			},
			{ status: 500 }
		)
	}
}

/**
 * GET /api/admin/fix-commission-deal-ids
 * Показывает статистику по транзакциям комиссии
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Проверяем, что пользователь - админ или владелец платформы
		const platformOwnerId = process.env.PLATFORM_OWNER_ID
		if (user.role !== 'admin' && user.id !== platformOwnerId) {
			return NextResponse.json(
				{ error: 'Недостаточно прав' },
				{ status: 403 }
			)
		}

		// Статистика по транзакциям комиссии
		const [totalCommissions, commissionsWithDealId, commissionsWithoutDealId] =
			await Promise.all([
				prisma.transaction.count({ where: { type: 'commission' } }),
				prisma.transaction.count({
					where: { type: 'commission', dealId: { not: null } },
				}),
				prisma.transaction.count({
					where: { type: 'commission', dealId: null },
				}),
			])

		// Статистика по deposit транзакциям с dealId
		const depositsWithDealId = await prisma.transaction.count({
			where: {
				type: 'deposit',
				dealId: { not: null },
				paymentId: { not: null },
			},
		})

		// Общая сумма комиссий без DealId
		const commissionsWithoutDealIdSum = await prisma.transaction.aggregate({
			where: { type: 'commission', dealId: null },
			_sum: { amount: true },
		})

		return NextResponse.json({
			stats: {
				totalCommissions,
				commissionsWithDealId,
				commissionsWithoutDealId,
				depositsWithDealId,
				sumWithoutDealId: commissionsWithoutDealIdSum._sum.amount?.toNumber() || 0,
			},
			canFix: depositsWithDealId > 0 && commissionsWithoutDealId > 0,
			message:
				commissionsWithoutDealId > 0
					? `Найдено ${commissionsWithoutDealId} транзакций комиссии без DealId. ` +
					  `Отправьте POST запрос для исправления.`
					: 'Все транзакции комиссии имеют DealId.',
		})
	} catch (error: any) {
		logger.error('Ошибка получения статистики транзакций комиссии', error)
		return NextResponse.json(
			{
				error: error.message || 'Ошибка сервера',
			},
			{ status: 500 }
		)
	}
}

