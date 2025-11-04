// src/components/NotificationPolling.tsx
// Fallback для production окружения где SSE не работает
'use client'

import { useEffect, useRef } from 'react'

interface NotificationPollingProps {
	userId: string
	token: string
	onNotification: (notification: any) => void
	enabled: boolean // включать только если SSE не работает
	interval?: number // интервал опроса в мс (по умолчанию 5 секунд)
}

export function NotificationPolling({
	userId,
	token,
	onNotification,
	enabled,
	interval = 5000,
}: NotificationPollingProps) {
	const lastCheckRef = useRef<Date>(new Date())
	const onNotificationRef = useRef(onNotification)

	// Обновляем ref при изменении onNotification, но не перезапускаем useEffect
	useEffect(() => {
		onNotificationRef.current = onNotification
	}, [onNotification])

	useEffect(() => {
		if (!enabled || !userId || !token) {
			console.log('🔕 Polling отключен (enabled:', enabled, 'userId:', !!userId, 'token:', !!token, ')')
			return
		}

		console.log('📡 Запуск polling для уведомлений (интервал:', interval, 'мс, userId:', userId, ')')

		const checkNotifications = async () => {
			try {
				const since = lastCheckRef.current.toISOString()
				const url = `/api/notifications/poll?since=${since}`
				
				console.log('📡 Polling запрос:', url)
				
				const response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				console.log('📊 Polling ответ:', response.status, response.statusText)

				if (!response.ok) {
					const errorText = await response.text()
					console.error('❌ Ошибка polling:', response.status, errorText)
					return
				}

				const data = await response.json()
				console.log('📦 Polling данные:', data)

				if (data.notifications && data.notifications.length > 0) {
					console.log('📬 Получено уведомлений через polling:', data.notifications.length)
					
					data.notifications.forEach((notification: any) => {
						console.log('📨 Обработка уведомления:', notification)
						onNotificationRef.current(notification)
					})

					lastCheckRef.current = new Date()
				} else {
					console.log('📭 Новых уведомлений нет')
				}
			} catch (error) {
				console.error('❌ Ошибка при polling уведомлений:', error)
			}
		}

		// Первая проверка сразу
		console.log('🚀 Первая проверка polling...')
		checkNotifications()

		// Периодические проверки
		const intervalId = setInterval(() => {
			console.log('⏰ Периодическая проверка polling...')
			checkNotifications()
		}, interval)

		return () => {
			console.log('🧹 Остановка polling')
			clearInterval(intervalId)
		}
	}, [userId, token, enabled, interval])

	return null // Этот компонент не рендерит UI
}

