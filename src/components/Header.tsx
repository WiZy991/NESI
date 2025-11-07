'use client'

import { useUser } from '@/context/UserContext'
import {
	AlertTriangle,
	Bell,
	CheckCircle,
	MessageSquare,
	Star,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ToastContainer } from './ToastNotification'
import { NotificationPolling } from './NotificationPolling'
import LevelIndicator from './LevelIndicator'
import Image from 'next/image'
import AchievementModal from './AchievementModal'

// Функция для форматирования времени уведомления
const formatNotificationTime = (timestamp: string) => {
	const date = new Date(timestamp)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffMins < 1) return 'только что'
	if (diffMins < 60) return `${diffMins} мин. назад`
	if (diffHours < 24) return `${diffHours} ч. назад`
	if (diffDays === 1) return 'вчера'
	if (diffDays < 7) return `${diffDays} дн. назад`

	return date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: 'short',
	})
}

// Глобальная переменная для доступа к setMenuOpen из онбординга
let globalSetMenuOpen: ((value: boolean | ((prev: boolean) => boolean)) => void) | null = null

export default function Header() {
	const { user, token, logout, unreadCount, setUnreadCount } = useUser()
	const router = useRouter()
	const pathname = usePathname()
	const [menuOpen, setMenuOpen] = useState(false)
	const [achievementBadge, setAchievementBadge] = useState<{
		id: string
		name: string
		icon: string
		description?: string
	} | null>(null)
	
	// Сохраняем функцию открытия меню в глобальную переменную для доступа из онбординга
	useEffect(() => {
		globalSetMenuOpen = setMenuOpen
		// Также сохраняем в window для прямого доступа
		if (typeof window !== 'undefined') {
			// @ts-ignore
			window.__nesiSetMenuOpen = setMenuOpen
		}
		return () => {
			globalSetMenuOpen = null
			if (typeof window !== 'undefined') {
				// @ts-ignore
				delete window.__nesiSetMenuOpen
			}
		}
	}, [])
	const [notifOpen, setNotifOpen] = useState(false)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [notifications, setNotifications] = useState<any[]>([])
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
	const [sseConnected, setSseConnected] = useState(false)
	const [usePolling, setUsePolling] = useState(false)
	const [toastNotifications, setToastNotifications] = useState<any[]>([])
	const [onlineCount, setOnlineCount] = useState<number | null>(null)
	
	// Отслеживаем открытый чат через события от страницы чатов
	const [currentChatInfo, setCurrentChatInfo] = useState<{
		chatType?: string
		chatId?: string
	} | null>(null)
	
	const menuRef = useRef<HTMLDivElement | null>(null)
	const notifRef = useRef<HTMLDivElement | null>(null)
	const mobileMenuRef = useRef<HTMLDivElement | null>(null)
	const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
	const eventSourceRef = useRef<EventSource | null>(null)
	const sseFailCountRef = useRef(0)
	const shownNotificationsRef = useRef<Set<string>>(new Set())

	const handleLogout = () => {
		logout()
		router.push('/login')
	}

	// Блокировка прокрутки фона при открытии мобильного меню
	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden'
			document.body.style.position = 'fixed'
			document.body.style.width = '100%'
		} else {
			document.body.style.overflow = ''
			document.body.style.position = ''
			document.body.style.width = ''
		}
		
		return () => {
			document.body.style.overflow = ''
			document.body.style.position = ''
			document.body.style.width = ''
		}
	}, [mobileMenuOpen])

	// Слушатель для автоматического открытия меню из онбординга
	useEffect(() => {
		const handleOpenMoreMenu = (e?: Event) => {
			console.log('🔓 Получен запрос на открытие меню "Ещё" из онбординга', e)
			// Принудительно открываем меню
			setMenuOpen(true)
			// Дополнительная проверка через небольшую задержку
			setTimeout(() => {
				setMenuOpen(true)
			}, 50)
		}
		
		// Добавляем слушатель
		window.addEventListener('openMoreMenu', handleOpenMoreMenu)
		
		// Также слушаем через capture для надежности
		window.addEventListener('openMoreMenu', handleOpenMoreMenu, true)
		
		return () => {
			window.removeEventListener('openMoreMenu', handleOpenMoreMenu)
			window.removeEventListener('openMoreMenu', handleOpenMoreMenu, true)
		}
	}, [])
	
	// Закрытие меню при клике вне (НО НЕ во время онбординга!)
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			// Проверяем, активен ли онбординг
			const isOnboardingActive = document.querySelector('.onboarding-highlighted') !== null
			
			// Если активен онбординг И клик по overlay, НЕ закрываем меню
			if (isOnboardingActive) {
				const target = e.target as HTMLElement
				if (target.closest('[class*="onboarding"]') || 
				    target.closest('[style*="z-index: 10000"]')) {
					return // Не закрываем меню во время онбординга
				}
			}
			
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node) &&
				notifRef.current &&
				!notifRef.current.contains(e.target as Node)
			) {
				setMenuOpen(false)
				setNotifOpen(false)
			}
			if (
				mobileMenuRef.current &&
				!mobileMenuRef.current.contains(e.target as Node) &&
				mobileMenuButtonRef.current &&
				!mobileMenuButtonRef.current.contains(e.target as Node)
			) {
				setMobileMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Загрузка уведомлений
	useEffect(() => {
		if (!user || !token) return
		const fetchNotifications = async () => {
			try {
				const res = await fetch(`/api/notifications?limit=5`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				if (res.ok) {
					setNotifications(data.notifications || [])
				} else {
					console.error('Ошибка уведомлений:', data)
					setNotifications([])
				}
			} catch (err) {
				console.error('Ошибка уведомлений:', err)
			}
		}
		fetchNotifications()
	}, [user, token])

	// Отслеживание активности и загрузка онлайн пользователей через SSE
	useEffect(() => {
		if (!user || !token) {
			setOnlineCount(0)
			return
		}

		// Обновляем активность при загрузке
		const updateActivity = async () => {
			try {
				const res = await fetch('/api/users/activity', {
					method: 'POST',
					headers: { 
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}` 
					},
				})
				if (!res.ok) {
					const errorText = await res.text()
					console.error('❌ Ошибка обновления активности:', res.status, errorText)
				} else {
					console.log('✅ Активность обновлена')
				}
			} catch (err) {
				console.error('❌ Ошибка обновления активности:', err)
			}
		}

		// Обновляем активность при первом подключении
		updateActivity()

		// Обновляем активность каждые 4 минуты (чтобы не быть неактивным 5 минут)
		const activityInterval = setInterval(updateActivity, 4 * 60 * 1000)

		// Обновляем активность при взаимодействии с пользователем
		let lastActivityTime = Date.now()
		const handleActivity = () => {
			const now = Date.now()
			// Обновляем активность только если прошло больше 30 секунд с последнего обновления
			if (now - lastActivityTime > 30000) {
				lastActivityTime = now
				updateActivity()
			}
		}

		window.addEventListener('mousedown', handleActivity)
		window.addEventListener('keydown', handleActivity)
		window.addEventListener('scroll', handleActivity, { passive: true })

		// Подключаемся к SSE потоку для онлайн счетчика
		let eventSource: EventSource | null = null
		
		try {
			const sseUrl = `/api/users/activity/stream?token=${encodeURIComponent(token)}`
			eventSource = new EventSource(sseUrl)

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					if (data.type === 'onlineCount') {
						console.log('📊 Обновление онлайн счетчика через SSE:', data.count)
						setOnlineCount(data.count || 0)
					}
				} catch (err) {
					console.error('❌ Ошибка парсинга SSE данных:', err)
				}
			}

			eventSource.onerror = (error) => {
				console.error('❌ Ошибка SSE соединения для онлайн счетчика:', error)
				// Переподключаемся через 5 секунд
				setTimeout(() => {
					if (eventSource) {
						eventSource.close()
						eventSource = null
						// Попытка переподключения будет сделана при следующем useEffect
					}
				}, 5000)
			}

			console.log('✅ SSE подключение для онлайн счетчика установлено')
		} catch (err) {
			console.error('❌ Ошибка создания SSE соединения:', err)
			// Fallback на polling если SSE не работает
			const fetchOnlineCount = async () => {
				try {
					const res = await fetch('/api/users/activity/online', {
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
					})
					
					if (res.ok) {
						const data = await res.json()
						setOnlineCount(data.onlineCount || 0)
					}
				} catch (fetchErr) {
					console.error('❌ Ошибка fallback получения онлайн пользователей:', fetchErr)
				}
			}
			
			fetchOnlineCount()
			const onlineInterval = setInterval(fetchOnlineCount, 30 * 1000)

			return () => {
				clearInterval(activityInterval)
				clearInterval(onlineInterval)
				window.removeEventListener('mousedown', handleActivity)
				window.removeEventListener('keydown', handleActivity)
				window.removeEventListener('scroll', handleActivity)
			}
		}

		return () => {
			clearInterval(activityInterval)
			window.removeEventListener('mousedown', handleActivity)
			window.removeEventListener('keydown', handleActivity)
			window.removeEventListener('scroll', handleActivity)
			if (eventSource) {
				eventSource.close()
				eventSource = null
			}
		}
	}, [user, token])
	
	// Отслеживаем открытый чат через события от страницы чатов
	useEffect(() => {
		const handleChatOpened = (e: CustomEvent) => {
			const { chatType, chatId } = e.detail
			setCurrentChatInfo({ chatType, chatId })
			console.log('📱 Чат открыт:', chatType, chatId)
		}
		
		const handleChatClosed = () => {
			setCurrentChatInfo(null)
			console.log('📱 Чат закрыт')
		}
		
		window.addEventListener('chatOpened', handleChatOpened as EventListener)
		window.addEventListener('chatClosed', handleChatClosed)
		
		return () => {
			window.removeEventListener('chatOpened', handleChatOpened as EventListener)
			window.removeEventListener('chatClosed', handleChatClosed)
		}
	}, [])

	// Функция показа уведомлений (вынесена до useEffect чтобы использовать в NotificationPolling)
	const showNotification = useCallback((data: any) => {
		console.log('🎉 showNotification вызвана с data:', data)
		
		// Создаем уникальный ключ для уведомления
		// Приоритет: id из БД > messageId > комбинация type+link+timestamp
		const notificationKey = data.id 
			? `db_${data.id}` 
			: data.messageId 
				? `msg_${data.messageId}` 
				: `${data.type}-${data.link || ''}-${data.timestamp || Date.now()}`
		
		// Проверяем, не показывали ли мы уже это уведомление
		if (shownNotificationsRef.current.has(notificationKey)) {
			console.log('⏭️ Пропускаем дубликат уведомления:', notificationKey)
			return
		}
		
		// Добавляем в список показанных
		shownNotificationsRef.current.add(notificationKey)
		
		// Ограничиваем размер Set (храним последние 100 уведомлений)
		if (shownNotificationsRef.current.size > 100) {
			const firstKey = shownNotificationsRef.current.values().next().value
			shownNotificationsRef.current.delete(firstKey)
		}
		
		// Проверяем, находится ли пользователь в чате и это сообщение для открытого чата
		const isInChatsPage = pathname === '/chats'
		const isMessageNotification = data.type === 'message'
		let isCurrentChatNotification = false
		
		if (isMessageNotification && currentChatInfo && data.chatType && data.senderId) {
			// Проверяем, соответствует ли уведомление открытому чату
			if (data.chatType === 'private' && currentChatInfo.chatType === 'private') {
				isCurrentChatNotification = data.senderId === currentChatInfo.chatId
			} else if (data.chatType === 'task' && currentChatInfo.chatType === 'task') {
				const taskId = data.chatId?.replace('task_', '') || data.link?.match(/\/tasks\/([^\/]+)/)?.[1]
				isCurrentChatNotification = taskId === currentChatInfo.chatId
			}
		}
		
		// Если пользователь в чате и это уведомление для открытого чата - не показываем toast и не увеличиваем счетчик
		if (isInChatsPage && isCurrentChatNotification) {
			console.log('⏭️ Пользователь в открытом чате, пропускаем уведомление')
			return
		}
		
		if (data.playSound) {
			console.log('🔊 Попытка воспроизвести звук')
			try {
				const AudioContextClass =
					window.AudioContext || (window as any).webkitAudioContext
				const audioContext = new AudioContextClass()
				const oscillator = audioContext.createOscillator()
				const gainNode = audioContext.createGain()
				oscillator.connect(gainNode)
				gainNode.connect(audioContext.destination)
				oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
				gainNode.gain.setValueAtTime(0, audioContext.currentTime)
				gainNode.gain.linearRampToValueAtTime(
					0.2,
					audioContext.currentTime + 0.01
				)
				gainNode.gain.exponentialRampToValueAtTime(
					0.01,
					audioContext.currentTime + 0.3
				)
				oscillator.start(audioContext.currentTime)
				oscillator.stop(audioContext.currentTime + 0.3)
			} catch {}
		}

		// Обновляем уведомления и счетчик непрочитанных (используем функциональное обновление)
		setNotifications(prev => {
			// Проверяем, нет ли уже такого уведомления в списке (по ключу)
			const existingKey = prev.find(n => {
				const nKey = n.id 
					? `db_${n.id}` 
					: n.messageId 
						? `msg_${n.messageId}` 
						: `${n.type}-${n.link || ''}-${n.timestamp || ''}`
				return nKey === notificationKey
			})
			if (existingKey) {
				console.log('⏭️ Уведомление уже в списке, не добавляем')
				return prev
			}
			return [data, ...prev.slice(0, 4)]
		})
		setUnreadCount(prev => prev + 1)

		// Для достижений показываем модальный попап вместо toast
		if (data.type === 'badge' && data.badgeId && data.badgeName && data.badgeIcon) {
			console.log('🏅 Показываем модальный попап для достижения:', data.badgeName)
			setAchievementBadge({
				id: data.badgeId,
				name: data.badgeName,
				icon: data.badgeIcon,
				description: data.badgeDescription,
			})
			return // Не показываем toast для достижений
		}

		// Добавляем toast уведомление (но не для типа 'login')
		if (data.type !== 'login') {
			// Используем тот же ключ для toast, чтобы избежать дублирования
			const toastId = data.id 
				? `toast_db_${data.id}` 
				: data.messageId 
					? `toast_msg_${data.messageId}` 
					: `toast_${Date.now()}-${Math.random()}`
			
			const toastNotification = {
				id: toastId,
				type: data.type || 'notification',
				title: data.title || 'Новое уведомление',
				message: data.message || '',
				link: data.link,
				userId: data.userId,
				senderId: data.senderId,
				timestamp: data.timestamp || new Date().toISOString(),
			}
			
			console.log('🎉 Добавление toast уведомления:', toastNotification)
			setToastNotifications(prev => {
				// Проверяем, нет ли уже такого toast уведомления
				const existingToast = prev.find(t => {
					// Для toast с ID из БД
					if (data.id && t.id.startsWith(`toast_db_${data.id}`)) return true
					// Для toast с messageId
					if (data.messageId && t.id.startsWith(`toast_msg_${data.messageId}`)) return true
					// Для других - проверяем по содержимому
					return t.type === toastNotification.type && 
						t.link === toastNotification.link && 
						t.message === toastNotification.message &&
						Math.abs(new Date(t.timestamp).getTime() - new Date(toastNotification.timestamp).getTime()) < 5000
				})
				
				if (existingToast) {
					console.log('⏭️ Toast уведомление уже существует, не добавляем:', existingToast.id)
					return prev
				}
				
				const newNotifications = [...prev, toastNotification]
				console.log('📋 Текущие toast уведомления:', newNotifications.length)
				return newNotifications
			})
		}
	}, [pathname, currentChatInfo, setUnreadCount])

	// Загрузка количества непрочитанных сообщений и SSE
	useEffect(() => {
		if (!user || !token) return

		const fetchUnreadMessages = async () => {
			try {
				const res = await fetch('/api/chats/unread-count', {
					headers: { Authorization: `Bearer ${token}` },
				})
				
				// Проверяем, есть ли содержимое в ответе
				const text = await res.text()
				if (!text || text.trim() === '') {
					console.warn('⚠️ Пустой ответ от API непрочитанных сообщений')
					setUnreadMessagesCount(0)
					return
				}

				let data
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					console.error('❌ Ошибка парсинга JSON:', parseError)
					setUnreadMessagesCount(0)
					return
				}

				if (res.ok) {
					setUnreadMessagesCount(data.unreadCount || 0)
				} else {
					console.error('Ошибка получения непрочитанных сообщений:', {
						status: res.status,
						statusText: res.statusText,
						data: data,
						error: data?.error || 'Неизвестная ошибка'
					})
					setUnreadMessagesCount(0)
				}
			} catch (err: any) {
				console.error('Ошибка получения непрочитанных сообщений:', err)
				setUnreadMessagesCount(0)
			}
		}

		// Проверяем окружение: в production сразу включаем polling
		const isProduction = process.env.NODE_ENV === 'production'
		
		if (isProduction) {
			console.log('🌐 Production окружение: используем polling вместо SSE')
			setUsePolling(true)
			fetchUnreadMessages()
			const interval = setInterval(fetchUnreadMessages, 30000)
			return () => {
				console.log('🧹 Header: Cleanup (polling mode)')
				clearInterval(interval)
			}
		}

		const connectSSE = () => {
			if (eventSourceRef.current) {
				console.log('⚠️ Закрываю старое SSE подключение')
				eventSourceRef.current.close()
			}

			console.log('🔌 Подключение к SSE:', `/api/notifications/stream?token=${token.substring(0,10)}...`)
			
			// Таймаут для определения что SSE не работает
			const sseTimeout = setTimeout(() => {
				console.log('⏰ SSE таймаут: подключение не установлено за 5 секунд')
				sseFailCountRef.current = 3
				setUsePolling(true)
				if (eventSourceRef.current) {
					eventSourceRef.current.close()
					eventSourceRef.current = null
				}
			}, 5000)
			
			const eventSource = new EventSource(
				`/api/notifications/stream?token=${encodeURIComponent(token)}`
			)

			eventSource.onopen = () => {
				console.log('✅ SSE подключение установлено успешно')
				clearTimeout(sseTimeout)
				setSseConnected(true)
				sseFailCountRef.current = 0 // Сбрасываем счетчик
			}

			eventSource.onmessage = event => {
				try {
					console.log('📨 SSE сообщение:', event.data)
					const data = JSON.parse(event.data)
					
					// Пропускаем служебные события
					if (data.type === 'heartbeat') {
						console.log('💓 Heartbeat')
						return
					}
					
					if (data.type === 'connected') {
						console.log('✅ Подтверждение подключения')
						return
					}

					// Пропускаем события набора текста
					if (data.type === 'typing') {
						return
					}

					// Обрабатываем остальные уведомления
					console.log('🔔 Обработка уведомления:', data)
					showNotification(data)
					if (data.type === 'message') {
						fetchUnreadMessages()
					}
				} catch (error) {
					console.error('❌ Ошибка SSE:', error)
				}
			}

		eventSource.onerror = (error) => {
			console.error('❌ Ошибка SSE подключения:', error)
			console.log('📊 SSE readyState:', eventSource.readyState)
			setSseConnected(false)
			clearTimeout(sseTimeout)
			
			eventSourceRef.current = null
			sseFailCountRef.current++
			
			console.log('⚠️ Количество ошибок SSE:', sseFailCountRef.current)
			
			// После 2 неудачных попыток переключаемся на polling (было 3, уменьшил до 2)
			if (sseFailCountRef.current >= 2) {
				console.log('🔄 SSE не работает, переключаюсь на polling')
				setUsePolling(true)
				return
			}
			
			setTimeout(() => {
				console.log('🔄 Попытка переподключения SSE...')
				if (user && token) connectSSE()
			}, 3000)
		}

			eventSourceRef.current = eventSource
			console.log('📡 SSE EventSource создан')
		}

		// Development окружение: используем SSE
		console.log('🚀 Header: Инициализация с user:', user?.id, 'token:', token ? 'есть' : 'нет')
		
		fetchUnreadMessages()
		connectSSE()

		const interval = setInterval(fetchUnreadMessages, 30000)
		return () => {
			console.log('🧹 Header: Cleanup (SSE mode)')
			clearInterval(interval)
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
				eventSourceRef.current = null
			}
		}
	}, [user, token, showNotification])

	// 📭 Пометить все уведомления как прочитанные
	const markAllRead = async () => {
		if (!token) return
		try {
			await fetch('/api/notifications/mark-all-read', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
			setUnreadCount(0)
		} catch (err) {
			console.error('Ошибка при отметке уведомлений', err)
		}
	}

	const handleNotificationClick = async (notif: any) => {
		setNotifOpen(false)
		setMobileMenuOpen(false)
		
		// Не блокируем навигацию ожиданием markAllRead
		markAllRead().catch(console.error)
		
		// Определяем URL для перехода
		let targetUrl = '/notifications'
		
		if (notif.userId || notif.senderId) {
			const targetId = notif.userId || notif.senderId
			targetUrl = `/chats?open=${targetId}`
		} else if (notif.link) {
			targetUrl = notif.link
		}
		
		// На мобильных используем прямой переход через window.location
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			window.location.href = targetUrl
		} else {
			router.push(targetUrl)
		}
	}

	const handleGoToNotifications = async () => {
		setNotifOpen(false)
		await markAllRead()
		router.push('/notifications')
	}

	// 🌿 Универсальный стиль ссылок
	const linkStyle =
		'font-medium text-[15px] tracking-wide px-2 py-1 relative transition-all duration-300 hover:text-emerald-400 hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.6)] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-emerald-400 after:transition-all after:duration-300 hover:after:w-full'

	const handleToastClose = (id: string) => {
		console.log('🗑️ Закрытие toast уведомления:', id)
		setToastNotifications(prev => {
			const filtered = prev.filter(toast => toast.id !== id)
			console.log('📋 Осталось toast уведомлений:', filtered.length)
			return filtered
		})
	}

	const handleNotificationRead = async () => {
		// Обновляем счетчик непрочитанных уведомлений
		try {
			const notifRes = await fetch('/api/notifications/unread-count', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (notifRes.ok) {
				const notifData = await notifRes.json()
				setUnreadCount(notifData.count || 0)
			}
		} catch (error) {
			console.error('Ошибка обновления счетчика:', error)
		}
	}

	return (
		<>
			{achievementBadge && (
				<AchievementModal
					badge={achievementBadge}
					onClose={() => setAchievementBadge(null)}
				/>
			)}
			<ToastContainer
				notifications={toastNotifications}
				onClose={handleToastClose}
				token={token}
				onNotificationRead={handleNotificationRead}
			/>
			{user && token && (
				<NotificationPolling
					userId={user.id}
					token={token}
					onNotification={showNotification}
					enabled={usePolling}
					interval={5000}
				/>
			)}
			<header className='w-full px-4 md:px-8 py-3 md:py-4 flex justify-between items-center bg-black/70 backdrop-blur-md border-b border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] font-sans fixed md:sticky top-0 z-[10002]'>
				<Link
					href='/'
					className='text-xl md:text-2xl font-semibold text-emerald-400 tracking-[0.08em] hover:scale-105 hover:text-emerald-300 transition-all duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]'
				>
					NESI
				</Link>

				{/* Мобильная кнопка и уведомления */}
				<div className='flex items-center gap-3 md:hidden'>
					{user && (
						<div className='relative' ref={notifRef}>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setNotifOpen(v => !v)
								}}
								onDoubleClick={(e) => {
									// Двойной клик переходит на страницу уведомлений
									e.preventDefault()
									e.stopPropagation()
									setNotifOpen(false)
									setTimeout(() => {
										window.location.href = '/notifications'
									}, 100)
								}}
								className='text-lg flex items-center gap-1 relative p-2'
								aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ''}`}
								aria-expanded={notifOpen}
								aria-haspopup="true"
								data-onboarding-target="notifications-bell"
							>
								<Bell className='w-5 h-5 text-emerald-400' />
								{unreadCount > 0 && (
									<span className='absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
										{unreadCount}
									</span>
								)}
							</button>

							{notifOpen && (
								<div className='absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-80 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[100] overflow-hidden animate-fadeIn'>
									<div className='max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar'>
										{notifications.length === 0 ? (
											<div className='p-4 text-center text-gray-400'>
												<Bell className='w-6 h-6 mx-auto mb-2 text-gray-500' />
												<p className='text-sm'>Нет новых уведомлений</p>
											</div>
										) : (
											notifications.map((notif, index) => (
												<div
													key={index}
													className='p-3 sm:p-4 border-b border-gray-700 hover:bg-gray-800/60 active:bg-gray-700/80 transition cursor-pointer touch-manipulation select-none'
													onClick={(e) => {
														e.stopPropagation()
														handleNotificationClick(notif)
													}}
													onTouchStart={(e) => {
														// Для мобильных устройств
														e.currentTarget.classList.add('bg-gray-800/80')
													}}
													onTouchEnd={(e) => {
														e.currentTarget.classList.remove('bg-gray-800/80')
													}}
													role="button"
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault()
															handleNotificationClick(notif)
														}
													}}
												>
													<div className='flex items-start space-x-3'>
														<div className='w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-emerald-900/40 border border-emerald-500/30 flex-shrink-0'>
															{notif.type === 'message' ? (
																<MessageSquare className='w-5 h-5 sm:w-4 sm:h-4 text-blue-400' />
															) : notif.type === 'review' ? (
																<Star className='w-5 h-5 sm:w-4 sm:h-4 text-yellow-400' />
															) : notif.type === 'task' ? (
																<CheckCircle className='w-5 h-5 sm:w-4 sm:h-4 text-green-400' />
															) : notif.type === 'warning' ? (
																<AlertTriangle className='w-5 h-5 sm:w-4 sm:h-4 text-red-500' />
															) : (
																<Bell className='w-5 h-5 sm:w-4 sm:h-4 text-emerald-400' />
															)}
														</div>
														<div className='flex-1 min-w-0'>
															<p className='text-sm sm:text-sm text-white font-medium line-clamp-2'>
																{notif.title}
															</p>
															<p className='text-xs text-gray-400 line-clamp-2'>
																{notif.sender ? (
																	<>
																		<strong className='text-gray-300'>
																			{notif.sender}
																		</strong>
																		<span className='text-gray-500'> — </span>
																		{notif.message}
																	</>
																) : (
																	notif.message
																)}
															</p>
															{notif.taskTitle && (
																<p className='text-xs text-emerald-400 mt-1'>
																	📋 {notif.taskTitle}
																</p>
															)}
															{(notif.timestamp || notif.createdAt) && (
																<p className='text-xs text-gray-500 mt-1'>
																	{formatNotificationTime(
																		notif.timestamp || notif.createdAt
																	)}
																</p>
															)}
														</div>
													</div>
												</div>
											))
										)}
									</div>
									<div className='p-3 sm:p-4 border-t border-emerald-500/20 bg-black/40'>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setNotifOpen(false)
												setMobileMenuOpen(false)
												// Всегда используем прямой переход на мобильных
												setTimeout(() => {
													window.location.href = '/notifications'
												}, 100)
											}}
											onTouchEnd={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setNotifOpen(false)
												setMobileMenuOpen(false)
												setTimeout(() => {
													window.location.href = '/notifications'
												}, 100)
											}}
											className='w-full py-2.5 sm:py-2 text-emerald-400 hover:text-emerald-300 active:text-emerald-200 text-sm sm:text-base font-medium transition-all touch-manipulation text-center rounded-lg hover:bg-emerald-500/10 active:bg-emerald-500/30 active:scale-95'
										>
											Все уведомления →
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Гамбургер-меню */}
					<button
						ref={mobileMenuButtonRef}
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						className='text-emerald-400 p-2 focus:outline-none'
						aria-label='Открыть меню'
					>
						<svg
							className='w-6 h-6'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							{mobileMenuOpen ? (
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M6 18L18 6M6 6l12 12'
								/>
							) : (
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M4 6h16M4 12h16M4 18h16'
								/>
							)}
						</svg>
					</button>
				</div>

				{/* Мобильное меню */}
				{mobileMenuOpen && (
					<div
						ref={mobileMenuRef}
						className='absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)] md:hidden z-40 animate-slideInDown max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar'
					>
						<nav className='flex flex-col p-5 space-y-1.5 text-gray-200'>
					{user ? (
						<>
							{/* Плашка с онлайн пользователями в мобильном меню */}
							<div className='flex items-center justify-center gap-2 px-4 py-2 mx-4 mb-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm'>
								<div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse'></div>
								<span className='text-emerald-300 font-medium'>
									Пользователей онлайн: <span className='text-emerald-400 font-bold'>{onlineCount ?? 0}</span>
								</span>
							</div>
							
							{user.role === 'admin' ? (
								<>
									<Link
										href='/admin'
										className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
										onClick={() => setMobileMenuOpen(false)}
									>
										Админ-панель
									</Link>
											{/* Иконка профиля для админа в мобильном меню */}
											<Link
												href='/profile'
												className='flex items-center gap-3 py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												{user.avatarUrl ? (
													<Image
														src={user.avatarUrl}
														alt={user.fullName || user.email || 'Профиль'}
														width={32}
														height={32}
														className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover"
													/>
												) : (
													<div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-emerald-500/30">
														<span className="text-emerald-400 font-semibold text-sm">
															{user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
														</span>
													</div>
												)}
												<span>Профиль</span>
											</Link>
										</>
									) : (
										<>
											{user.role === 'executor' && (
												<>
													<Link
														href='/specialists'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Подиум исполнителей
													</Link>
													<Link
														href='/tasks'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Каталог задач
													</Link>
													<Link
														href='/tasks/my'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Мои задачи
													</Link>
													<Link
														href='/responses/my'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Мои отклики
													</Link>
												</>
											)}
											{user.role === 'customer' && (
												<>
													<Link
														href='/specialists'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Подиум исполнителей
													</Link>
													<Link
														href='/tasks'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Каталог задач
													</Link>
													<Link
														href='/my-tasks'
														className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														Мои задачи
													</Link>
													<Link
														href='/tasks/new'
														className='py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg ios-transition active:scale-95'
														onClick={() => setMobileMenuOpen(false)}
													>
														➕ Создать задачу
													</Link>
												</>
											)}

											{/* Индикатор уровня для исполнителей в мобильном меню */}
											{user.role === 'executor' && (
												<div className='px-4 py-2'>
													<LevelIndicator />
												</div>
											)}

											{/* Иконка профиля в мобильном меню */}
											<Link
												href='/profile'
												className='flex items-center gap-3 py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												{user.avatarUrl ? (
													<Image
														src={user.avatarUrl}
														alt={user.fullName || user.email || 'Профиль'}
														width={32}
														height={32}
														className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover"
													/>
												) : (
													<div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-emerald-500/30">
														<span className="text-emerald-400 font-semibold text-sm">
															{user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
														</span>
													</div>
												)}
												<span>Профиль</span>
											</Link>

											<button
												type="button"
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition relative active:scale-95 block text-emerald-300 hover:text-emerald-100 w-full text-left'
												onClick={(e) => {
													e.preventDefault()
													setMobileMenuOpen(false)
													setTimeout(() => {
														window.location.href = '/notifications'
													}, 100)
												}}
												onTouchEnd={(e) => {
													e.preventDefault()
													setMobileMenuOpen(false)
													setTimeout(() => {
														window.location.href = '/notifications'
													}, 100)
												}}
											>
												🔔 Уведомления
												{unreadCount > 0 && (
													<span className='absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
														{unreadCount}
													</span>
												)}
											</button>

											<Link
												href='/chats'
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition relative active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												💬 Чаты
												{unreadMessagesCount > 0 && (
													<span className='absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
														{unreadMessagesCount}
													</span>
												)}
											</Link>

											<Link
												href='/community'
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												🏘️ Сообщество
											</Link>

											<Link
												href='/hire'
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												📑 Запросы найма
											</Link>

											<Link
												href='/analytics'
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												📊 Аналитика
											</Link>

											{/* Портфолио - только для исполнителей */}
											{user.role === 'executor' && (
												<Link
													href='/portfolio'
													className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
													onClick={() => setMobileMenuOpen(false)}
												>
													💼 Портфолио
												</Link>
											)}

											<Link
												href='/settings'
												className='py-3 px-4 hover:bg-emerald-500/10 rounded-lg ios-transition active:scale-95'
												onClick={() => setMobileMenuOpen(false)}
											>
												⚙️ Настройки
											</Link>

											<button
												onClick={() => {
													setMobileMenuOpen(false)
													handleLogout()
												}}
												className='py-3 px-4 text-left text-red-400 hover:bg-red-500/10 rounded-lg ios-transition active:scale-95'
											>
												🚪 Выйти
											</button>
										</>
									)}
								</>
							) : (
								<>
									<Link
										href='/login'
										className='py-3 px-4 text-center border-2 border-emerald-400 text-emerald-400 rounded-lg ios-button hover:bg-emerald-400 hover:text-black'
										onClick={() => setMobileMenuOpen(false)}
									>
										Вход
									</Link>
									<Link
										href='/register'
										className='py-3 px-4 text-center bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg ios-button hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
										onClick={() => setMobileMenuOpen(false)}
									>
										Регистрация
									</Link>
								</>
							)}
						</nav>
					</div>
				)}

				{/* Десктопная навигация */}
				<nav className='hidden md:flex gap-7 items-center text-gray-200 font-poppins'>
					{user ? (
						<>
						{/* Плашка с онлайн пользователями */}
						<div className='flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs'>
							<div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse'></div>
							<span className='text-emerald-300 font-medium'>
								Онлайн: <span className='text-emerald-400 font-bold'>{onlineCount ?? 0}</span>
							</span>
						</div>
						
						{/* 🔔 Уведомления */}
						<div className='relative' ref={notifRef}>
							<button
								onClick={() => setNotifOpen(v => !v)}
								className={`${linkStyle} text-lg flex items-center gap-1 relative`}
								data-onboarding-target="notifications-bell"
							>
									<Bell className='w-5 h-5 text-emerald-400 transition-transform duration-300 group-hover:rotate-6' />

									{/* 🔴 Счётчик уведомлений с плавным появлением */}
									{unreadCount > 0 && (
										<span
											className={`absolute -top-2 -right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full 
					transition-all duration-500 ease-in-out transform 
					${notifOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
										>
											{unreadCount}
										</span>
									)}
								</button>

								{/* 📥 Выпадающее окно уведомлений */}
								{notifOpen && (
									<div
										className='absolute right-0 mt-3 w-80 bg-gray-900 border border-emerald-500/30 rounded-xl 
                       shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[100] overflow-hidden 
                       animate-fadeIn transition-all duration-300 ease-in-out origin-top'
									>
										<div className='max-h-80 overflow-y-auto custom-scrollbar'>
											{notifications.length === 0 ? (
												<div className='p-4 text-center text-gray-400'>
													<Bell className='w-6 h-6 mx-auto mb-2 text-gray-500' />
													<p>Нет новых уведомлений</p>
												</div>
											) : (
												notifications.map((notif, index) => (
													<div
														key={index}
														className='p-3 border-b border-gray-700 hover:bg-gray-800/60 active:bg-gray-800 transition cursor-pointer touch-manipulation select-none'
														onClick={(e) => {
															e.stopPropagation()
															handleNotificationClick(notif)
														}}
														role="button"
														tabIndex={0}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault()
																handleNotificationClick(notif)
															}
														}}
													>
														<div className='flex items-start space-x-3'>
															{/* 🎯 Иконка в зависимости от типа уведомления */}
															<div
																className='w-8 h-8 rounded-full flex items-center justify-center 
                                             bg-emerald-900/40 border border-emerald-500/30 
                                             shadow-[0_0_6px_rgba(16,185,129,0.3)] flex-shrink-0'
															>
																{notif.type === 'message' ? (
																	<MessageSquare className='w-4 h-4 text-blue-400' />
																) : notif.type === 'review' ? (
																	<Star className='w-4 h-4 text-yellow-400' />
																) : notif.type === 'task' ? (
																	<CheckCircle className='w-4 h-4 text-green-400' />
																) : notif.type === 'warning' ? (
																	<AlertTriangle className='w-4 h-4 text-red-500' />
																) : (
																	<Bell className='w-4 h-4 text-emerald-400' />
																)}
															</div>

															{/* 💬 Текст уведомления */}
															<div className='flex-1 min-w-0'>
																<p className='text-sm text-white font-medium line-clamp-2'>
																	{notif.title}
																</p>

																{/* ✅ Исправленный вывод имени и сообщения */}
																<p className='text-xs text-gray-400 line-clamp-2'>
																	{notif.sender ? (
																		<>
																			<strong className='text-gray-300'>
																				{notif.sender}
																			</strong>
																			<span className='text-gray-500'> — </span>
																			{notif.message}
																		</>
																	) : (
																		notif.message
																	)}
																</p>

																{notif.taskTitle && (
																	<p className='text-xs text-emerald-400 mt-1'>
																		📋 {notif.taskTitle}
																	</p>
																)}

																{(notif.timestamp || notif.createdAt) && (
																	<p className='text-xs text-gray-500 mt-1'>
																		{formatNotificationTime(
																			notif.timestamp || notif.createdAt
																		)}
																	</p>
																)}
															</div>
														</div>
													</div>
												))
											)}
										</div>

										{/* 📎 Ссылка внизу */}
										<div className='p-3 border-t border-emerald-500/20 bg-black/40'>
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault()
													e.stopPropagation()
													setNotifOpen(false)
													// Всегда используем прямой переход
													setTimeout(() => {
														window.location.href = '/notifications'
													}, 100)
												}}
												onTouchEnd={(e) => {
													e.preventDefault()
													e.stopPropagation()
													setNotifOpen(false)
													setTimeout(() => {
														window.location.href = '/notifications'
													}, 100)
												}}
												className='w-full py-2 text-emerald-400 hover:text-emerald-300 active:text-emerald-200 text-sm font-medium transition-all touch-manipulation text-center rounded-lg hover:bg-emerald-500/10 active:bg-emerald-500/30 active:scale-95'
											>
												Все уведомления →
											</button>
										</div>
									</div>
								)}
							</div>

							{/* 🧭 Основная навигация */}
							{user.role === 'admin' ? (
								<>
									<Link href='/admin' className={linkStyle}>
										Админ-панель
									</Link>
									<Link href='/profile' className={linkStyle}>
										Профиль
									</Link>
								</>
							) : (
								<>
									{user.role === 'executor' && (
										<>
											<Link href='/specialists' className={linkStyle} data-onboarding-target="nav-specialists">
												Подиум исполнителей
											</Link>
											<Link href='/tasks' className={linkStyle} data-onboarding-target="nav-tasks">
												Каталог задач
											</Link>
											<Link href='/tasks/my' className={linkStyle}>
												Мои задачи
											</Link>
											<Link href='/responses/my' className={linkStyle}>
												Мои отклики
											</Link>
										</>
									)}
									{user.role === 'customer' && (
										<>
											<Link href='/specialists' className={linkStyle} data-onboarding-target="nav-specialists">
												Подиум исполнителей
											</Link>
											<Link href='/tasks' className={linkStyle} data-onboarding-target="nav-tasks">
												Каталог задач
											</Link>
											<Link href='/my-tasks' className={linkStyle} data-onboarding-target="nav-my-tasks">
												Мои задачи
											</Link>
											<Link href='/tasks/new' className={linkStyle} data-onboarding-target="nav-create-task">
												Создать задачу
											</Link>
										</>
									)}

									{/* Индикатор уровня для исполнителей */}
									{user.role === 'executor' && <LevelIndicator />}

									{/* Иконка профиля с фотографией */}
									<Link 
										href='/profile' 
										className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-emerald-500/30 hover:border-emerald-500/60 transition-all overflow-hidden bg-gray-800 hover:bg-gray-700" 
										data-onboarding-target="nav-profile"
										title="Профиль"
									>
										{user.avatarUrl ? (
											<Image
												src={user.avatarUrl}
												alt={user.fullName || user.email || 'Профиль'}
												width={40}
												height={40}
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="text-emerald-400 font-semibold text-lg">
												{user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
											</span>
										)}
									</Link>

									{/* 📂 Выпадающее меню */}
									<div className='relative' ref={menuRef}>
										<button
											onClick={() => setMenuOpen(v => !v)}
											className={linkStyle}
											data-onboarding-target="more-menu"
										>
											Ещё ▾
										</button>
										{menuOpen && (
											<div className='absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[10001] animate-fadeInDown overflow-hidden' data-onboarding-menu="more">
												<div className='py-2'>
												<Link
													href='/chats'
														className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400 relative'
													onClick={() => setMenuOpen(false)}
													data-onboarding-target="more-menu-chats"
												>
													💬 Чаты
													{unreadMessagesCount > 0 && (
															<span className='absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
															{unreadMessagesCount}
														</span>
													)}
												</Link>
												<Link
													href='/community'
														className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
													onClick={() => setMenuOpen(false)}
													data-onboarding-target="more-menu-community"
												>
													🏘️ Сообщество
												</Link>
												<Link
													href='/hire'
														className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
													onClick={() => setMenuOpen(false)}
													data-onboarding-target="more-menu-hire"
												>
													📑 Запросы найма
												</Link>
												</div>
												
												<div className='border-t border-emerald-500/20 py-2'>
													<Link
														href='/analytics'
														className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
														onClick={() => setMenuOpen(false)}
														data-onboarding-target="more-menu-analytics"
													>
														📊 Аналитика
													</Link>
													{/* Портфолио - только для исполнителей */}
													{user.role === 'executor' && (
														<Link
															href='/portfolio'
															className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
															onClick={() => setMenuOpen(false)}
															data-onboarding-target="more-menu-portfolio"
														>
															💼 Портфолио
														</Link>
													)}
												</div>

												<div className='border-t border-emerald-500/20 py-2'>
												<Link
													href='/settings'
														className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
														onClick={() => setMenuOpen(false)}
														data-onboarding-target="more-menu-settings"
												>
													⚙️ Настройки
												</Link>

													<button
														onClick={() => {
															setMenuOpen(false)
															handleLogout()
														}}
														className='block w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 ios-transition-fast hover:text-red-300'
													>
														🚪 Выйти
													</button>
												</div>
											</div>
										)}
									</div>
								</>
							)}
						</>
					) : (
						<>
							<Link
								href='/login'
								className='px-5 py-2 rounded-full border-2 border-emerald-400 text-emerald-400 ios-button hover:bg-emerald-400 hover:text-black font-medium'
							>
								Вход
							</Link>
							<Link
								href='/register'
								className='px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold ios-button hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]'
							>
								Регистрация
							</Link>
						</>
					)}
				</nav>
			</header>
		</>
	)
}
