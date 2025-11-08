import { getChatKey } from '@/lib/chatActivity'
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

		const privateChatNormalizedMap = new Map<string, string>()
		const privatePresenceKeys: Array<{ chatId: string; otherUserId: string }> = []

		// Подсчитываем непрочитанные сообщения для приватных чатов
		privateChats.forEach((chat, otherUserId) => {
			const normalizedChatId = getChatKey('private', {
				chatType: 'private',
				userA: user.id,
				userB: otherUserId,
			})
			privateChatNormalizedMap.set(otherUserId, normalizedChatId)
			privatePresenceKeys.push({ chatId: normalizedChatId, otherUserId })

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
		
		// Определяем другого участника на основе роли текущего пользователя в задаче
		// Если я заказчик - другой участник это исполнитель, и наоборот
		const otherUser = user.id === msg.task.customerId 
			? msg.task.executor 
			: msg.task.customer

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

		const taskChatNormalizedMap = new Map<string, string>()
		const taskPresenceKeys: Array<{
			chatId: string
			taskId: string
			otherUserId?: string
		}> = []

		// Подсчитываем непрочитанные сообщения для чатов задач
		taskChats.forEach((chat, taskId) => {
			const normalizedChatId = getChatKey('task', {
				chatType: 'task',
				taskId,
			})
			taskChatNormalizedMap.set(taskId, normalizedChatId)
			taskPresenceKeys.push({
				chatId: normalizedChatId,
				taskId,
				otherUserId: chat.otherUser?.id,
			})

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

		const presenceConditions: any[] = []
		if (privatePresenceKeys.length > 0) {
			presenceConditions.push({
				chatType: 'private',
				chatId: { in: privatePresenceKeys.map(item => item.chatId) },
			})
		}
		if (taskPresenceKeys.length > 0) {
			presenceConditions.push({
				chatType: 'task',
				chatId: { in: taskPresenceKeys.map(item => item.chatId) },
			})
		}

		let activityRecords: any[] = []
		if (presenceConditions.length > 0) {
			try {
				activityRecords = await prisma.chatActivity.findMany({
					where: { OR: presenceConditions },
				})
			} catch (presenceError: any) {
				const isSchemaIssue =
					presenceError?.code === 'P2021' ||
					presenceError?.message?.includes('ChatActivity')

				if (isSchemaIssue) {
					console.warn(
						'⚠️ Таблица ChatActivity недоступна (вероятно, миграция не применена). Пропускаем данные присутствия.'
					)
				} else {
					console.error('❌ Ошибка загрузки активности чатов:', presenceError)
				}

				activityRecords = []
			}
		}

		const presenceLookup = new Map<string, (typeof activityRecords)[number]>()
		for (const record of activityRecords) {
			presenceLookup.set(
				`${record.chatType}:${record.chatId}:${record.userId}`,
				record
			)
		}

		privateChats.forEach((chat, otherUserId) => {
			const normalizedChatId = privateChatNormalizedMap.get(otherUserId)
			if (!normalizedChatId) return

			const presence = presenceLookup.get(
				`private:${normalizedChatId}:${otherUserId}`
			)

			chat.presence = presence
				? {
						lastReadAt: presence.lastReadAt
							? presence.lastReadAt.toISOString()
							: null,
						lastActivityAt: presence.lastActivityAt
							? presence.lastActivityAt.toISOString()
							: null,
						typingAt: presence.typingAt
							? presence.typingAt.toISOString()
							: null,
				  }
				: null
		})

		taskChats.forEach((chat, taskId) => {
			const normalizedChatId = taskChatNormalizedMap.get(taskId)
			if (!normalizedChatId) return
			const otherUserId = chat.otherUser?.id
			if (!otherUserId) return

			const presence = presenceLookup.get(
				`task:${normalizedChatId}:${otherUserId}`
			)

			chat.presence = presence
				? {
						lastReadAt: presence.lastReadAt
							? presence.lastReadAt.toISOString()
							: null,
						lastActivityAt: presence.lastActivityAt
							? presence.lastActivityAt.toISOString()
							: null,
						typingAt: presence.typingAt
							? presence.typingAt.toISOString()
							: null,
				  }
				: null
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

		// Добавляем отладочную информацию для аватарок
		console.log('🖼️ Аватарки в приватных чатах:')
		privateChats.forEach((chat, userId) => {
			console.log(`  Пользователь ${userId}:`, {
				fullName: chat.otherUser?.fullName,
				email: chat.otherUser?.email,
				avatarUrl: chat.otherUser?.avatarUrl,
			})
		})

		console.log('🖼️ Аватарки в чатах задач:')
		taskChats.forEach((chat, taskId) => {
			console.log(`  Задача ${taskId}:`, {
				customer: {
					fullName: chat.task?.customer?.fullName,
					email: chat.task?.customer?.email,
					avatarUrl: chat.task?.customer?.avatarUrl,
				},
				executor: {
					fullName: chat.task?.executor?.fullName,
					email: chat.task?.executor?.email,
					avatarUrl: chat.task?.executor?.avatarUrl,
				},
			})
		})

		return NextResponse.json({ chats: allChats })
	} catch (error) {
		console.error('Ошибка получения чатов:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
