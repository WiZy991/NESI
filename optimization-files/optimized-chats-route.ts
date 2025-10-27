// src/app/api/chats/route.ts
// ОПТИМИЗИРОВАННАЯ ВЕРСИЯ с пагинацией и select вместо include

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

		// 🚀 ОПТИМИЗАЦИЯ 1: Добавлена пагинация (только последние 100 сообщений)
		// 🚀 ОПТИМИЗАЦИЯ 2: select вместо include для меньшей нагрузки
		const MESSAGES_LIMIT = 100

		// Получаем приватные сообщения пользователя (оптимизировано!)
		const privateMessages = await prisma.privateMessage.findMany({
			where: {
				OR: [{ senderId: user.id }, { recipientId: user.id }],
			},
			select: {
				id: true,
				content: true,
				fileUrl: true,
				mimeType: true,
				fileName: true,
				size: true,
				createdAt: true,
				senderId: true,
				recipientId: true,
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
			take: MESSAGES_LIMIT, // 🚀 Ограничение!
			orderBy: { createdAt: 'desc' },
		})

		console.log(`📨 Загружено ${privateMessages.length} приватных сообщений`)

		// Получаем сообщения из задач пользователя (оптимизировано!)
		const taskMessages = await prisma.message.findMany({
			where: {
				task: {
					OR: [{ customerId: user.id }, { executorId: user.id }],
				},
			},
			select: {
				id: true,
				content: true,
				fileUrl: true,
				createdAt: true,
				taskId: true,
				senderId: true,
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
			take: MESSAGES_LIMIT, // 🚀 Ограничение!
			orderBy: { createdAt: 'desc' },
		})

		console.log(`📨 Загружено ${taskMessages.length} сообщений из задач`)

		// Группируем приватные сообщения по собеседникам
		const pmGroups = new Map<string, any[]>()

		for (const msg of privateMessages) {
			// Определяем, с кем переписка
			const companionId =
				msg.senderId === user.id ? msg.recipientId : msg.senderId
			const companionData =
				msg.senderId === user.id ? msg.recipient : msg.sender

			if (!pmGroups.has(companionId)) {
				pmGroups.set(companionId, [])
			}
			pmGroups.get(companionId)!.push({
				...msg,
				companion: companionData,
			})
		}

		// Собираем чаты (приватные)
		const privateChats = Array.from(pmGroups.entries()).map(
			([companionId, messages]) => {
				// Сортируем по убыванию
				messages.sort(
					(a: any, b: any) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				)

				const lastMsg = messages[0]
				const companionData = lastMsg.companion

				// Считаем непрочитанные (если есть поле lastPrivateMessageReadAt)
				const unreadCount = messages.filter((m: any) => {
					return (
						m.senderId === companionId &&
						(!user.lastPrivateMessageReadAt ||
							new Date(m.createdAt) > new Date(user.lastPrivateMessageReadAt))
					)
				}).length

				return {
					type: 'private' as const,
					id: `pm-${companionId}`,
					companion: companionData,
					lastMessage: lastMsg,
					unreadCount,
					messages,
				}
			}
		)

		// Группируем сообщения задач
		const taskGroups = new Map<string, any[]>()

		for (const msg of taskMessages) {
			if (!taskGroups.has(msg.taskId)) {
				taskGroups.set(msg.taskId, [])
			}
			taskGroups.get(msg.taskId)!.push(msg)
		}

		// Собираем чаты (задачи)
		const taskChats = Array.from(taskGroups.entries()).map(
			([taskId, messages]) => {
				// Сортируем по убыванию
				messages.sort(
					(a: any, b: any) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				)

				const lastMsg = messages[0]
				const task = lastMsg.task

				// Определяем собеседника
				const isCustomer = user.id === task.customerId
				const companion = isCustomer ? task.executor : task.customer

				// Считаем непрочитанные
				const lastReadAt = isCustomer
					? task.customerLastReadAt
					: task.executorLastReadAt

				const unreadCount = messages.filter((m: any) => {
					if (m.senderId === user.id) return false
					if (!lastReadAt) return true
					return new Date(m.createdAt) > new Date(lastReadAt)
				}).length

				return {
					type: 'task' as const,
					id: `task-${taskId}`,
					task,
					companion,
					lastMessage: lastMsg,
					unreadCount,
					messages,
				}
			}
		)

		// Объединяем и сортируем по последнему сообщению
		const allChats = [...privateChats, ...taskChats].sort((a, b) => {
			const dateA = new Date(a.lastMessage.createdAt).getTime()
			const dateB = new Date(b.lastMessage.createdAt).getTime()
			return dateB - dateA
		})

		console.log(`✅ Всего чатов: ${allChats.length}`)

		return NextResponse.json({ chats: allChats })
	} catch (error) {
		console.error('❌ Ошибка загрузки чатов:', error)
		return NextResponse.json(
			{ error: 'Ошибка загрузки чатов' },
			{ status: 500 }
		)
	}
}
