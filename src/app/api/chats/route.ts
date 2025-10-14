import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		console.log('🔍 Получение чатов для пользователя:', user.id)

		// Получаем приватные сообщения пользователя
		const privateMessages = await prisma.privateMessage.findMany({
			where: {
				OR: [{ senderId: user.id }, { recipientId: user.id }],
			},
			include: {
				sender: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarUrl: true,
					},
				},
				recipient: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarUrl: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})

		// Получаем сообщения из задач пользователя
		const taskMessages = await prisma.message.findMany({
			where: {
				OR: [
					{ senderId: user.id },
					{
						task: {
							OR: [{ customerId: user.id }, { executorId: user.id }],
						},
					},
				],
			},
			include: {
				sender: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarUrl: true,
					},
				},
				task: {
					select: {
						id: true,
						title: true,
						customerId: true,
						executorId: true,
						customerLastReadAt: true,
						executorLastReadAt: true,
						customer: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
							},
						},
						executor: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})

		// Группируем приватные сообщения по собеседникам
		const privateChats = new Map<string, any>()
		privateMessages.forEach(msg => {
			const otherUserId =
				msg.senderId === user.id ? msg.recipientId : msg.senderId
			const otherUser = msg.senderId === user.id ? msg.recipient : msg.sender

			if (!privateChats.has(otherUserId)) {
				privateChats.set(otherUserId, {
					id: `private_${otherUserId}`,
					type: 'private',
					otherUser,
					lastMessage: msg,
					unreadCount: 0,
					messages: [],
				})
			}

			// Добавляем сообщение в чат
			privateChats.get(otherUserId).messages.push(msg)
		})

		// Получаем данные пользователя для времени последнего прочтения
		const userData = await prisma.user.findUnique({
			where: { id: user.id },
			select: { lastPrivateMessageReadAt: true },
		})

		// Подсчитываем непрочитанные сообщения для приватных чатов
		privateChats.forEach((chat, otherUserId) => {
			// Считаем только сообщения, которые НЕ отправил текущий пользователь
			const otherUserMessages = chat.messages.filter(
				(msg: any) => msg.senderId !== user.id
			)

			// Если есть время последнего прочтения, считаем только сообщения после этого времени
			if (userData?.lastPrivateMessageReadAt) {
				chat.unreadCount = otherUserMessages.filter(
					(msg: any) =>
						new Date(msg.createdAt) > userData.lastPrivateMessageReadAt!
				).length
			} else {
				// Если нет времени прочтения, считаем все сообщения от других как непрочитанные
				chat.unreadCount = otherUserMessages.length
			}

			console.log(`📱 Приватный чат с ${otherUserId}:`, {
				totalMessages: chat.messages.length,
				otherUserMessages: otherUserMessages.length,
				unreadCount: chat.unreadCount,
				lastReadAt: userData?.lastPrivateMessageReadAt,
			})
		})

		// Группируем сообщения из задач по задачам
		const taskChats = new Map<string, any>()
		taskMessages.forEach(msg => {
			const taskId = msg.taskId
			const otherUser =
				msg.senderId === user.id
					? msg.task.executorId === user.id
						? msg.task.customer
						: msg.task.executor
					: msg.sender

			if (!taskChats.has(taskId)) {
				taskChats.set(taskId, {
					id: `task_${taskId}`,
					type: 'task',
					task: msg.task,
					otherUser,
					lastMessage: msg,
					unreadCount: 0,
					messages: [],
				})
			}

			// Добавляем сообщение в чат
			taskChats.get(taskId).messages.push(msg)
		})

		// Подсчитываем непрочитанные сообщения для чатов задач
		taskChats.forEach((chat, taskId) => {
			// Считаем только сообщения, которые НЕ отправил текущий пользователь
			const otherUserMessages = chat.messages.filter(
				(msg: any) => msg.senderId !== user.id
			)

			// Определяем время последнего прочтения в зависимости от роли пользователя
			let lastReadAt: Date | null = null
			if (chat.task.customerId === user.id) {
				lastReadAt = chat.task.customerLastReadAt
			} else if (chat.task.executorId === user.id) {
				lastReadAt = chat.task.executorLastReadAt
			}

			// Если есть время последнего прочтения, считаем только сообщения после этого времени
			if (lastReadAt) {
				chat.unreadCount = otherUserMessages.filter(
					(msg: any) => new Date(msg.createdAt) > lastReadAt!
				).length
			} else {
				// Если нет времени прочтения, считаем все сообщения от других как непрочитанные
				chat.unreadCount = otherUserMessages.length
			}

			console.log(`📋 Чат задачи ${taskId}:`, {
				totalMessages: chat.messages.length,
				otherUserMessages: otherUserMessages.length,
				unreadCount: chat.unreadCount,
				lastReadAt,
				userRole: chat.task.customerId === user.id ? 'customer' : 'executor',
			})
		})

		// Объединяем все чаты и сортируем по последнему сообщению
		const allChats = [
			...Array.from(privateChats.values()),
			...Array.from(taskChats.values()),
		].sort(
			(a, b) =>
				new Date(b.lastMessage.createdAt).getTime() -
				new Date(a.lastMessage.createdAt).getTime()
		)

		console.log('📊 Найдено чатов:', {
			privateMessages: privateMessages.length,
			taskMessages: taskMessages.length,
			privateChats: privateChats.size,
			taskChats: taskChats.size,
			totalChats: allChats.length,
			userLastReadAt: userData?.lastPrivateMessageReadAt,
		})

		return NextResponse.json({ chats: allChats })
	} catch (error) {
		console.error('Ошибка получения чатов:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
