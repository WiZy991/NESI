import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await getUserFromRequest(req)
		const { id: taskId } = await params

		// Получаем задачу
		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				id: true,
				customerId: true,
				executorId: true,
				status: true,
				executorLastReadAt: true,
			},
		})

		if (!task) {
			return NextResponse.json(
				{ error: 'Задача не найдена' },
				{ status: 404 }
			)
		}

		// Проверяем, что пользователь - заказчик этой задачи
		if (task.customerId !== user.id) {
			return NextResponse.json(
				{ error: 'Доступ запрещен' },
				{ status: 403 }
			)
		}

		if (!task.executorId) {
			return NextResponse.json({
				hasExecutor: false,
				activity: null,
			})
		}

		// Получаем информацию об исполнителе
		const executor = await prisma.user.findUnique({
			where: { id: task.executorId },
			select: {
				id: true,
				fullName: true,
				lastActivityAt: true,
			},
		})

		if (!executor) {
			return NextResponse.json({
				hasExecutor: false,
				activity: null,
			})
		}

		// Функция для проверки, является ли сообщение голосовым
		function isVoiceMessage(content: string | null | undefined): boolean {
			if (!content || typeof content !== 'string') return false
			try {
				// Пытаемся распарсить JSON
				let parsed
				try {
					parsed = JSON.parse(content)
				} catch {
					// Если не получилось, пробуем заменить экранированные кавычки
					const unescaped = content.replace(/&quot;/g, '"')
					parsed = JSON.parse(unescaped)
				}
				return parsed && parsed.type === 'voice' && typeof parsed.duration === 'number'
			} catch {
				// Если не JSON, проверяем строку
				return content.includes('"type":"voice"') || 
				       content.includes('"type": "voice"') ||
				       content.includes('&quot;type&quot;:&quot;voice&quot;')
			}
		}

		// Функция для форматирования preview сообщения
		function formatMessagePreview(content: string | null | undefined): string {
			if (!content) return ''
			
			// Проверяем, является ли это голосовым сообщением
			if (isVoiceMessage(content)) {
				try {
					let parsed
					try {
						parsed = JSON.parse(content)
					} catch {
						// Если не получилось, пробуем заменить экранированные кавычки
						const unescaped = content.replace(/&quot;/g, '"')
						parsed = JSON.parse(unescaped)
					}
					const duration = parsed?.duration || 0
					const seconds = Math.round(duration)
					return `🎙️ Голосовое сообщение (${seconds} сек)`
				} catch {
					return '🎙️ Голосовое сообщение'
				}
			}
			
			// Если это обычный текст - возвращаем его (с ограничением длины)
			// Убираем лишние пробелы и переносы строк
			const cleaned = content.trim().replace(/\s+/g, ' ')
			
			// Если текст слишком длинный - обрезаем
			if (cleaned.length > 100) {
				return cleaned.substring(0, 100) + '...'
			}
			
			return cleaned
		}

		// Получаем последние сообщения от исполнителя в этой задаче
		const lastMessages = await prisma.message.findMany({
			where: {
				taskId: taskId,
				senderId: task.executorId,
			},
			orderBy: { createdAt: 'desc' },
			take: 5,
			select: {
				id: true,
				content: true,
				createdAt: true,
			},
		})

		// Получаем последние изменения в задаче (обновления, изменения статуса)
		const recentUpdates = await prisma.task.findUnique({
			where: { id: taskId },
			select: {
				updatedAt: true,
				executorNote: true,
				executorPlannedStart: true,
				executorPlannedDeadline: true,
			},
		})

		// Определяем статус активности
		const now = new Date()
		const lastActivity = executor.lastActivityAt
			? new Date(executor.lastActivityAt)
			: null

		let activityStatus: 'online' | 'recent' | 'away' | 'offline' = 'offline'
		let activityMessage = 'Не в сети'

		if (lastActivity) {
			const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60)

			if (minutesSinceActivity < 5) {
				activityStatus = 'online'
				activityMessage = 'В сети'
			} else if (minutesSinceActivity < 30) {
				activityStatus = 'recent'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity)} мин. назад`
			} else if (minutesSinceActivity < 120) {
				activityStatus = 'away'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity / 60)} ч. назад`
			} else {
				activityStatus = 'offline'
				activityMessage = `Был в сети ${Math.round(minutesSinceActivity / 60)} ч. назад`
			}
		}

		// Проверяем, есть ли недавние сообщения
		const hasRecentMessages = lastMessages.length > 0
		const lastMessageTime = lastMessages[0]?.createdAt
			? new Date(lastMessages[0].createdAt)
			: null

		// Проверяем, есть ли недавние обновления задачи
		const hasRecentUpdates = recentUpdates?.updatedAt
			? (now.getTime() - new Date(recentUpdates.updatedAt).getTime()) / (1000 * 60) < 60
			: false

		return NextResponse.json({
			hasExecutor: true,
			executor: {
				id: executor.id,
				fullName: executor.fullName,
			},
			activity: {
				status: activityStatus,
				message: activityMessage,
				lastActivityAt: lastActivity?.toISOString() || null,
				lastMessageAt: lastMessageTime?.toISOString() || null,
				hasRecentMessages,
				hasRecentUpdates,
				recentMessages: lastMessages.map(msg => ({
					id: msg.id,
					preview: formatMessagePreview(msg.content),
					createdAt: msg.createdAt.toISOString(),
				})),
				executorNote: recentUpdates?.executorNote || null,
				plannedStart: recentUpdates?.executorPlannedStart?.toISOString() || null,
				plannedDeadline: recentUpdates?.executorPlannedDeadline?.toISOString() || null,
			},
		})
	} catch (error) {
		logger.error('Ошибка получения активности исполнителя', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера' },
			{ status: 500 }
		)
	}
}

