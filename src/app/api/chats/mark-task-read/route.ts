import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		const { taskId } = await req.json()

		if (!taskId) {
			return NextResponse.json(
				{ error: 'Не указан ID задачи' },
				{ status: 400 }
			)
		}

		console.log('📖 Пометка сообщений задачи как прочитанных:', {
			userId: user.id,
			taskId,
		})

		// Проверяем, что пользователь имеет доступ к этой задаче
		const task = await prisma.task.findFirst({
			where: {
				id: taskId,
				OR: [{ customerId: user.id }, { executorId: user.id }],
			},
		})

		if (!task) {
			return NextResponse.json(
				{ error: 'Задача не найдена или нет доступа' },
				{ status: 404 }
			)
		}

		// Обновляем время последнего прочтения сообщений задачи
		// Определяем, является ли пользователь заказчиком или исполнителем
		const updateData: any = {}
		if (task.customerId === user.id) {
			updateData.customerLastReadAt = new Date()
		} else if (task.executorId === user.id) {
			updateData.executorLastReadAt = new Date()
		}

		await prisma.task.update({
			where: { id: taskId },
			data: updateData,
		})

		// Удаляем уведомления о сообщениях в этой задаче
		const deletedNotifications = await prisma.notification.deleteMany({
			where: {
				userId: user.id,
				type: 'message',
				link: `/tasks/${taskId}`,
			},
		})

		console.log(`✅ Сообщения задачи помечены как прочитанные, удалено уведомлений: ${deletedNotifications.count}`)
		
		return NextResponse.json({ 
			success: true,
			deletedNotifications: deletedNotifications.count
		})
	} catch (error) {
		console.error('Ошибка при пометке сообщений задачи как прочитанных:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
