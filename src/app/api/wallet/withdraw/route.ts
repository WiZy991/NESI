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
import { logActivity, sendAdminAlert, validateWithdrawal } from '@/lib/antifraud'

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
		
		const amountNumber = toNumber(parsedAmount)

		// 🛡️ Anti-fraud проверки перед выводом
		const validationResult = await validateWithdrawal(user.id, amountNumber)
		
		if (!validationResult.allowed) {
			// Логируем неудачную попытку вывода
			await logActivity(user.id, 'withdraw_blocked', req, {
				amount: amountNumber,
				reason: validationResult.error,
			})
			
			return NextResponse.json({ error: validationResult.error }, { status: 400 })
		}
		
		// Если есть предупреждение - логируем
		if (validationResult.warning) {
			console.log(`⚠️ Вывод с предупреждением: ${user.email} - ${validationResult.warning}`)
		}
		
		// Уведомляем админа при больших суммах для новых аккаунтов
		const userDetails = await prisma.user.findUnique({
			where: { id: user.id },
			select: { createdAt: true, email: true },
		})
		
		if (userDetails) {
			const accountAge = Date.now() - userDetails.createdAt.getTime()
			const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000
			
			if (isNewAccount && amountNumber > 3000) {
				await sendAdminAlert(
					`Новый аккаунт "${userDetails.email}" выводит ${formatMoney(amountNumber)}`,
					`/admin/users/${user.id}`,
					{ amount: amountNumber, accountAgeDays: Math.floor(accountAge / (24 * 60 * 60 * 1000)) }
				)
			}
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
		
		// 📊 Логируем успешный вывод
		await logActivity(user.id, 'withdraw_success', req, {
			amount: amountNumber,
			newBalance: toNumber(updated.balance),
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
