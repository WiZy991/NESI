'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function Header() {
	const { user, token, logout, unreadCount, setUnreadCount } = useUser()
	const router = useRouter()
	const [menuOpen, setMenuOpen] = useState(false)
	const [notifOpen, setNotifOpen] = useState(false)
	const [notifications, setNotifications] = useState<any[]>([])
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
	const [sseConnected, setSseConnected] = useState(false)
	const menuRef = useRef<HTMLDivElement | null>(null)
	const notifRef = useRef<HTMLDivElement | null>(null)
	const eventSourceRef = useRef<EventSource | null>(null)

	const handleLogout = () => {
		logout()
		router.push('/login')
	}

	// Закрытие меню при клике вне
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node) &&
				notifRef.current &&
				!notifRef.current.contains(e.target as Node)
			) {
				setMenuOpen(false)
				setNotifOpen(false)
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

	// Загрузка количества непрочитанных сообщений и SSE
	useEffect(() => {
		if (!user || !token) return

		const fetchUnreadMessages = async () => {
			try {
				const res = await fetch('/api/chats/unread-count', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				if (res.ok) {
					setUnreadMessagesCount(data.unreadCount || 0)
				} else {
					console.error('Ошибка получения непрочитанных сообщений:', data)
					setUnreadMessagesCount(0)
				}
			} catch (err) {
				console.error('Ошибка получения непрочитанных сообщений:', err)
			}
		}

		const connectSSE = () => {
			if (eventSourceRef.current) eventSourceRef.current.close()

			const eventSource = new EventSource(
				`/api/notifications/stream?token=${encodeURIComponent(token)}`
			)

			eventSource.onopen = () => {
				console.log('🔔 SSE подключение установлено')
				setSseConnected(true)
			}

			eventSource.onmessage = event => {
				try {
					const data = JSON.parse(event.data)
					console.log('📨 Получено SSE сообщение:', data)

					if (data.type === 'message') {
						showNotification(data)
						fetchUnreadMessages()
					} else if (data.type === 'heartbeat') {
						console.log('💓 SSE heartbeat получен')
					}
				} catch (error) {
					console.error('Ошибка парсинга SSE сообщения:', error)
				}
			}

			eventSource.onerror = error => {
				console.error('❌ Ошибка SSE:', error)
				setSseConnected(false)
				setTimeout(() => {
					if (user && token) connectSSE()
				}, 5000)
			}

			eventSourceRef.current = eventSource
		}

		const showNotification = (data: any) => {
			if (data.playSound) {
				try {
					const audioContext = new (window.AudioContext ||
						window.webkitAudioContext)()
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

			if ('Notification' in window && Notification.permission === 'granted') {
				const notification = new Notification(data.title, {
					body: `${data.sender}: ${data.message}`,
					icon: '/favicon.ico',
					tag: data.messageId,
				})

				notification.onclick = () => {
					window.focus()
					if (data.chatType === 'private') {
						router.push('/chats')
					} else if (data.chatType === 'task') {
						router.push(`/tasks/${data.chatId.replace('task_', '')}`)
					}
					notification.close()
				}
				setTimeout(() => notification.close(), 5000)
			}

			setNotifications(prev => [data, ...prev.slice(0, 4)])
		}

		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission()
		}

		fetchUnreadMessages()
		connectSSE()

		const interval = setInterval(fetchUnreadMessages, 30000)
		const handleChatOpened = () => fetchUnreadMessages()
		const handleMessageSent = () => fetchUnreadMessages()
		window.addEventListener('chatOpened', handleChatOpened)
		window.addEventListener('messageSent', handleMessageSent)

		return () => {
			clearInterval(interval)
			window.removeEventListener('chatOpened', handleChatOpened)
			window.removeEventListener('messageSent', handleMessageSent)
			if (eventSourceRef.current) eventSourceRef.current.close()
		}
	}, [user, token])

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
			console.error('Ошибка при отметке уведомлений как прочитанных', err)
		}
	}

	// ✅ Исправлено: переход из плашки уведомления работает!
	const handleNotificationClick = async (notif: any) => {
		setNotifOpen(false)
		await markAllRead()
		if (notif.link) {
			router.push(notif.link)
		} else if (notif.chatType === 'private') {
			router.push('/chats')
		} else if (notif.chatType === 'task' && notif.chatId) {
			router.push(`/tasks/${notif.chatId.replace('task_', '')}`)
		}
	}

	const handleGoToNotifications = async () => {
		setNotifOpen(false)
		await markAllRead()
		router.push('/notifications')
	}

	return (
		<header className='w-full px-8 py-4 flex justify-between items-center bg-black border-b border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)] relative'>
			<Link
				href='/'
				className='text-2xl font-bold text-emerald-400 tracking-widest hover:scale-105 transition'
			>
				NESI
			</Link>

			<nav className='flex gap-6 items-center relative text-gray-200'>
				{user ? (
					<>
						{/* Уведомления */}
						<div className='relative' ref={notifRef}>
							<button
								onClick={() => setNotifOpen(v => !v)}
								className='relative flex items-center gap-1 hover:text-emerald-400 transition'
							>
								<span className='text-lg'>🔔</span>
								{unreadCount > 0 && (
									<span className='absolute -top-2 -right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
										{unreadCount}
									</span>
								)}
								{sseConnected && (
									<span className='absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse'></span>
								)}
							</button>

							{notifOpen && (
								<div className='absolute right-0 mt-3 w-80 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] z-50 overflow-hidden'>
									<div className='max-h-64 overflow-y-auto custom-scrollbar'>
										{notifications.length === 0 ? (
											<div className='p-4 text-center text-gray-400'>
												<div className='text-2xl mb-2'>🔔</div>
												<p>Нет новых уведомлений</p>
											</div>
										) : (
											notifications.map((notif, index) => (
												<div
													key={index}
													className='p-3 border-b border-gray-700 hover:bg-gray-800 transition cursor-pointer'
													onClick={() => handleNotificationClick(notif)}
												>
													<div className='flex items-start space-x-3'>
														<div className='w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
															{notif.sender?.charAt(0) || '?'}
														</div>
														<div className='flex-1 min-w-0'>
															<p className='text-sm text-white font-medium truncate'>
																{notif.title}
															</p>
															<p className='text-xs text-gray-400 truncate'>
																<strong>{notif.sender}:</strong> {notif.message}
															</p>
															{notif.taskTitle && (
																<p className='text-xs text-emerald-400 mt-1'>
																	📋 {notif.taskTitle}
																</p>
															)}
															<p className='text-xs text-gray-500 mt-1'>
																{new Date(notif.timestamp).toLocaleTimeString()}
															</p>
														</div>
													</div>
												</div>
											))
										)}
									</div>
									<div className='p-3 border-t border-emerald-500/20 bg-black/40 text-center'>
										<button
											onClick={handleGoToNotifications}
											className='text-emerald-400 hover:underline text-sm font-medium'
										>
											Перейти к уведомлениям →
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Остальная навигация */}
						{user.role === 'admin' ? (
							<>
								<Link href='/admin' className='hover:text-emerald-400 transition'>
									Админ-панель
								</Link>
								<Link href='/profile' className='hover:text-emerald-400 transition'>
									Профиль
								</Link>
							</>
						) : (
							<>
								{user.role === 'executor' && (
									<>
										<Link href='/specialists' className='hover:text-emerald-400 transition'>
											Подиум исполнителей
										</Link>
										<Link href='/tasks' className='hover:text-emerald-400 transition'>
											Каталог задач
										</Link>
										<Link href='/tasks/my' className='hover:text-emerald-400 transition'>
											Мои задачи
										</Link>
										<Link href='/responses/my' className='hover:text-emerald-400 transition'>
											Мои отклики
										</Link>
									</>
								)}
								{user.role === 'customer' && (
									<>
										<Link href='/specialists' className='hover:text-emerald-400 transition'>
											Подиум исполнителей
										</Link>
										<Link href='/tasks' className='hover:text-emerald-400 transition'>
											Каталог задач
										</Link>
										<Link href='/my-tasks' className='hover:text-emerald-400 transition'>
											Мои задачи
										</Link>
										<Link href='/tasks/new' className='hover:text-emerald-400 transition'>
											Создать задачу
										</Link>
									</>
								)}

								<Link href='/profile' className='hover:text-emerald-400 transition'>
									Профиль
								</Link>

								<div className='relative' ref={menuRef}>
									<button
										onClick={() => setMenuOpen(v => !v)}
										className='hover:text-emerald-400 transition'
									>
										Ещё ▾
									</button>
									{menuOpen && (
										<div className='absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50'>
											<Link
												href='/chats'
												className='block px-4 py-2 hover:bg-gray-700 transition relative'
												onClick={() => setMenuOpen(false)}
											>
												💬 Чаты
												{unreadMessagesCount > 0 && (
													<span className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
														{unreadMessagesCount}
													</span>
												)}
											</Link>
											<Link
												href='/community'
												className='block px-4 py-2 hover:bg-gray-700 transition'
												onClick={() => setMenuOpen(false)}
											>
												🏘️ Сообщество
											</Link>
											<Link
												href='/hire'
												className='block px-4 py-2 hover:bg-gray-700 transition'
												onClick={() => setMenuOpen(false)}
											>
												📑 Запросы найма
											</Link>

											{/* 👇 Кнопка выхода теперь внизу */}
											<div className='border-t border-gray-700 mt-1'>
												<button
													onClick={() => {
														setMenuOpen(false)
														handleLogout()
													}}
													className='block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition'
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
							className='px-5 py-2 rounded-full border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition'
						>
							Вход
						</Link>
						<Link
							href='/register'
							className='px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-medium hover:brightness-110 transition'
						>
							Регистрация
						</Link>
					</>
				)}
			</nav>
		</header>
	)
}
