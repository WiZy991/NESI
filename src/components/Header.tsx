'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ToastContainer } from './ToastNotification'
import {
	Bell,
	MessageSquare,
	Star,
	CheckCircle,
	AlertTriangle,
} from 'lucide-react' 

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

export default function Header() {
	const { user, token, logout, unreadCount, setUnreadCount } = useUser()
	const router = useRouter()
	const [menuOpen, setMenuOpen] = useState(false)
	const [notifOpen, setNotifOpen] = useState(false)
	const [notifications, setNotifications] = useState<any[]>([])
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
	const [sseConnected, setSseConnected] = useState(false)
	const [toastNotifications, setToastNotifications] = useState<any[]>([])
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
					// Пропускаем служебные события
					if (data.type === 'heartbeat' || data.type === 'connected') {
						return
					}

					// Пропускаем события набора текста
					if (data.type === 'typing') {
						return
					}

					// Обрабатываем остальные уведомления
					showNotification(data)
					if (data.type === 'message') {
						fetchUnreadMessages()
					}
				} catch (error) {
					console.error('Ошибка SSE:', error)
				}
			}

			eventSource.onerror = () => {
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

			// Обновляем уведомления и счетчик непрочитанных
			setNotifications(prev => [data, ...prev.slice(0, 4)])
			setUnreadCount(unreadCount + 1)

			// Добавляем toast уведомление
			const toastNotification = {
				id: `${Date.now()}-${Math.random()}`,
				type: data.type || 'notification',
				title: data.title || 'Новое уведомление',
				message: data.message || '',
				link: data.link,
				userId: data.userId,
				senderId: data.senderId,
				timestamp: data.timestamp || new Date().toISOString(),
			}
			setToastNotifications(prev => [...prev, toastNotification])
		}

		fetchUnreadMessages()
		connectSSE()

		const interval = setInterval(fetchUnreadMessages, 30000)
		return () => {
			clearInterval(interval)
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
			console.error('Ошибка при отметке уведомлений', err)
		}
	}

	const handleNotificationClick = async (notif: any) => {
		setNotifOpen(false)
		await markAllRead()
		if (notif.userId || notif.senderId) {
			const targetId = notif.userId || notif.senderId
			router.push(`/chats?open=${targetId}`)
			return
		}
		if (notif.link) router.push(notif.link)
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
		setToastNotifications(prev => prev.filter(toast => toast.id !== id))
	}

	return (
		<>
			<ToastContainer
				notifications={toastNotifications}
				onClose={handleToastClose}
			/>
			<header className='w-full px-8 py-4 flex justify-between items-center bg-black/70 backdrop-blur-md border-b border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] font-sans relative z-50'>
				<Link
					href='/'
					className='text-2xl font-semibold text-emerald-400 tracking-[0.08em] hover:scale-105 hover:text-emerald-300 transition-all duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]'
				>
					NESI
				</Link>

				<nav className='flex gap-7 items-center text-gray-200 font-poppins'>
					{user ? (
						<>
							{/* 🔔 Уведомления */}
<div className='relative' ref={notifRef}>
	<button
		onClick={() => setNotifOpen(v => !v)}
		className={`${linkStyle} text-lg flex items-center gap-1 relative`}
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
                       shadow-[0_0_25px_rgba(16,185,129,0.3)] z-50 overflow-hidden 
                       animate-fadeIn transition-all duration-300 ease-in-out origin-top'
		>
			<div className='max-h-64 overflow-y-auto custom-scrollbar'>
				{notifications.length === 0 ? (
					<div className='p-4 text-center text-gray-400'>
						<Bell className='w-6 h-6 mx-auto mb-2 text-gray-500' />
						<p>Нет новых уведомлений</p>
					</div>
				) : (
					notifications.map((notif, index) => (
						<div
							key={index}
							className='p-3 border-b border-gray-700 hover:bg-gray-800/60 transition cursor-pointer'
							onClick={() => handleNotificationClick(notif)}
						>
							<div className='flex items-start space-x-3'>
								{/* 🎯 Иконка в зависимости от типа уведомления */}
								<div
									className='w-8 h-8 rounded-full flex items-center justify-center 
                                             bg-emerald-900/40 border border-emerald-500/30 
                                             shadow-[0_0_6px_rgba(16,185,129,0.3)]'
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
  <p className='text-sm text-white font-medium truncate'>
    {notif.title}
  </p>

  {/* ✅ Исправленный вывод имени и сообщения */}
  <p className='text-xs text-gray-400 truncate'>
    {notif.sender ? (
      <>
        <strong className='text-gray-300'>{notif.sender}</strong>
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
											<Link href='/specialists' className={linkStyle}>
												Подиум исполнителей
											</Link>
											<Link href='/tasks' className={linkStyle}>
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
											<Link href='/specialists' className={linkStyle}>
												Подиум исполнителей
											</Link>
											<Link href='/tasks' className={linkStyle}>
												Каталог задач
											</Link>
											<Link href='/my-tasks' className={linkStyle}>
												Мои задачи
											</Link>
											<Link href='/tasks/new' className={linkStyle}>
												Создать задачу
											</Link>
										</>
									)}

									<Link href='/profile' className={linkStyle}>
										Профиль
									</Link>

									{/* 📂 Выпадающее меню */}
									<div className='relative' ref={menuRef}>
										<button
											onClick={() => setMenuOpen(v => !v)}
											className={linkStyle}
										>
											Ещё ▾
										</button>
										{menuOpen && (
											<div className='absolute right-0 mt-2 w-48 bg-gray-800 border border-emerald-500/30 rounded-lg shadow-lg z-50 animate-fadeIn'>
												<Link
													href='/chats'
													className='block px-4 py-2 hover:bg-gray-700/60 transition relative'
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
													className='block px-4 py-2 hover:bg-gray-700/60 transition'
													onClick={() => setMenuOpen(false)}
												>
													🏘️ Сообщество
												</Link>
												<Link
													href='/hire'
													className='block px-4 py-2 hover:bg-gray-700/60 transition'
													onClick={() => setMenuOpen(false)}
												>
													📑 Запросы найма
												</Link>

												<Link
													href='/settings'
													className='block px-4 py-2 hover:bg-gray-700/60 transition'
												>
													⚙️ Настройки
												</Link>

												<div className='border-t border-gray-700 mt-1'>
													<button
														onClick={() => {
															setMenuOpen(false)
															handleLogout()
														}}
														className='block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700/60 transition'
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
								className='px-5 py-2 rounded-full border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-medium'
							>
								Вход
							</Link>
							<Link
								href='/register'
								className='px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold hover:brightness-110 transition'
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
