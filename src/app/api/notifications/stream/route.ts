import { getUserFromToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

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

	console.log('🔔 SSE подключение для пользователя:', user.id)

	// Создаем поток для Server-Sent Events
	const stream = new ReadableStream({
		start(controller) {
			// Отправляем начальное сообщение о подключении
			const data = JSON.stringify({
				type: 'connected',
				message: 'Подключено к уведомлениям',
				timestamp: new Date().toISOString(),
			})

			controller.enqueue(`data: ${data}\n\n`)

			// Сохраняем контроллер для отправки сообщений
			global.sseConnections = global.sseConnections || new Map()
			global.sseConnections.set(user.id, controller)

			// Отправляем heartbeat каждые 30 секунд
			const heartbeatInterval = setInterval(() => {
				try {
					const heartbeatData = JSON.stringify({
						type: 'heartbeat',
						timestamp: new Date().toISOString(),
					})
					controller.enqueue(`data: ${heartbeatData}\n\n`)
				} catch (error) {
					console.error('Ошибка отправки heartbeat:', error)
					clearInterval(heartbeatInterval)
					global.sseConnections?.delete(user.id)
				}
			}, 30000)

			// Очистка при закрытии соединения
			req.signal.addEventListener('abort', () => {
				console.log('🔌 SSE соединение закрыто для пользователя:', user.id)
				clearInterval(heartbeatInterval)
				global.sseConnections?.delete(user.id)
				controller.close()
			})
		},
		cancel() {
			console.log('🔌 SSE соединение отменено для пользователя:', user.id)
			global.sseConnections?.delete(user.id)
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control',
		},
	})
}

// Функция для отправки уведомления конкретному пользователю
export function sendNotificationToUser(userId: string, notification: any) {
	const connections = global.sseConnections
	if (!connections || !connections.has(userId)) {
		console.log('📭 Пользователь не подключен к SSE:', userId)
		return false
	}

	try {
		const controller = connections.get(userId)
		const data = JSON.stringify({
			type: 'message',
			...notification,
			timestamp: new Date().toISOString(),
		})

		controller.enqueue(`data: ${data}\n\n`)
		console.log('📨 Уведомление отправлено пользователю:', userId)
		return true
	} catch (error) {
		console.error('Ошибка отправки уведомления:', error)
		connections.delete(userId)
		return false
	}
}

// Функция для отправки уведомления всем подключенным пользователям
export function broadcastNotification(notification: any) {
	const connections = global.sseConnections
	if (!connections) return

	console.log('📢 Рассылка уведомления всем подключенным пользователям')

	for (const [userId, controller] of connections) {
		try {
			const data = JSON.stringify({
				type: 'broadcast',
				...notification,
				timestamp: new Date().toISOString(),
			})

			controller.enqueue(`data: ${data}\n\n`)
		} catch (error) {
			console.error('Ошибка рассылки уведомления:', error)
			connections.delete(userId)
		}
	}
}
