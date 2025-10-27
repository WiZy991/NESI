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

export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const customer = await getUserFromRequest(req)
		if (!customer)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { executorId, price } = await req.json()
		if (!executorId || !price)
			return NextResponse.json({ error: 'Данные не указаны' }, { status: 400 })

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
			where: { id: params.id },
			data: {
				executorId,
				status: 'in_progress',
				escrowAmount: priceDecimal,
			},
		})

		await prisma.user.update({
			where: { id: customer.id },
			data: {
				balance: { decrement: priceDecimal },
				frozenBalance: { increment: priceDecimal },
				transactions: {
					create: {
						amount: new Prisma.Decimal(-toNumber(parsedPrice)),
						type: 'freeze',
						reason: `Заморозка для задачи "${task.title}"`,
					},
				},
			},
		})

		return NextResponse.json({ task })
	} catch (err) {
		console.error('Ошибка при назначении исполнителя:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
