import { getUserFromRequest } from '@/lib/auth'
import {
	formatMoney,
	hasEnoughBalance,
	parseUserInput,
	toNumber,
} from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const customer = await getUserFromRequest(req)
		if (!customer)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { id: taskId } = await params

		let body: { executorId?: string; price?: unknown }
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		const { executorId, price } = body

		// Валидация executorId
		if (!executorId || typeof executorId !== 'string' || !executorId.trim()) {
			return NextResponse.json(
				{ error: 'ID исполнителя обязателен' },
				{ status: 400 }
			)
		}

		// Валидация price
		if (!price) {
			return NextResponse.json(
				{ error: 'Цена обязательна' },
				{ status: 400 }
			)
		}

		// Парсим цену
		const parsedPrice = parseUserInput(price)
		if (!parsedPrice)
			return NextResponse.json({ error: 'Некорректная цена' }, { status: 400 })

		// Получаем актуальный баланс с учетом замороженных средств
		const freshCustomer = await prisma.user.findUnique({
			where: { id: customer.id },
			select: { balance: true, frozenBalance: true },
		})

		if (
			!freshCustomer ||
			!hasEnoughBalance(
				freshCustomer.balance,
				freshCustomer.frozenBalance,
				parsedPrice
			)
		) {
			const available = freshCustomer
				? toNumber(freshCustomer.balance) -
				  toNumber(freshCustomer.frozenBalance)
				: 0
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Доступно: ${formatMoney(
						available
					)}, требуется: ${formatMoney(parsedPrice)}`,
				},
				{ status: 400 }
			)
		}

		const priceDecimal = new Prisma.Decimal(toNumber(parsedPrice))

		const task = await prisma.task.update({
			where: { id: taskId },
			data: {
				executorId,
				status: 'in_progress',
				escrowAmount: priceDecimal,
			},
		})

		await prisma.user.update({
			where: { id: customer.id },
			data: {
				frozenBalance: { increment: priceDecimal },
				transactions: {
					create: {
						amount: new Prisma.Decimal(0),
						type: 'freeze',
						reason: `Заморозка ${formatMoney(parsedPrice)} для задачи "${
							task.title
						}"`,
					},
				},
			},
		})

		return NextResponse.json({ task })
	} catch (err) {
		logger.error('Ошибка при назначении исполнителя', err, {
			taskId: params?.id,
			customerId: customer?.id,
			executorId,
		})
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
