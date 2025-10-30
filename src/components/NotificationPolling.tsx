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

	useEffect(() => {
		if (!enabled || !userId || !token) {
			console.log('🔕 Polling отключен')
			return
		}

		console.log('📡 Запуск polling для уведомлений (интервал:', interval, 'мс)')

		const checkNotifications = async () => {
			try {
				const response = await fetch(
					`/api/notifications/poll?since=${lastCheckRef.current.toISOString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				)

				if (!response.ok) {
					console.error('❌ Ошибка polling:', response.status)
					return
				}

				const data = await response.json()

				if (data.notifications && data.notifications.length > 0) {
					console.log('📬 Получено уведомлений через polling:', data.notifications.length)
					
					data.notifications.forEach((notification: any) => {
						onNotification(notification)
					})

					lastCheckRef.current = new Date()
				}
			} catch (error) {
				console.error('❌ Ошибка при polling уведомлений:', error)
			}
		}

		// Первая проверка сразу
		checkNotifications()

		// Периодические проверки
		const intervalId = setInterval(checkNotifications, interval)

		return () => {
			console.log('🧹 Остановка polling')
			clearInterval(intervalId)
		}
	}, [userId, token, enabled, interval, onNotification])

	return null // Этот компонент не рендерит UI
}

