import { getUserFromRequest } from '@/lib/auth'
import { isPositiveAmount, parseUserInput, toNumber } from '@/lib/money'
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

		const amountDecimal = new Prisma.Decimal(toNumber(parsedAmount))

		const updated = await prisma.user.update({
			where: { id: user.id },
			data: {
				balance: { increment: amountDecimal },
				transactions: {
					create: {
						amount: amountDecimal,
						type: 'deposit',
						reason: 'Пополнение баланса',
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
		console.error('Ошибка пополнения:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
