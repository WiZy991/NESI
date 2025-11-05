// app/api/tasks/[id]/assign/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { formatMoney, hasEnoughBalance, toNumber } from '@/lib/money'
import { createNotification } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'

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

			// У заказчика: только морозим средства (без списания с баланса)
			prisma.user.update({
				where: { id: user.id },
				data: {
					frozenBalance: { increment: priceDecimal },
					transactions: {
						create: {
							amount: new Prisma.Decimal(0),
							type: 'freeze',
							reason: `Заморозка ${formatMoney(price)} для задачи "${
								task.title
							}"`,
						},
					},
				},
			}),
		])

		// Отправляем уведомление исполнителю о назначении на задачу
		try {
			const customerName = user.fullName || user.email
			const notificationMessage = `Вас назначили на задачу "${
				task.title
			}" (${formatMoney(price)})`

			// Создаем уведомление в БД
			const dbNotification = await createNotification({
				userId: executorId,
				message: notificationMessage,
				link: `/tasks/${taskId}`,
				type: 'assignment',
			})

			// Отправляем SSE уведомление
			sendNotificationToUser(executorId, {
				id: dbNotification.id, // Включаем ID из БД для дедупликации
				type: 'assignment',
				title: 'Вас назначили на задачу',
				message: notificationMessage,
				link: `/tasks/${taskId}`,
				playSound: true,
			})

			console.log(
				'✅ Уведомление о назначении отправлено исполнителю:',
				executorId
			)
		} catch (notifError) {
			console.error('❌ Ошибка отправки уведомления о назначении:', notifError)
		}

		// 🎯 Проверяем достижения для заказчика после назначения исполнителя (для uniqueExecutors)
		let awardedBadges: Array<{ id: string; name: string; icon: string; description?: string }> = []
		try {
			console.log(`[Badges] 🔍 Проверяем достижения для заказчика ${user.id} после назначения исполнителя для задачи ${taskId}`)
			const newBadges = await checkAndAwardBadges(user.id)
			if (newBadges.length > 0) {
				const badgeIds = newBadges.map(b => b.id)
				const fullBadges = await prisma.badge.findMany({
					where: { id: { in: badgeIds } },
					select: { id: true, name: true, icon: true, description: true }
				})
				awardedBadges = fullBadges.map((badge: any) => ({
					id: badge.id,
					name: badge.name,
					icon: badge.icon,
					description: badge.description
				}))
				console.log(`[Badges] ✅ Заказчику ${user.id} начислено ${awardedBadges.length} достижений:`, awardedBadges.map(b => b.name))
			}
		} catch (badgeError) {
			console.error('[Badges] ❌ Ошибка проверки достижений для заказчика:', badgeError)
		}

		return NextResponse.json({ task, awardedBadges })
	} catch (err: any) {
		console.error('Ошибка при назначении исполнителя:', err)
		return NextResponse.json({ error: err.message || 'Ошибка сервера' }, { status: 500 })
	}
}
