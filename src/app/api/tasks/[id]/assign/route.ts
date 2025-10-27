// app/api/tasks/[id]/assign/route.ts
import { getUserFromRequest } from '@/lib/auth'
import { formatMoney, hasEnoughBalance, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function POST(req: Request, context: { params: { id: string } }) {
	try {
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { id: taskId } = context.params
		const { executorId } = await req.json()

		const task = await prisma.task.findUnique({ where: { id: taskId } })
		if (!task)
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })

		if (task.customerId !== user.id) {
			return NextResponse.json(
				{ error: 'Нет прав назначать исполнителя' },
				{ status: 403 }
			)
		}

		if (task.executorId) {
			return NextResponse.json(
				{ error: 'Исполнитель уже назначен' },
				{ status: 400 }
			)
		}

		// Берём цену отклика по паре (taskId + executorId)
		const response = await prisma.taskResponse.findFirst({
			where: { taskId, userId: executorId },
		})

		if (!response || !response.price) {
			return NextResponse.json(
				{ error: 'Отклик или цена не найдены' },
				{ status: 400 }
			)
		}

		const price = response.price

		// 🔥 КРИТИЧНО: Проверяем баланс ПЕРЕД назначением исполнителя
		const customer = await prisma.user.findUnique({
			where: { id: user.id },
			select: { balance: true, frozenBalance: true },
		})

		if (!customer) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			)
		}

		// Проверяем, достаточно ли свободных средств
		if (!hasEnoughBalance(customer.balance, customer.frozenBalance, price)) {
			const available =
				toNumber(customer.balance) - toNumber(customer.frozenBalance)
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Требуется: ${formatMoney(price)}, доступно: ${formatMoney(
						available
					)}`,
					required: toNumber(price),
					available: available,
				},
				{ status: 400 }
			)
		}

		// Конвертируем в Prisma Decimal для транзакции
		const priceDecimal = new Prisma.Decimal(toNumber(price))

		await prisma.$transaction([
			// Обновляем задачу
			prisma.task.update({
				where: { id: taskId },
				data: {
					executorId,
					status: 'in_progress',
					escrowAmount: priceDecimal, // 💰 сумма заморозки
				},
			}),

			// У заказчика: списываем с баланса и морозим
			prisma.user.update({
				where: { id: user.id },
				data: {
					balance: { decrement: priceDecimal },
					frozenBalance: { increment: priceDecimal },
					transactions: {
						create: {
							amount: new Prisma.Decimal(-toNumber(price)),
							type: 'freeze',
							reason: `Заморозка ${formatMoney(price)} для задачи "${
								task.title
							}"`,
						},
					},
				},
			}),
		])

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Ошибка при назначении исполнителя:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
