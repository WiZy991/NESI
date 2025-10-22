import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import { createNotification } from '@/lib/notify'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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

	const { message, price } = await req.json()

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

	// 💰 Проверка минимальной ставки
	const minPrice = task.subcategory?.minPrice ?? 0
	if (price < minPrice) {
		return NextResponse.json(
			{ error: `Минимальная ставка по категории — ${minPrice}₽` },
			{ status: 400 }
		)
	}

	const response = await prisma.taskResponse.create({
		data: {
			taskId,
			userId: user.id,
			message,
			price,
		},
	})

	// 🔔 Создаём уведомление для заказчика задачи
	await createNotification({
		userId: task.customerId,
		message: `${user.fullName || user.email} откликнулся на задачу "${
			task.title
		}"`,
		link: `/tasks/${task.id}`,
		type: 'response',
	})

	// Отправляем уведомление в реальном времени
	sendNotificationToUser(task.customerId, {
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

	return NextResponse.json({ response })
}
