import { getChatKey } from '@/lib/chatActivity'
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
		logger.error('Ошибка аутентификации в /api/chats', authError)
		return NextResponse.json({ error: 'Ошибка аутентификации' }, { status: 401 })
	}

	try {
		// Пагинация для чатов
		const { searchParams } = new URL(req.url)
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Максимум 100
		const offset = parseInt(searchParams.get('offset') || '0')

		logger.debug('Получение чатов для пользователя', { userId: user.id, limit, offset })

		// Оптимизированный запрос: получаем только последние сообщения для каждого чата
		// Используем raw SQL для эффективной группировки по собеседникам
		// Сначала получаем ID последних сообщений для каждого приватного чата
		let latestPrivateMessageIds: Array<{ id: string }> = []
		try {
			latestPrivateMessageIds = await prisma.$queryRaw<Array<{ id: string }>>`
				SELECT DISTINCT ON (
					CASE 
						WHEN "senderId" = ${user.id} THEN "recipientId"
						ELSE "senderId"
					END
				) id
				FROM "PrivateMessage"
				WHERE "senderId" = ${user.id} OR "recipientId" = ${user.id}
				ORDER BY 
					CASE 
						WHEN "senderId" = ${user.id} THEN "recipientId"
						ELSE "senderId"
					END,
					"createdAt" DESC
				LIMIT ${limit}
			`
		} catch (sqlError: any) {
			logger.error('Ошибка выполнения raw SQL для приватных сообщений', sqlError, {
				userId: user.id,
				limit,
				errorCode: sqlError?.code,
			})
			// Fallback: используем обычный запрос Prisma
			const allPrivateMessages = await prisma.privateMessage.findMany({
				where: {
					OR: [{ senderId: user.id }, { recipientId: user.id }],
				},
				select: { id: true },
				orderBy: { createdAt: 'desc' },
				take: limit,
			})
			latestPrivateMessageIds = allPrivateMessages.map(m => ({ id: m.id }))
		}

		const latestPrivateIds = latestPrivateMessageIds.map(m => m.id)

		// Получаем только последние сообщения для приватных чатов
		const privateMessages = latestPrivateIds.length > 0
			? await prisma.privateMessage.findMany({
					where: {
						id: { in: latestPrivateIds },
					},
					select: {
						id: true,
						content: true,
						createdAt: true,
						senderId: true,
						recipientId: true,
						sender: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarFileId: true,
							},
						},
						recipient: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarFileId: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
			  })
			: []

		// Аналогично для сообщений из задач - получаем только последние сообщения для каждой задачи
		let latestTaskMessageIds: Array<{ id: string }> = []
		try {
			latestTaskMessageIds = await prisma.$queryRaw<Array<{ id: string }>>`
				SELECT DISTINCT ON ("taskId") id
				FROM "Message"
				WHERE "senderId" = ${user.id} 
					OR EXISTS (
						SELECT 1 FROM "Task" 
						WHERE "Task"."id" = "Message"."taskId" 
						AND ("Task"."customerId" = ${user.id} OR "Task"."executorId" = ${user.id})
					)
				ORDER BY "taskId", "createdAt" DESC
				LIMIT ${limit}
			`
		} catch (sqlError: any) {
			logger.error('Ошибка выполнения raw SQL для сообщений задач', sqlError, {
				userId: user.id,
				limit,
				errorCode: sqlError?.code,
			})
			// Fallback: используем обычный запрос Prisma
			// Получаем задачи пользователя
			const userTasks = await prisma.task.findMany({
				where: {
					OR: [{ customerId: user.id }, { executorId: user.id }],
				},
				select: { id: true },
			})
			const taskIds = userTasks.map(t => t.id)
			if (taskIds.length > 0) {
				// Для каждой задачи получаем только последнее сообщение
				const taskMessagesMap = new Map<string, string>()
				for (const taskId of taskIds) {
					const lastMessage = await prisma.message.findFirst({
						where: { taskId },
						select: { id: true },
						orderBy: { createdAt: 'desc' },
					})
					if (lastMessage) {
						taskMessagesMap.set(taskId, lastMessage.id)
					}
				}
				latestTaskMessageIds = Array.from(taskMessagesMap.values()).map(id => ({ id }))
			}
		}

		const latestTaskIds = latestTaskMessageIds.map(m => m.id)

		// Получаем только последние сообщения для чатов задач
		const taskMessages = latestTaskIds.length > 0
			? await prisma.message.findMany({
					where: {
						id: { in: latestTaskIds },
					},
					select: {
						id: true,
						content: true,
						createdAt: true,
						senderId: true,
						taskId: true,
						sender: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarFileId: true,
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
										avatarFileId: true,
									},
								},
								executor: {
									select: {
										id: true,
										fullName: true,
										email: true,
										avatarFileId: true,
									},
								},
							},
						},
					},
					orderBy: { createdAt: 'desc' },
			  })
			: []

		// Группируем приватные сообщения по собеседникам
		const privateChats = new Map<string, any>()
		privateMessages.forEach(msg => {
			const otherUserId =
				msg.senderId === user.id ? msg.recipientId : msg.senderId
			const otherUser = msg.senderId === user.id ? msg.recipient : msg.sender

			if (!privateChats.has(otherUserId)) {
				// Формируем otherUser с avatarUrl из avatarFileId
				const otherUserWithAvatar = {
					...otherUser,
					avatarUrl: otherUser.avatarFileId ? `/api/files/${otherUser.avatarFileId}` : null,
				}

				privateChats.set(otherUserId, {
					id: `private_${otherUserId}`,
					type: 'private',
					otherUser: otherUserWithAvatar,
					lastMessage: {
						id: msg.id,
						content: msg.content,
						createdAt: msg.createdAt,
						sender: {
							id: msg.senderId,
							fullName: msg.sender.fullName,
							email: msg.sender.email,
						},
					},
					unreadCount: 0,
				})
			}
		})

		// Получаем данные пользователя для времени последнего прочтения
		const userData = await prisma.user.findUnique({
			where: { id: user.id },
			select: { lastPrivateMessageReadAt: true },
		})

		const privateChatNormalizedMap = new Map<string, string>()
		const privatePresenceKeys: Array<{ chatId: string; otherUserId: string }> = []

		// Подсчитываем непрочитанные сообщения для приватных чатов
		// Используем отдельный запрос для эффективного подсчета
		const unreadCountsPrivate = await Promise.all(
			Array.from(privateChats.keys()).map(async otherUserId => {
				try {
					const normalizedChatId = getChatKey('private', {
						chatType: 'private',
						userA: user.id,
						userB: otherUserId,
					})
					privateChatNormalizedMap.set(otherUserId, normalizedChatId)
					privatePresenceKeys.push({ chatId: normalizedChatId, otherUserId })

					// Подсчитываем непрочитанные сообщения
					const unreadCount = await prisma.privateMessage.count({
						where: {
							senderId: otherUserId,
							recipientId: user.id,
							...(userData?.lastPrivateMessageReadAt && {
								createdAt: { gt: userData.lastPrivateMessageReadAt },
							}),
						},
					})

					return { otherUserId, unreadCount }
				} catch (error: any) {
					logger.error('Ошибка подсчета непрочитанных приватных сообщений', error, {
						otherUserId,
						userId: user.id,
					})
					return { otherUserId, unreadCount: 0 }
				}
			})
		)

		// Применяем подсчеты непрочитанных
		unreadCountsPrivate.forEach(({ otherUserId, unreadCount }) => {
			const chat = privateChats.get(otherUserId)
			if (chat) {
				chat.unreadCount = unreadCount
				logger.debug('Приватный чат', {
					otherUserId,
					unreadCount,
					lastReadAt: userData?.lastPrivateMessageReadAt,
				})
			}
		})

		// Группируем сообщения из задач по задачам
		const taskChats = new Map<string, any>()
		taskMessages.forEach(msg => {
			const taskId = msg.taskId

			// Определяем другого участника на основе роли текущего пользователя в задаче
			// Если я заказчик - другой участник это исполнитель, и наоборот
			const otherUserRaw = user.id === msg.task.customerId ? msg.task.executor : msg.task.customer
			const otherUser = otherUserRaw
				? {
						...otherUserRaw,
						avatarUrl: otherUserRaw.avatarFileId ? `/api/files/${otherUserRaw.avatarFileId}` : null,
				  }
				: null

			if (!taskChats.has(taskId)) {
				taskChats.set(taskId, {
					id: `task_${taskId}`,
					type: 'task',
					task: {
						...msg.task,
						customer: msg.task.customer
							? {
									...msg.task.customer,
									avatarUrl: msg.task.customer.avatarFileId
										? `/api/files/${msg.task.customer.avatarFileId}`
										: null,
							  }
							: null,
						executor: msg.task.executor
							? {
									...msg.task.executor,
									avatarUrl: msg.task.executor.avatarFileId
										? `/api/files/${msg.task.executor.avatarFileId}`
										: null,
							  }
							: null,
					},
					otherUser,
					lastMessage: {
						id: msg.id,
						content: msg.content,
						createdAt: msg.createdAt,
						sender: {
							id: msg.senderId,
							fullName: msg.sender.fullName,
							email: msg.sender.email,
						},
					},
					unreadCount: 0,
				})
			}
		})

		const taskChatNormalizedMap = new Map<string, string>()
		const taskPresenceKeys: Array<{
			chatId: string
			taskId: string
			otherUserId?: string
		}> = []

		// Подсчитываем непрочитанные сообщения для чатов задач
		// Используем отдельный запрос для эффективного подсчета
		const unreadCountsTask = await Promise.all(
			Array.from(taskChats.entries()).map(async ([taskId, chat]) => {
				try {
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

					// Определяем время последнего прочтения в зависимости от роли пользователя
					let lastReadAt: Date | null = null
					if (chat.task.customerId === user.id) {
						lastReadAt = chat.task.customerLastReadAt
					} else if (chat.task.executorId === user.id) {
						lastReadAt = chat.task.executorLastReadAt
					}

					// Подсчитываем непрочитанные сообщения
					const unreadCount = await prisma.message.count({
						where: {
							taskId,
							senderId: { not: user.id },
							...(lastReadAt && {
								createdAt: { gt: lastReadAt },
							}),
						},
					})

					return { taskId, unreadCount, lastReadAt }
				} catch (error: any) {
					logger.error('Ошибка подсчета непрочитанных сообщений задач', error, {
						taskId,
						userId: user.id,
					})
					return { taskId, unreadCount: 0, lastReadAt: null }
				}
			})
		)

		// Применяем подсчеты непрочитанных
		unreadCountsTask.forEach(({ taskId, unreadCount, lastReadAt }) => {
			const chat = taskChats.get(taskId)
			if (chat) {
				chat.unreadCount = unreadCount
				logger.debug('Чат задачи', {
					taskId,
					unreadCount,
					lastReadAt,
					userRole: chat.task.customerId === user.id ? 'customer' : 'executor',
				})
			}
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
					logger.warn(
						'Таблица ChatActivity недоступна (вероятно, миграция не применена). Пропускаем данные присутствия.',
						{ error: presenceError }
					)
				} else {
					logger.error('Ошибка загрузки активности чатов', presenceError)
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

		// Загружаем командные чаты (только для исполнителей)
		const teamChats = new Map<string, any>()
		if (user.role === 'executor') {
			try {
				// Получаем команды пользователя
				const userTeams = await prisma.team.findMany({
					where: {
						members: {
							some: {
								userId: user.id,
							},
						},
					},
					include: {
						teamChats: {
							orderBy: { createdAt: 'desc' },
							take: 1,
							include: {
								sender: {
									select: {
										id: true,
										fullName: true,
										email: true,
										avatarFileId: true,
									},
								},
							},
						},
					},
				})

				for (const team of userTeams) {
					const lastMessage = team.teamChats[0]
					if (lastMessage) {
						teamChats.set(team.id, {
							id: `team:${team.id}`,
							type: 'team',
							team: {
								id: team.id,
								name: team.name,
								description: team.description,
							},
							lastMessage: {
								id: lastMessage.id,
								content: lastMessage.content,
								createdAt: lastMessage.createdAt.toISOString(),
								sender: {
									id: lastMessage.sender.id,
									fullName: lastMessage.sender.fullName,
									email: lastMessage.sender.email,
								},
							},
							unreadCount: 0, // TODO: реализовать подсчет непрочитанных
						})
					}
				}
			} catch (teamChatError: any) {
				logger.error('Ошибка загрузки командных чатов', teamChatError)
			}
		}

		// Объединяем все чаты и сортируем по последнему сообщению
		// Защита от дубликатов: используем Map для уникальности по id
		const uniqueChatsMap = new Map<string, any>()
		
		// Добавляем приватные чаты
		Array.from(privateChats.values()).forEach(chat => {
			if (!uniqueChatsMap.has(chat.id)) {
				uniqueChatsMap.set(chat.id, chat)
			}
		})
		
		// Добавляем чаты задач (с проверкой на дубликаты)
		Array.from(taskChats.values()).forEach(chat => {
			if (!uniqueChatsMap.has(chat.id)) {
				uniqueChatsMap.set(chat.id, chat)
			} else {
				logger.warn('Обнаружен дубликат чата задачи', { chatId: chat.id, taskId: chat.task?.id })
			}
		})

		// Добавляем командные чаты
		Array.from(teamChats.values()).forEach(chat => {
			if (!uniqueChatsMap.has(chat.id)) {
				uniqueChatsMap.set(chat.id, chat)
			}
		})
		
		const allChats = Array.from(uniqueChatsMap.values()).sort(
			(a, b) =>
				new Date(b.lastMessage.createdAt).getTime() -
				new Date(a.lastMessage.createdAt).getTime()
		)

		logger.debug('Найдено чатов', {
			privateMessages: privateMessages.length,
			taskMessages: taskMessages.length,
			privateChats: privateChats.size,
			taskChats: taskChats.size,
			totalChats: allChats.length,
			userLastReadAt: userData?.lastPrivateMessageReadAt,
		})

		// Применяем пагинацию к результатам
		const paginatedChats = allChats.slice(offset, offset + limit)

		return NextResponse.json({
			chats: paginatedChats,
			pagination: {
				total: allChats.length,
				limit,
				offset,
				hasMore: offset + limit < allChats.length,
			},
		})

	} catch (error: any) {
		logger.error('Ошибка получения чатов', error, {
			userId: user?.id,
			errorMessage: error?.message,
			errorStack: error?.stack,
			errorCode: error?.code,
		})
		
		// В development режиме возвращаем больше информации об ошибке
		if (process.env.NODE_ENV === 'development') {
			return NextResponse.json(
				{
					error: 'Ошибка сервера',
					details: error?.message,
					code: error?.code,
				},
				{ status: 500 }
			)
		}
		
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
