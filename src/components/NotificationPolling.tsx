// src/components/NotificationPolling.tsx
// Fallback для production окружения где SSE не работает
'use client'

import { useEffect, useRef } from 'react'

interface NotificationPollingProps {
	userId: string
	token: string
	onNotification: (notification: any) => void
	enabled: boolean // включать только если SSE не работает
	interval?: number // интервал опроса в мс (по умолчанию 30 секунд)
}

export function NotificationPolling({
	userId,
	token,
	onNotification,
	enabled,
	interval = 10000, // 10 секунд - баланс между отзывчивостью и нагрузкой
}: NotificationPollingProps) {
	const lastCheckRef = useRef<Date>(new Date())
	const onNotificationRef = useRef(onNotification)
	const isRequestingRef = useRef(false) // Защита от множественных одновременных запросов
	const errorCountRef = useRef(0) // Счетчик ошибок для экспоненциальной задержки
	const intervalIdRef = useRef<NodeJS.Timeout | null>(null)

	// Обновляем ref при изменении onNotification, но не перезапускаем useEffect
	useEffect(() => {
		onNotificationRef.current = onNotification
	}, [onNotification])

	useEffect(() => {
		if (!enabled || !userId || !token) {
			console.log(
				'🔕 Polling отключен (enabled:',
				enabled,
				'userId:',
				!!userId,
				'token:',
				!!token,
				')'
			)
			return
		}

		// Проверяем, активна ли вкладка (Page Visibility API)
		const isTabVisible = () => {
			return !document.hidden
		}

		console.log(
			'📡 Запуск polling для уведомлений (интервал:',
			interval,
			'мс, userId:',
			userId,
			')'
		)

		const checkNotifications = async () => {
			// Пропускаем запрос, если вкладка неактивна
			if (!isTabVisible()) {
				console.log('👁️ Вкладка неактивна, пропускаем polling')
				return
			}

			// Защита от множественных одновременных запросов
			if (isRequestingRef.current) {
				console.log('⏳ Запрос уже выполняется, пропускаем')
				return
			}

			isRequestingRef.current = true

			try {
				const since = lastCheckRef.current.toISOString()
				const url = `/api/notifications/poll?since=${since}`

				// Добавляем таймаут для запроса (10 секунд)
				const controller = new AbortController()
				const timeoutId = setTimeout(() => controller.abort(), 10000)

				const response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (!response.ok) {
					const errorText = await response.text()
					console.error('❌ Ошибка polling:', response.status, errorText)
					errorCountRef.current++

					// При ошибке увеличиваем интервал экспоненциально (максимум 5 минут)
					if (errorCountRef.current > 0) {
						const backoffDelay = Math.min(
							interval * Math.pow(2, errorCountRef.current - 1),
							300000
						)
						console.log(
							`⏱️ Экспоненциальная задержка: ${backoffDelay}мс из-за ошибок`
						)

						// Останавливаем текущий интервал
						if (intervalIdRef.current) {
							clearInterval(intervalIdRef.current)
						}

						// Запускаем новый интервал с увеличенной задержкой
						intervalIdRef.current = setTimeout(() => {
							errorCountRef.current = 0 // Сбрасываем счетчик при успехе
							checkNotifications()
							// Возвращаемся к обычному интервалу
							intervalIdRef.current = setInterval(checkNotifications, interval)
						}, backoffDelay)
					}
					return
				}

				const data = await response.json()

				if (data.notifications && data.notifications.length > 0) {
					console.log(
						'📬 Получено уведомлений через polling:',
						data.notifications.length
					)

					data.notifications.forEach((notification: any) => {
						onNotificationRef.current(notification)
					})

					lastCheckRef.current = new Date()
					errorCountRef.current = 0 // Сбрасываем счетчик ошибок при успехе
				}
			} catch (error: any) {
				if (error.name === 'AbortError') {
					console.warn('⏱️ Polling запрос превысил таймаут')
				} else {
					console.error('❌ Ошибка при polling уведомлений:', error)
				}
				errorCountRef.current++
			} finally {
				isRequestingRef.current = false
			}
		}

		// Первая проверка с небольшой задержкой (чтобы не нагружать при загрузке)
		const initialTimeout = setTimeout(() => {
			checkNotifications()
		}, 2000)

		// Периодические проверки
		intervalIdRef.current = setInterval(checkNotifications, interval)

		return () => {
			console.log('🧹 Остановка polling')
			clearTimeout(initialTimeout)
			if (intervalIdRef.current) {
				clearInterval(intervalIdRef.current)
			}
		}
	}, [userId, token, enabled, interval])

	return null // Этот компонент не рендерит UI
}
