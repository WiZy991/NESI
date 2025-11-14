import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotificationWithSettings } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { recordTaskResponseStatus } from '@/lib/taskResponseStatus'
import { NextRequest, NextResponse } from 'next/server'
import { validateWithZod, taskResponseSchema } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'
import { canTakeMoreTasks } from '@/lib/level/taskLimit'

export async function POST(req: NextRequest) {
	const { pathname } = req.nextUrl
	const idMatch = pathname.match(/\/api\/tasks\/([^/]+)\/responses/)
	const taskId = idMatch?.[1]

	if (!taskId) {
		return NextResponse.json({ error: 'Некорректный путь' }, { status: 400 })
	}

	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	let body
	try {
		body = await req.json()
	} catch (error) {
		return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
	}

	// Валидация данных
	const validation = validateWithZod(taskResponseSchema, body)
	if (!validation.success) {
		return NextResponse.json(
			{ error: validation.errors.join(', ') },
			{ status: 400 }
		)
	}

	const { message, price } = validation.data

	// Дополнительная валидация длины сообщения
	const messageValidation = validateStringLength(message || '', 2000, 'Сообщение')
	if (!messageValidation.valid) {
		return NextResponse.json(
			{ error: messageValidation.error },
			{ status: 400 }
		)
	}

	const task = await prisma.task.findUnique({
		where: { id: taskId },
		include: {
			subcategory: {
				select: {
					minPrice: true,
				},
			},
		},
	})

	if (!task) {
		return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
	}

	if (task.status !== 'open') {
		return NextResponse.json(
			{ error: 'Задача не доступна для откликов' },
			{ status: 400 }
		)
	}

	const existing = await prisma.taskResponse.findFirst({
		where: {
			taskId,
			userId: user.id,
		},
	})

	if (existing) {
		return NextResponse.json({ error: 'Вы уже откликались' }, { status: 400 })
	}

	// 🔒 Проверяем лимит задач по уровню
	const taskLimit = await canTakeMoreTasks(user.id)
	if (!taskLimit.canTake) {
		return NextResponse.json(
			{ 
				error: `У вас уже максимальное количество активных задач (${taskLimit.activeCount}/${taskLimit.maxCount}). Завершите текущие задачи, чтобы взять новые.`,
				activeCount: taskLimit.activeCount,
				maxCount: taskLimit.maxCount
			},
			{ status: 409 }
		)
	}

	// 💰 Проверка минимальной ставки
	const minPrice = task.subcategory?.minPrice ?? 0
	if (price < minPrice) {
		return NextResponse.json(
			{ error: `Минимальная ставка по категории — ${minPrice}₽` },
			{ status: 400 }
		)
	}

	const response = await prisma.$transaction(async tx => {
		const created = await tx.taskResponse.create({
			data: {
				taskId,
				userId: user.id,
				message,
				price,
			},
		})

		await recordTaskResponseStatus(created.id, 'pending', {
			changedById: user.id,
			note: 'Отклик отправлен',
			tx,
		})

		return created
	})

	// 🔔 Создаём уведомление для заказчика задачи
	const dbNotification = await createNotificationWithSettings({
		userId: task.customerId,
		message: `${user.fullName || user.email} откликнулся на задачу "${
			task.title
		}"`,
		link: `/tasks/${task.id}`,
		type: 'response',
	})

	// Если уведомление отключено в настройках, не отправляем SSE
	if (dbNotification) {
		// Отправляем уведомление в реальном времени
		sendNotificationToUser(task.customerId, {
			id: dbNotification.id, // Включаем ID из БД для дедупликации
			type: 'response',
			title: 'Новый отклик на задачу',
			message: `${user.fullName || user.email} откликнулся на задачу "${
				task.title
			}"`,
			link: `/tasks/${task.id}`,
			taskTitle: task.title,
			senderId: user.id,
			sender: user.fullName || user.email,
			playSound: true,
		})
	}

	return NextResponse.json({ response })
}
