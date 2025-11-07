import { getUserFromToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Добавляем типизацию для глобального объекта
declare global {
	var sseConnections: Map<string, ReadableStreamDefaultController> | undefined
}

// ВАЖНО: SSE требует nodejs runtime, не работает на Edge Runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
	const url = new URL(req.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return new Response('Unauthorized: No token provided', { status: 401 })
	}

	// Проверяем токен
	try {
		const user = await getUserFromToken(token)
		if (!user) {
			console.error('❌ getUserFromToken вернул null для токена. Возможные причины:')
			console.error('   - Пользователь не найден в базе данных (возможно, БД была очищена)')
			console.error('   - Токен невалидный или истек')
			console.error('   - Ошибка подключения к базе данных')
			return new Response('Unauthorized: Invalid token or user not found', { status: 401 })
		}

		console.log('🔔 SSE подключение для пользователя:', user.id)

		// Сохраняем userId в переменную для использования в замыканиях
		const userId = user.id

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
				globalThis.sseConnections = globalThis.sseConnections || new Map()
				globalThis.sseConnections.set(userId, controller)

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
						globalThis.sseConnections?.delete(userId)
					}
				}, 30000)

				// Очистка при закрытии соединения
				req.signal.addEventListener('abort', () => {
					console.log('🔌 SSE соединение закрыто для пользователя:', userId)
					clearInterval(heartbeatInterval)
					globalThis.sseConnections?.delete(userId)
					controller.close()
				})
			},
			cancel() {
				console.log('🔌 SSE соединение отменено для пользователя:', userId)
				globalThis.sseConnections?.delete(userId)
			},
		})

		// Безопасные CORS настройки
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
				'X-Accel-Buffering': 'no', // Отключаем буферизацию в nginx
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': corsOrigin,
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Headers': 'Cache-Control, Authorization, Content-Type',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				// Убираем строгие CSP заголовки для SSE
				'X-Content-Type-Options': 'nosniff',
			},
		})
	} catch (error: any) {
		// Обрабатываем ошибки авторизации
		console.error('❌ Ошибка авторизации в SSE:', error)
		
		// Проверяем, является ли это ошибкой схемы БД
		const isSchemaError = 
			error?.name === 'DatabaseSchemaError' ||
			error?.code === 'P2021' ||
			error?.message?.includes('does not exist')
		
		if (isSchemaError) {
			return new Response('Service Unavailable: Database schema error', { status: 503 })
		}
		
		// Для других ошибок возвращаем 401
		return new Response('Unauthorized: Authentication failed', { status: 401 })
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

// Функция для отправки уведомления конкретному пользователю
export function sendNotificationToUser(userId: string, notification: any) {
	console.log('📤 sendNotificationToUser вызвана:', {
		userId,
		notificationType: notification.type,
		title: notification.title,
		message: notification.message?.substring(0, 50),
	})
	
	const connections = globalThis.sseConnections
	
	if (!connections) {
		console.log('❌ globalThis.sseConnections не инициализирован')
		return false
	}
	
	console.log('📊 Всего подключений SSE:', connections.size)
	console.log('📋 Подключенные пользователи:', Array.from(connections.keys()))
	
	if (!connections.has(userId)) {
		console.log('📭 Пользователь не подключен к SSE:', userId)
		return false
	}

	const controller = connections.get(userId)
	if (!controller) {
		console.log('📭 Контроллер не найден для пользователя:', userId)
		return false
	}

	try {
		const data = JSON.stringify({
			type: notification.type || 'notification',
			...notification,
			timestamp: new Date().toISOString(),
		})

		console.log('📨 Отправка данных через SSE:', data.substring(0, 100))
		controller.enqueue(`data: ${data}\n\n`)
		console.log('✅ Уведомление успешно отправлено пользователю:', userId)
		return true
	} catch (error) {
		console.error('❌ Ошибка отправки уведомления:', error)
		connections.delete(userId)
		return false
	}
}

// Функция для отправки уведомления всем подключенным пользователям
export function broadcastNotification(notification: any) {
	const connections = globalThis.sseConnections
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
