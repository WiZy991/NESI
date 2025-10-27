import { getUserFromRequest } from '@/lib/auth'
import {
	formatMoney,
	hasEnoughBalance,
	isPositiveAmount,
	parseUserInput,
	toNumber,
} from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { amount } = await req.json()

		// Парсим и валидируем сумму
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		// Проверка, хватает ли денег (с учетом замороженного баланса)
		const fresh = await prisma.user.findUnique({
			where: { id: user.id },
			select: { balance: true, frozenBalance: true },
		})

		if (
			!fresh ||
			!hasEnoughBalance(fresh.balance, fresh.frozenBalance, parsedAmount)
		) {
			const available = fresh
				? toNumber(fresh.balance) - toNumber(fresh.frozenBalance)
				: 0
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Доступно: ${formatMoney(
						available
					)}, требуется: ${formatMoney(parsedAmount)}`,
				},
				{ status: 400 }
			)
		}

		const amountDecimal = new Prisma.Decimal(toNumber(parsedAmount))

		const updated = await prisma.user.update({
			where: { id: user.id },
			data: {
				balance: { decrement: amountDecimal },
				transactions: {
					create: {
						amount: new Prisma.Decimal(-toNumber(parsedAmount)),
						type: 'withdraw',
						reason: 'Вывод средств',
					},
				},
			},
			select: { balance: true },
		})

		return NextResponse.json({
			success: true,
			balance: toNumber(updated.balance),
		})
	} catch (err) {
		console.error('Ошибка вывода:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
