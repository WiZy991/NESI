import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		console.log(
			'🔔 Получение количества непрочитанных сообщений для пользователя:',
			user.id
		)

		// Получаем данные пользователя для времени последнего прочтения
		const userData = await prisma.user.findUnique({
			where: { id: user.id },
			select: { lastPrivateMessageReadAt: true },
		})

		// Подсчитываем непрочитанные приватные сообщения
		const unreadPrivateMessages = await prisma.privateMessage.count({
			where: {
				recipientId: user.id,
				NOT: { senderId: user.id }, // Исключаем свои сообщения
				...(userData?.lastPrivateMessageReadAt && {
					createdAt: { gt: userData.lastPrivateMessageReadAt },
				}),
			},
		})

		// Подсчитываем непрочитанные сообщения из задач
		// Сначала получаем задачи пользователя с временем последнего прочтения
		const userTasks = await prisma.task.findMany({
			where: {
				OR: [{ customerId: user.id }, { executorId: user.id }],
			},
			select: {
				id: true,
				customerId: true,
				executorId: true,
				customerLastReadAt: true,
				executorLastReadAt: true,
			},
		})

		let unreadTaskMessages = 0
		for (const task of userTasks) {
			// Определяем время последнего прочтения в зависимости от роли пользователя
			let lastReadAt: Date | null = null
			if (task.customerId === user.id) {
				lastReadAt = task.customerLastReadAt
			} else if (task.executorId === user.id) {
				lastReadAt = task.executorLastReadAt
			}

			// Подсчитываем непрочитанные сообщения для этой задачи
			const taskUnreadCount = await prisma.message.count({
				where: {
					taskId: task.id,
					NOT: { senderId: user.id }, // Исключаем сообщения от самого пользователя
					...(lastReadAt && {
						createdAt: { gt: lastReadAt },
					}),
				},
			})

			unreadTaskMessages += taskUnreadCount
		}

		const totalUnread = unreadPrivateMessages + unreadTaskMessages

		console.log('📊 Непрочитанные сообщения:', {
			private: unreadPrivateMessages,
			task: unreadTaskMessages,
			total: totalUnread,
		})

		return NextResponse.json({ unreadCount: totalUnread })
	} catch (error) {
		console.error('Ошибка получения количества непрочитанных сообщений:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
