import { NextRequest } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Глобальная карта SSE соединений для онлайн счетчика
declare global {
	var onlineCountSSEConnections: Map<string, ReadableStreamDefaultController<any>> | undefined
}

if (!globalThis.onlineCountSSEConnections) {
	globalThis.onlineCountSSEConnections = new Map()
}

/**
 * GET /api/users/activity/stream
 * SSE поток для обновления онлайн счетчика в реальном времени
 */
export async function GET(req: NextRequest) {
	const url = new URL(req.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return new Response('Unauthorized', { status: 401 })
	}

	// Проверяем токен
	const user = await getUserFromToken(token)
	if (!user) {
		return new Response('Unauthorized', { status: 401 })
	}

	console.log('📊 SSE подключение для онлайн счетчика от пользователя:', user.id)

	// Функция для получения текущего количества онлайн пользователей
	const getOnlineCount = async (): Promise<number> => {
		try {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
			
			const onlineUsers = await prisma.user.findMany({
				where: {
					blocked: false,
				},
				select: {
					id: true,
					lastActivityAt: true,
				},
			})
			
			const onlineCount = onlineUsers.filter(user => {
				if (!user.lastActivityAt) return false
				return user.lastActivityAt >= fiveMinutesAgo
			}).length

			return onlineCount
		} catch (error) {
			console.error('Ошибка получения онлайн счетчика:', error)
			return 0
		}
	}

	// Создаем поток для Server-Sent Events
	const stream = new ReadableStream({
		async start(controller) {
			// Отправляем начальное значение онлайн счетчика
			try {
				const initialCount = await getOnlineCount()
				const data = JSON.stringify({
					type: 'onlineCount',
					count: initialCount,
					timestamp: new Date().toISOString(),
				})
				controller.enqueue(`data: ${data}\n\n`)
			} catch (error) {
				console.error('Ошибка отправки начального счетчика:', error)
			}

			// Сохраняем контроллер для отправки обновлений
			const connectionId = `${user.id}-${Date.now()}`
			globalThis.onlineCountSSEConnections?.set(connectionId, controller)

			// Отправляем heartbeat каждые 30 секунд и обновляем счетчик
			// Используем broadcast для обновления всех подключенных клиентов
			// Это автоматически обновит счетчик при истечении 5 минут неактивности у пользователей
			const heartbeatInterval = setInterval(async () => {
				try {
					// Используем broadcast функцию для обновления всех клиентов
					// Функция сама проверит, изменился ли счетчик
					await broadcastOnlineCountUpdate()
				} catch (error) {
					console.error('Ошибка отправки heartbeat:', error)
					clearInterval(heartbeatInterval)
					globalThis.onlineCountSSEConnections?.delete(connectionId)
				}
			}, 30000) // 30 секунд - проверяем каждые 30 секунд для автоматического обновления при истечении 5 минут

			// Очистка при закрытии соединения
			req.signal.addEventListener('abort', () => {
				console.log('🔌 SSE соединение онлайн счетчика закрыто для пользователя:', user.id)
				clearInterval(heartbeatInterval)
				globalThis.onlineCountSSEConnections?.delete(connectionId)
				controller.close()
			})
		},
		cancel() {
			console.log('🔌 SSE соединение онлайн счетчика отменено для пользователя:', user.id)
		},
	})

	const origin = req.headers.get('origin')
	const allowedOrigins = [
		process.env.NEXT_PUBLIC_BASE_URL,
		process.env.NEXT_PUBLIC_APP_URL,
		'http://localhost:3000',
		'https://localhost:3000',
	].filter(Boolean) as string[]

	const corsOrigin =
		origin && allowedOrigins.some(allowed => origin.startsWith(allowed))
			? origin
			: allowedOrigins[0] || '*'

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': corsOrigin,
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Headers': 'Cache-Control, Authorization, Content-Type',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'X-Content-Type-Options': 'nosniff',
		},
	})
}

// Кэш последнего известного значения счетчика для оптимизации
let lastKnownOnlineCount: number | null = null

/**
 * Функция для broadcast обновления онлайн счетчика всем подключенным клиентам
 * Отправляет обновление только если счетчик изменился
 */
export async function broadcastOnlineCountUpdate() {
	if (!globalThis.onlineCountSSEConnections || globalThis.onlineCountSSEConnections.size === 0) {
		return
	}

	try {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
		
		const onlineUsers = await prisma.user.findMany({
			where: {
				blocked: false,
			},
			select: {
				id: true,
				lastActivityAt: true,
			},
		})
		
		const onlineCount = onlineUsers.filter(user => {
			if (!user.lastActivityAt) return false
			return user.lastActivityAt >= fiveMinutesAgo
		}).length

		// Отправляем обновление только если счетчик изменился
		if (lastKnownOnlineCount !== null && lastKnownOnlineCount === onlineCount) {
			return // Счетчик не изменился, не отправляем broadcast
		}

		lastKnownOnlineCount = onlineCount

		const data = JSON.stringify({
			type: 'onlineCount',
			count: onlineCount,
			timestamp: new Date().toISOString(),
		})

		const message = `data: ${data}\n\n`
		
		// Отправляем обновление всем подключенным клиентам
		const connectionsToRemove: string[] = []
		
		globalThis.onlineCountSSEConnections.forEach((controller, connectionId) => {
			try {
				controller.enqueue(message)
			} catch (error) {
				console.error(`Ошибка отправки обновления счетчика для соединения ${connectionId}:`, error)
				connectionsToRemove.push(connectionId)
			}
		})

		// Удаляем неработающие соединения
		connectionsToRemove.forEach(id => {
			globalThis.onlineCountSSEConnections?.delete(id)
		})

		console.log(`📢 Broadcast онлайн счетчика: ${onlineCount} пользователей (${globalThis.onlineCountSSEConnections.size} подключений)`)
	} catch (error) {
		console.error('Ошибка broadcast онлайн счетчика:', error)
	}
}

// Обработка OPTIONS запросов для CORS preflight
export async function OPTIONS(req: NextRequest) {
	const origin = req.headers.get('origin')
	const allowedOrigins = [
		process.env.NEXT_PUBLIC_BASE_URL,
		process.env.NEXT_PUBLIC_APP_URL,
		'http://localhost:3000',
		'https://localhost:3000',
	].filter(Boolean) as string[]

	const corsOrigin =
		origin && allowedOrigins.some(allowed => origin.startsWith(allowed))
			? origin
			: allowedOrigins[0] || '*'

	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': corsOrigin,
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Headers': 'Cache-Control, Authorization, Content-Type',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
		},
	})
}

