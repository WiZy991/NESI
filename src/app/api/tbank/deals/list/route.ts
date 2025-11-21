import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tbank/deals/list
 * Получает список сделок пользователя
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const deals = await prisma.tBankDeal.findMany({
			where: {
				userId: user.id,
			},
			include: {
				payments: {
					select: {
						id: true,
						paymentId: true,
						amount: true,
						status: true,
						createdAt: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				payouts: {
					select: {
						id: true,
						paymentId: true,
						amount: true,
						status: true,
						isFinal: true,
						createdAt: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 20, // Последние 20 сделок
		})

		return NextResponse.json({
			success: true,
			deals: deals.map(deal => ({
				id: deal.id,
				spAccumulationId: deal.spAccumulationId,
				status: deal.status,
				totalAmount: Number(deal.totalAmount),
				paidAmount: Number(deal.paidAmount),
				remainingBalance: Number(deal.remainingBalance),
				createdAt: deal.createdAt,
				closedAt: deal.closedAt,
				paymentsCount: deal.payments.length,
				payoutsCount: deal.payouts.length,
				payments: deal.payments.map(p => ({
					id: p.id,
					amount: Number(p.amount),
					status: p.status,
					createdAt: p.createdAt,
				})),
				payouts: deal.payouts.map(p => ({
					id: p.id,
					amount: Number(p.amount),
					status: p.status,
					isFinal: p.isFinal,
					createdAt: p.createdAt,
				})),
			})),
		})
	} catch (error) {
		return NextResponse.json(
			{ error: 'Ошибка получения сделок' },
			{ status: 500 }
		)
	}
}
