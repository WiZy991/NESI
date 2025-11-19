import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
	let user
	try {
		user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
	} catch (authError: any) {
		logger.error('Ошибка аутентификации при получении непрочитанных сообщений', authError)
		return NextResponse.json({ error: 'Ошибка аутентификации' }, { status: 401 })
	}

	try {
		logger.debug('Получение количества непрочитанных сообщений для пользователя', {
			userId: user.id,
		})

		// Получаем данные пользователя для времени последнего прочтения
		let userData
		try {
			userData = await prisma.user.findUnique({
				where: { id: user.id },
				select: { lastPrivateMessageReadAt: true },
			})
		} catch (userDataError: any) {
			logger.warn('Ошибка получения данных пользователя', { error: userDataError, userId: user.id })
			userData = null
		}

		// Подсчитываем непрочитанные приватные сообщения
		let unreadPrivateMessages = 0
		try {
			unreadPrivateMessages = await prisma.privateMessage.count({
				where: {
					recipientId: user.id,
					NOT: { senderId: user.id }, // Исключаем свои сообщения
					...(userData?.lastPrivateMessageReadAt && {
						createdAt: { gt: userData.lastPrivateMessageReadAt },
					}),
				},
			})
		} catch (privateMsgError: any) {
			logger.warn('Ошибка подсчета непрочитанных приватных сообщений', { error: privateMsgError, userId: user.id })
			// Продолжаем с 0
		}

		// Подсчитываем непрочитанные сообщения из задач
		let unreadTaskMessages = 0
		try {
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

			// Обрабатываем задачи пакетами для оптимизации
			const taskIds = userTasks.map(t => t.id)
			if (taskIds.length > 0) {
				// Получаем все непрочитанные сообщения для всех задач одним запросом
				const allUnreadMessages = await prisma.message.findMany({
					where: {
						taskId: { in: taskIds },
						NOT: { senderId: user.id },
					},
					select: {
						taskId: true,
						createdAt: true,
					},
				})

				// Группируем по задачам и проверяем время последнего прочтения
				for (const task of userTasks) {
					// Определяем время последнего прочтения в зависимости от роли пользователя
					let lastReadAt: Date | null = null
					if (task.customerId === user.id) {
						lastReadAt = task.customerLastReadAt
					} else if (task.executorId === user.id) {
						lastReadAt = task.executorLastReadAt
					}

					// Подсчитываем непрочитанные сообщения для этой задачи
					const taskUnreadCount = allUnreadMessages.filter(msg => {
						if (msg.taskId !== task.id) return false
						if (!lastReadAt) return true
						return new Date(msg.createdAt) > lastReadAt
					}).length

					unreadTaskMessages += taskUnreadCount
				}
			}
		} catch (taskMsgError: any) {
			logger.warn('Ошибка подсчета непрочитанных сообщений из задач', { error: taskMsgError, userId: user.id })
			// Продолжаем с 0
		}

		const totalUnread = unreadPrivateMessages + unreadTaskMessages

		logger.debug('Непрочитанные сообщения', {
			private: unreadPrivateMessages,
			task: unreadTaskMessages,
			total: totalUnread,
			userId: user.id,
		})

		return NextResponse.json({ unreadCount: totalUnread })
	} catch (error: any) {
		logger.error('Ошибка получения количества непрочитанных сообщений', error, {
			userId: user?.id,
			errorMessage: error?.message,
			errorStack: error?.stack?.substring(0, 500),
		})
		return NextResponse.json(
			{ 
				error: 'Ошибка сервера',
				details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
			}, 
			{ status: 500 }
		)
	}
}
