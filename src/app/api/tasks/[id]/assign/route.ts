// app/api/tasks/[id]/assign/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { formatMoney, hasEnoughBalance, toNumber } from '@/lib/money'
import { createNotificationWithSettings } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { recordTaskResponseStatus } from '@/lib/taskResponseStatus'
import { checkAndAwardBadges } from '@/lib/badges/checkBadges'
import { canTakeMoreTasks } from '@/lib/level/taskLimit'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { id: taskId } = await context.params
		
		let body
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		// Валидация executorId
		if (!body.executorId || typeof body.executorId !== 'string' || !body.executorId.trim()) {
			return NextResponse.json(
				{ error: 'ID исполнителя обязателен' },
				{ status: 400 }
			)
		}

		const executorId = body.executorId.trim()

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

		// 🔒 Проверяем лимит задач по уровню исполнителя
		const taskLimit = await canTakeMoreTasks(executorId)
		if (!taskLimit.canTake) {
			return NextResponse.json(
				{ 
					error: `У исполнителя уже максимальное количество активных задач (${taskLimit.activeCount}/${taskLimit.maxCount}). Завершите текущие задачи, чтобы взять новые.`,
					activeCount: taskLimit.activeCount,
					maxCount: taskLimit.maxCount
				},
				{ status: 409 }
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

		// Конвертируем все значения для логирования
		const balanceNum = toNumber(customer.balance)
		const frozenNum = toNumber(customer.frozenBalance)
		const priceNum = toNumber(price)
		const available = balanceNum - frozenNum

		// Логируем для диагностики
		logger.debug('Проверка баланса при назначении исполнителя', {
			userId: user.id,
			taskId,
			balance: balanceNum,
			frozenBalance: frozenNum,
			availableBalance: available,
			requiredPrice: priceNum,
			hasEnough: hasEnoughBalance(customer.balance, customer.frozenBalance, price),
		})

		// Проверяем, достаточно ли свободных средств
		if (!hasEnoughBalance(customer.balance, customer.frozenBalance, price)) {
			logger.warn('Недостаточно средств для назначения исполнителя', {
				userId: user.id,
				taskId,
				balance: balanceNum,
				frozenBalance: frozenNum,
				availableBalance: available,
				requiredPrice: priceNum,
			})
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Требуется: ${formatMoney(price)}, доступно: ${formatMoney(
						available
					)}`,
					required: priceNum,
					available: available,
					balance: balanceNum,
					frozenBalance: frozenNum,
				},
				{ status: 400 }
			)
		}

		// Конвертируем в Prisma Decimal для транзакции
		const priceDecimal = new Prisma.Decimal(toNumber(price))

		await prisma.$transaction(async (tx) => {
			// 🔒 Дополнительная проверка в транзакции (защита от race condition)
			const taskCheck = await tx.task.findUnique({
				where: { id: taskId },
				select: { executorId: true, status: true },
			})

			if (!taskCheck) {
				throw new Error('Задача не найдена')
			}

			if (taskCheck.executorId) {
				throw new Error('Исполнитель уже назначен')
			}

			if (taskCheck.status !== 'open') {
				throw new Error('Задача недоступна для назначения')
			}

			// 🔒 Проверяем лимит задач по уровню внутри транзакции
			// Получаем данные исполнителя для расчета уровня
			const executor = await tx.user.findUnique({
				where: { id: executorId },
				select: { xp: true },
			})

			if (!executor) {
				throw new Error('Исполнитель не найден')
			}

			// Подсчитываем активные задачи (исключая текущую)
			const activeTasksCount = await tx.task.count({
				where: {
					executorId,
					status: 'in_progress',
					id: { not: taskId },
				},
			})

			// Получаем бонусный XP за сертификации
			const passedTests = await tx.certificationAttempt.count({
				where: { userId: executorId, passed: true },
			})
			const xpComputed = (executor.xp || 0) + passedTests * 10

			// Получаем уровень и лимит
			const { getLevelFromXP } = await import('@/lib/level/calculate')
			const { getMaxTasksForLevel } = await import('@/lib/level/rewards')
			const levelInfo = await getLevelFromXP(xpComputed)
			const maxCount = getMaxTasksForLevel(levelInfo.level)

			// Проверяем лимит (учитывая, что мы собираемся добавить еще одну задачу)
			if (activeTasksCount >= maxCount) {
				throw new Error(`У исполнителя уже максимальное количество активных задач (${activeTasksCount}/${maxCount})`)
			}

			// Обновляем задачу
			await tx.task.update({
				where: { id: taskId },
				data: {
					executorId,
					status: 'in_progress',
					escrowAmount: priceDecimal,
				},
			})

			// У заказчика: только морозим средства (без списания с баланса)
			await tx.user.update({
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
			})

			// 🗑️ Автоматически удаляем все отклики этого исполнителя из других открытых задач
			await tx.taskResponse.deleteMany({
				where: {
					userId: executorId,
					task: {
						status: 'open',
						id: { not: taskId }, // Не удаляем отклик из текущей задачи
					},
				},
			})
		})

		await recordTaskResponseStatus(response.id, 'hired', {
			changedById: user.id,
			note: 'Исполнитель назначен на задачу',
		})

		// Отправляем уведомление исполнителю о назначении на задачу
		try {
			const customerName = user.fullName || user.email
			const notificationMessage = `Вас назначили на задачу "${
				task.title
			}" (${formatMoney(price)})`

			// Создаем уведомление в БД
			const dbNotification = await createNotificationWithSettings({
				userId: executorId,
				message: notificationMessage,
				link: `/tasks/${taskId}`,
				type: 'assignment',
			})

			// Если уведомление отключено в настройках, не отправляем SSE
			if (dbNotification) {
				// Отправляем SSE уведомление
				sendNotificationToUser(executorId, {
					id: dbNotification.id, // Включаем ID из БД для дедупликации
				type: 'assignment',
				title: 'Вас назначили на задачу',
				message: notificationMessage,
				link: `/tasks/${taskId}`,
				playSound: true,
			})

			logger.debug('Уведомление о назначении отправлено исполнителю', { executorId, taskId })
			}
		} catch (notifError) {
			logger.error('Ошибка отправки уведомления о назначении', notifError, { executorId, taskId })
		}

		// 🎯 Проверяем достижения для заказчика после назначения исполнителя (для uniqueExecutors)
		let awardedBadges: Array<{ id: string; name: string; icon: string; description?: string }> = []
		try {
			logger.debug('Проверяем достижения для заказчика после назначения исполнителя', { userId: user.id, taskId })
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
				logger.info('Заказчику начислены достижения', { 
					userId: user.id, 
					badgesCount: awardedBadges.length,
					badgeNames: awardedBadges.map(b => b.name)
				})
			}
		} catch (badgeError) {
			logger.error('Ошибка проверки достижений для заказчика', badgeError, { userId: user.id, taskId })
		}

		return NextResponse.json({ task, awardedBadges })
	} catch (err: any) {
		logger.error('Ошибка при назначении исполнителя', err, { taskId })
		return NextResponse.json({ error: err.message || 'Ошибка сервера' }, { status: 500 })
	}
}
