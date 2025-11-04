// app/api/tasks/[id]/complete/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { formatMoney, toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: any) {
	try {
		const { id } = params
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const task = await prisma.task.findUnique({
		where: { id },
		select: {
			id: true,
			title: true,
			customerId: true,
			executorId: true,
			status: true,
			escrowAmount: true,
		},
	})

		if (!task)
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
		if (task.customerId !== user.id)
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		if (task.status !== 'in_progress')
			return NextResponse.json(
				{ error: 'Можно завершить только задачу в работе' },
				{ status: 400 }
			)
		if (!task.executorId)
			return NextResponse.json(
				{ error: 'У задачи нет назначенного исполнителя' },
				{ status: 400 }
			)

		// Вычисляем комиссию 20% и выплату
		const escrowNum = toNumber(task.escrowAmount)
		const commission = Math.floor(escrowNum * 100 * 0.2) / 100 // Округляем до копеек
		const payout = escrowNum - commission

		const commissionDecimal = new Prisma.Decimal(commission)
		const payoutDecimal = new Prisma.Decimal(payout)

		// 💰 Получаем ID владельца платформы из env
		const platformOwnerId = process.env.PLATFORM_OWNER_ID

		// Формируем транзакции для владельца платформы
		const ownerTransactions = []
		if (platformOwnerId) {
			ownerTransactions.push(
				prisma.user.update({
					where: { id: platformOwnerId },
					data: {
						balance: { increment: commissionDecimal },
						transactions: {
							create: {
								amount: commissionDecimal,
								type: 'commission',
								reason: `Комиссия платформы 20% с задачи "${task.title}"`,
							},
						},
					},
				})
			)
		} else {
			console.warn(
				'⚠️ PLATFORM_OWNER_ID не настроен! Комиссия не будет начислена.'
			)
		}

		await prisma.$transaction([
			// Завершаем задачу
			prisma.task.update({
				where: { id: task.id },
				data: {
					status: 'completed',
					completedAt: new Date(),
					escrowAmount: new Prisma.Decimal(0),
				},
			}),

			// У заказчика: списываем с баланса и размораживаем
			prisma.user.update({
				where: { id: task.customerId },
				data: {
					balance: { decrement: new Prisma.Decimal(escrowNum) },
					frozenBalance: { decrement: new Prisma.Decimal(escrowNum) },
					transactions: {
						create: [
							{
								amount: new Prisma.Decimal(-escrowNum),
								type: 'payment',
								reason: `Оплата за задачу "${task.title}"`,
							},
							{
								amount: new Prisma.Decimal(-commission),
								type: 'commission',
								reason: `Комиссия 20% с задачи "${task.title}"`,
							},
						],
					},
				},
			}),

			// Исполнителю: начисляем выплату (80%)
			prisma.user.update({
				where: { id: task.executorId },
				data: {
					balance: { increment: payoutDecimal },
					transactions: {
						create: {
							amount: payoutDecimal,
							type: 'earn',
							reason: `Выплата за задачу "${task.title}"`,
						},
					},
				},
			}),

			// 💰 Владельцу платформы: начисляем комиссию (20%)
			...ownerTransactions,

			// Создаём уведомление для исполнителя
			prisma.notification.create({
				data: {
					userId: task.executorId,
					type: 'payment',
					message: `Задача "${
						task.title
					}" завершена! Вам начислено ${formatMoney(payout)}`,
					link: `/tasks/${task.id}`,
				},
			}),
		])

		// Отправляем уведомление в реальном времени
		sendNotificationToUser(task.executorId, {
			type: 'payment',
			title: 'Задача завершена',
			message: `Задача "${task.title}" завершена! Вам начислено ${formatMoney(
				payout
			)}`,
			link: `/tasks/${task.id}`,
			taskTitle: task.title,
			amount: payout,
			playSound: true,
		})

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Ошибка при завершении задачи:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
