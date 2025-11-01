'use client'

import MessageInput from '@/components/ChatMessageInput'
import ChatMessage from '@/components/ChatMessage'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

type Chat = {
	id: string
	type: 'private' | 'task'
	otherUser?: {
		id: string
		fullName?: string
		email: string
		avatarUrl?: string
	}
	task?: {
		id: string
		title: string
		customerId: string
		executorId: string
		customer: {
			id: string
			fullName?: string
			email: string
			avatarUrl?: string
		}
		executor: {
			id: string
			fullName?: string
			email: string
			avatarUrl?: string
		}
	}
	lastMessage: {
		id: string
		content: string
		createdAt: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	}
	unreadCount: number
}

type Message = {
	id: string
	content: string
	fileUrl?: string
	fileName?: string
	fileMimetype?: string
	createdAt: string
	sender: {
		id: string
		fullName?: string
		email: string
		avatarUrl?: string
	}
}

function ChatsPageContent() {
	const { user, token, setUnreadCount } = useUser()
	const searchParams = useSearchParams()
	const openUserId = searchParams?.get('open')
	const openTaskId = searchParams?.get('taskId')

	const [chats, setChats] = useState<Chat[]>([])
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(true)
	const [messagesLoading, setMessagesLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [isTyping, setIsTyping] = useState(false)
	const [typingUser, setTypingUser] = useState<string | null>(null)
	const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const eventSourceRef = useRef<EventSource | null>(null)

	// Блокируем скролл страницы на мобильной версии
	useEffect(() => {
		// Сохраняем текущие стили
		const originalOverflow = document.body.style.overflow
		const originalHeight = document.body.style.height
		const originalHtmlOverflow = document.documentElement.style.overflow
		
		// Блокируем скролл на body и html
		document.body.style.overflow = 'hidden'
		document.body.style.height = '100vh'
		document.documentElement.style.overflow = 'hidden'
		
		return () => {
			// Восстанавливаем при размонтировании
			document.body.style.overflow = originalOverflow
			document.body.style.height = originalHeight
			document.documentElement.style.overflow = originalHtmlOverflow
		}
	}, [])

	// Загрузка списка чатов и подключение к SSE
	useEffect(() => {
		if (!token) return

		const fetchChats = async () => {
			try {
				console.log('🔍 Загружаем чаты...')
				const res = await fetch('/api/chats', {
					headers: { Authorization: `Bearer ${token}` },
				})
			const data = await res.json()
			console.log('📊 Ответ API чатов:', data)
			if (res.ok) {
				const loadedChats = data.chats || []
				
				// Сохраняем временные чаты, которые ещё не были заменены реальными
				setChats(prevChats => {
					const tempChats = prevChats.filter(chat => chat.id.startsWith('temp_'))
					
					// Для каждого временного чата проверяем, есть ли уже реальный чат
					const validTempChats = tempChats.filter(tempChat => {
						if (tempChat.type === 'task' && tempChat.task?.id) {
							// Проверяем, есть ли реальный чат для этой задачи
							const realChatExists = loadedChats.some(
								(realChat: Chat) => 
									realChat.type === 'task' && realChat.task?.id === tempChat.task?.id
							)
							return !realChatExists // Оставляем временный только если нет реального
						}
						if (tempChat.type === 'private' && tempChat.otherUser?.id) {
							// Проверяем, есть ли реальный чат с этим пользователем
							const realChatExists = loadedChats.some(
								(realChat: Chat) =>
									realChat.type === 'private' && realChat.otherUser?.id === tempChat.otherUser?.id
							)
							return !realChatExists
						}
						return false
					})
					
					// Объединяем: сначала временные чаты, потом реальные
					return [...validTempChats, ...loadedChats]
				})
				console.log('✅ Чаты загружены:', loadedChats.length)

					// Устанавливаем флаг для автооткрытия чата
					if (openUserId || openTaskId) {
						console.log('🔍 Обнаружен параметр для автооткрытия:', { openUserId, openTaskId })
						setShouldAutoOpen(true)
					}

					// Отладочная информация для аватарок
					console.log('🖼️ Аватарки в загруженных чатах:')
					data.chats?.forEach((chat: any) => {
						if (chat.type === 'private') {
							console.log(`  Приватный чат с ${chat.otherUser?.id}:`, {
								fullName: chat.otherUser?.fullName,
								email: chat.otherUser?.email,
								avatarUrl: chat.otherUser?.avatarUrl,
							})
						} else if (chat.type === 'task') {
							console.log(`  Чат задачи ${chat.task?.id}:`, {
								customer: {
									fullName: chat.task?.customer?.fullName,
									email: chat.task?.customer?.email,
									avatarUrl: chat.task?.customer?.avatarUrl,
								},
								executor: {
									fullName: chat.task?.executor?.fullName,
									email: chat.task?.executor?.email,
									avatarUrl: chat.task?.executor?.avatarUrl,
								},
							})
						}
					})
				} else {
					console.error('❌ Ошибка API:', data)
				}
			} catch (error) {
				console.error('Ошибка загрузки чатов:', error)
			} finally {
				setLoading(false)
			}
		}

		// Подключение к SSE для получения новых сообщений
		const connectSSE = () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
			}

			const eventSource = new EventSource(
				`/api/notifications/stream?token=${encodeURIComponent(token)}`
			)

			eventSource.onopen = () => {
				console.log('🔔 SSE подключение установлено для чатов')
			}

			eventSource.onmessage = event => {
				try {
					const data = JSON.parse(event.data)
					console.log('📨 Получено новое сообщение в чатах:', data)

					if (data.type === 'message') {
						// Добавляем новое сообщение в текущий чат, если оно относится к нему
						if (selectedChat) {
							const isCurrentChat =
								(data.chatType === 'private' &&
									selectedChat.type === 'private' &&
									selectedChat.otherUser?.id === data.senderId) ||
								(data.chatType === 'task' &&
									selectedChat.type === 'task' &&
									selectedChat.task?.id === data.chatId.replace('task_', ''))

							if (isCurrentChat) {
								const newMessage: Message = {
									id: data.messageId,
									content: data.message,
									fileUrl: data.hasFile
										? `/api/files/${data.messageId}`
										: undefined,
									fileName: data.fileName,
									fileMimetype: data.hasFile
										? 'application/octet-stream'
										: undefined,
									createdAt: data.timestamp,
									sender: {
										id: data.senderId,
										fullName: data.sender,
										email: data.sender,
										avatarUrl: undefined,
									},
								}

								setMessages(prev => [...prev, newMessage])

								// Обновляем список чатов с новым последним сообщением
								setChats(prev =>
									prev.map(chat => {
										if (chat.id === selectedChat.id) {
											return {
												...chat,
												lastMessage: newMessage,
												unreadCount: 0,
											}
										}
										return chat
									})
								)
							}
						}

						// Обновляем список чатов
						setChats(prev =>
							prev.map(chat => {
								if (
									(data.chatType === 'private' &&
										chat.type === 'private' &&
										chat.otherUser?.id === data.senderId) ||
									(data.chatType === 'task' &&
										chat.type === 'task' &&
										chat.task?.id === data.chatId.replace('task_', ''))
								) {
									return {
										...chat,
										unreadCount:
											chat.id === selectedChat?.id ? 0 : chat.unreadCount + 1,
									}
								}
								return chat
							})
						)
					} else if (data.type === 'typing') {
						// Обрабатываем событие набора сообщения
						if (selectedChat) {
							const isCurrentChat =
								(data.chatType === 'private' &&
									selectedChat.type === 'private' &&
									selectedChat.otherUser?.id === data.senderId) ||
								(data.chatType === 'task' &&
									selectedChat.type === 'task' &&
									selectedChat.task?.id === data.chatId.replace('task_', ''))

							if (isCurrentChat) {
								setIsTyping(data.isTyping)
								setTypingUser(data.isTyping ? data.sender : null)

								// Автоматически скрываем индикатор через 3 секунды
								if (data.isTyping) {
									setTimeout(() => {
										setIsTyping(false)
										setTypingUser(null)
									}, 3000)
								}
							}
						}
					}
				} catch (error) {
					console.error('Ошибка парсинга SSE сообщения:', error)
				}
			}

			eventSource.onerror = error => {
				console.error('❌ Ошибка SSE в чатах:', error)

				// Переподключение через 5 секунд
				setTimeout(() => {
					if (token) {
						connectSSE()
					}
				}, 5000)
			}

			eventSourceRef.current = eventSource
		}

		fetchChats()
		connectSSE()

		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
			}
		}
	}, [token, selectedChat])

	// Загрузка сообщений для выбранного чата
	useEffect(() => {
		if (!selectedChat || !token) return

		const fetchMessages = async () => {
			setMessagesLoading(true)
			try {
				// Если это временный чат (только что созданный), просто показываем пустой список
				if (selectedChat.id.startsWith('temp_')) {
					console.log('📝 Временный чат, показываем пустой список сообщений')
					setMessages([])
					setMessagesLoading(false)
					return
				}

				let url = ''
				if (selectedChat.type === 'private') {
					const otherUserId = selectedChat.otherUser?.id
					url = `/api/messages/${otherUserId}`
				} else {
					const taskId = selectedChat.task?.id
					url = `/api/tasks/${taskId}/messages`
				}

				console.log('🔍 Загружаем сообщения для чата:', selectedChat.type, url)
				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				console.log('📊 Ответ API сообщений:', data)

				if (res.ok) {
					const messagesData = data.messages || data || []
					console.log('✅ Сообщения загружены:', messagesData.length)
					console.log('📝 Первое сообщение:', messagesData[0])
					setMessages(messagesData)
				} else {
					console.error('❌ Ошибка API сообщений:', data)
					setMessages([])
				}
			} catch (error) {
				console.error('Ошибка загрузки сообщений:', error)
				setMessages([])
			} finally {
				setMessagesLoading(false)
			}
		}

		fetchMessages()
	}, [selectedChat, token])

	// Автоскролл к последнему сообщению при открытии чата
	useEffect(() => {
		if (messages.length > 0 && messagesEndRef.current && !messagesLoading) {
			console.log('📜 Автоскролл к последнему сообщению')
			// Используем setTimeout чтобы дать время на рендер
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
			}, 100)
		}
	}, [messages.length, messagesLoading])

	// Автоматическое открытие чата при наличии параметра open или taskId
	useEffect(() => {
		if ((!openUserId && !openTaskId) || !shouldAutoOpen || !user || !token) {
			if ((openUserId || openTaskId) && shouldAutoOpen) {
				console.log('⏳ Ждем загрузки данных пользователя и токена...')
			}
			return
		}

		// Если открываем чат задачи
		if (openTaskId) {
			console.log('🔍 Пытаемся открыть чат задачи:', openTaskId)
			
			// Ищем существующий чат задачи
			const existingTaskChat = chats.find(
				(chat: Chat) =>
					chat.type === 'task' && chat.task?.id === openTaskId
			)

			if (existingTaskChat) {
				console.log('✅ Чат задачи найден, открываем:', existingTaskChat)
				handleSelectChat(existingTaskChat)
				setShouldAutoOpen(false)
				window.history.replaceState({}, '', '/chats')
			} else {
				console.log('📝 Чат задачи не найден, создаем новый...')
				
				const createTaskChat = async () => {
					try {
						// Загружаем данные задачи
						const taskRes = await fetch(`/api/tasks/${openTaskId}`, {
							headers: token ? { Authorization: `Bearer ${token}` } : {},
						})

						if (!taskRes.ok) {
							console.error('❌ Задача не найдена')
							setShouldAutoOpen(false)
							return
						}

						const taskData = await taskRes.json()
						const task = taskData.task || taskData

						// Определяем другого участника (если я заказчик - нужен исполнитель, и наоборот)
						const isCustomer = user.id === task.customerId
						const otherUser = isCustomer ? task.executor : task.customer

						if (!otherUser) {
							console.error('❌ Второй участник чата не найден (задача без исполнителя)')
							setShouldAutoOpen(false)
							return
						}

						// Создаем временный чат задачи
						const tempTaskChat: Chat = {
							id: `temp_task_${openTaskId}`,
							type: 'task',
							task: {
								id: task.id,
								title: task.title,
								customerId: task.customerId,
								executorId: task.executorId,
								customer: task.customer,
								executor: task.executor,
							},
							lastMessage: {
								id: 'temp',
								content: '',
								createdAt: new Date().toISOString(),
								sender: {
									id: user.id,
									fullName: user.fullName,
									email: user.email,
								},
							},
							unreadCount: 0,
						}

						console.log('✨ Создан временный чат задачи:', tempTaskChat)
						setChats(prev => [tempTaskChat, ...prev])
						setSelectedChat(tempTaskChat)
						setMessages([])
						setShouldAutoOpen(false)
						window.history.replaceState({}, '', '/chats')
					} catch (error) {
						console.error('❌ Ошибка создания чата задачи:', error)
						setShouldAutoOpen(false)
					}
				}

				createTaskChat()
			}
			return
		}

		// Если открываем приватный чат
		console.log('🔍 Пытаемся открыть чат с пользователем:', openUserId)

		// Ищем существующий чат
		const existingChat = chats.find(
			(chat: Chat) =>
				chat.type === 'private' && chat.otherUser?.id === openUserId
		)

		if (existingChat) {
			console.log('✅ Чат найден, открываем:', existingChat)
			// Используем handleSelectChat вместо прямого setSelectedChat
			// чтобы сработала пометка как прочитанное
			handleSelectChat(existingChat)
			setShouldAutoOpen(false)
			window.history.replaceState({}, '', '/chats')
		} else {
			// Создаем новый чат
			console.log(
				'📝 Чат не найден, создаем новый с пользователем:',
				openUserId
			)

			const createNewChat = async () => {
				try {
					const userRes = await fetch(`/api/users/${openUserId}`, {
						headers: token ? { Authorization: `Bearer ${token}` } : {},
					})

					if (!userRes.ok) {
						console.error('❌ Пользователь не найден')
						setShouldAutoOpen(false)
						return
					}

					const userData = await userRes.json()
					const otherUser = userData.user || userData

					const tempChat: Chat = {
						id: `temp_${openUserId}`,
						type: 'private',
						otherUser: {
							id: otherUser.id,
							fullName: otherUser.fullName,
							email: otherUser.email,
							avatarUrl: otherUser.avatarUrl,
						},
						lastMessage: {
							id: 'temp',
							content: '',
							createdAt: new Date().toISOString(),
							sender: {
								id: user.id,
								fullName: user.fullName,
								email: user.email,
							},
						},
						unreadCount: 0,
					}

					console.log('✨ Создан временный чат:', tempChat)
					setChats(prev => [tempChat, ...prev])
					setSelectedChat(tempChat)
					setMessages([])
					setShouldAutoOpen(false)
					window.history.replaceState({}, '', '/chats')
				} catch (error) {
					console.error('❌ Ошибка создания чата:', error)
					setShouldAutoOpen(false)
				}
			}

			createNewChat()
		}
	}, [openUserId, openTaskId, shouldAutoOpen, chats, user, token])

	// Функция для выбора чата
	const handleSelectChat = async (chat: Chat) => {
		setSelectedChat(chat)
		setMessages([])
		setMessagesLoading(true)

		// Сбрасываем счетчик непрочитанных сообщений для этого чата
		if (chat.unreadCount > 0) {
			setChats(prev =>
				prev.map(c => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
			)

			// Помечаем сообщения как прочитанные
			try {
				let response
				if (chat.type === 'private' && chat.otherUser?.id) {
					response = await fetch('/api/chats/mark-private-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ otherUserId: chat.otherUser.id }),
					})
				} else if (chat.type === 'task' && chat.task?.id) {
					response = await fetch('/api/chats/mark-task-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ taskId: chat.task.id }),
					})
				}

				// Обрабатываем ответ и обновляем счетчик уведомлений
				if (response && response.ok) {
					const data = await response.json()
					console.log(`✅ Прочитано, удалено уведомлений: ${data.deletedNotifications}`)
					
					// Обновляем счетчик непрочитанных уведомлений
					if (data.deletedNotifications > 0) {
						// Получаем актуальное количество непрочитанных уведомлений
						const notifRes = await fetch('/api/notifications/unread-count', {
							headers: { Authorization: `Bearer ${token}` },
						})
						if (notifRes.ok) {
							const notifData = await notifRes.json()
							setUnreadCount(notifData.count || 0)
						}
					}
				}
			} catch (error) {
				console.error('Ошибка при пометке сообщений как прочитанных:', error)
			}

			// Уведомляем родительский компонент об изменении счетчика
			window.dispatchEvent(
				new CustomEvent('chatOpened', {
					detail: { chatId: chat.id, unreadCount: chat.unreadCount },
				})
			)
		}
	}

	// Обработка нового сообщения
	const handleNewMessage = async (newMessage: any) => {
		// Добавляем новое сообщение в список
		setMessages(prev => [...prev, newMessage])

		// Если это было первое сообщение во временном чате, обновляем чат
		if (selectedChat?.id.startsWith('temp_')) {
			// Небольшая задержка перед перезагрузкой, чтобы дать время серверу обработать сообщение
			await new Promise(resolve => setTimeout(resolve, 300))
			
			// Перезагружаем список чатов, чтобы получить настоящий чат из базы
			try {
				const res = await fetch('/api/chats', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					const data = await res.json()
					const loadedChats = data.chats || []
					
					// Находим реальный чат
					let realChat = null
					
					if (selectedChat.type === 'task' && selectedChat.task?.id) {
						// Ищем чат задачи
						realChat = loadedChats.find(
							(chat: Chat) =>
								chat.type === 'task' && chat.task?.id === selectedChat.task?.id
						)
					} else if (selectedChat.type === 'private' && selectedChat.otherUser?.id) {
						// Ищем приватный чат
						realChat = loadedChats.find(
							(chat: Chat) =>
								chat.type === 'private' &&
								chat.otherUser?.id === selectedChat.otherUser?.id
						)
					}
					
					if (realChat) {
						// Обновляем временный чат на реальный в списке без полной перезагрузки
						setChats(prev => {
							// Удаляем временный чат и добавляем реальный
							const withoutTemp = prev.filter(c => c.id !== selectedChat.id)
							return [realChat, ...withoutTemp]
						})
						setSelectedChat(realChat)
					} else {
						// Если реальный чат ещё не найден, просто обновляем список
						setChats(loadedChats)
					}
				}
			} catch (error) {
				console.error('Ошибка обновления чатов:', error)
			}
		} else {
			// Обновляем список чатов с новым последним сообщением
			setChats(prev =>
				prev.map(chat => {
					if (chat.id === selectedChat?.id) {
						return {
							...chat,
							lastMessage: newMessage,
							unreadCount: 0, // Сбрасываем счетчик при отправке сообщения
						}
					}
					return chat
				})
			)
		}

		// Помечаем чат как прочитанный при отправке сообщения
		if (selectedChat) {
			try {
				if (selectedChat.type === 'private' && selectedChat.otherUser?.id) {
					await fetch('/api/chats/mark-private-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ otherUserId: selectedChat.otherUser.id }),
					})
				} else if (selectedChat.type === 'task' && selectedChat.task?.id) {
					await fetch('/api/chats/mark-task-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ taskId: selectedChat.task.id }),
					})
				}

				// Уведомляем хедер об изменении счетчика
				window.dispatchEvent(new CustomEvent('messageSent'))
			} catch (error) {
				console.error('Ошибка при пометке чата как прочитанного:', error)
			}
		}
	}

	// Фильтрация чатов по поиску
	const filteredChats = chats.filter(chat => {
		if (!searchQuery) return true

		const searchLower = searchQuery.toLowerCase()
		if (chat.type === 'private') {
			const name = chat.otherUser?.fullName || chat.otherUser?.email || ''
			return name.toLowerCase().includes(searchLower)
		} else {
			const taskTitle = chat.task?.title || ''
			const otherUserName =
				chat.otherUser?.fullName || chat.otherUser?.email || ''
			return (
				taskTitle.toLowerCase().includes(searchLower) ||
				otherUserName.toLowerCase().includes(searchLower)
			)
		}
	})

	const formatTime = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const days = Math.floor(diff / (1000 * 60 * 60 * 24))

		if (days === 0) {
			return date.toLocaleTimeString('ru-RU', {
				hour: '2-digit',
				minute: '2-digit',
			})
		} else if (days === 1) {
			return 'Вчера'
		} else if (days < 7) {
			return date.toLocaleDateString('ru-RU', { weekday: 'short' })
		} else {
			return date.toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
			})
		}
	}

	// Функция для правильного формирования URL аватарки
	const getAvatarUrl = (avatarUrl: string | null | undefined) => {
		if (!avatarUrl) return null

		// Если URL уже абсолютный (начинается с http), возвращаем как есть
		if (avatarUrl.startsWith('http')) {
			return avatarUrl
		}

		// Если URL начинается с /uploads, убираем начальный слеш
		if (avatarUrl.startsWith('/uploads')) {
			return avatarUrl.substring(1)
		}

		// Если URL не начинается с uploads, добавляем uploads/
		if (!avatarUrl.startsWith('uploads')) {
			return `uploads/${avatarUrl}`
		}

		return avatarUrl
	}

	// Компонент аватарки с fallback
	const AvatarComponent = ({
		avatarUrl,
		fallbackText,
		size = 48,
		userId,
	}: {
		avatarUrl?: string | null
		fallbackText: string
		size?: number
		userId?: string
	}) => {
		const [imageError, setImageError] = useState(false)
		const [imageLoaded, setImageLoaded] = useState(false)

		// Если есть userId, используем API для получения аватарки
		const apiAvatarUrl = userId ? `/api/avatars/${userId}` : null

		// Если нет URL или произошла ошибка загрузки, показываем fallback
		if (!apiAvatarUrl || imageError) {
			return (
				<div
					className='rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg'
					style={{ width: size, height: size }}
				>
					{fallbackText.charAt(0).toUpperCase()}
				</div>
			)
		}

		return (
			<img
				src={apiAvatarUrl}
				alt='avatar'
				width={size}
				height={size}
				className='rounded-full object-cover'
				onError={() => {
					console.error('❌ Ошибка загрузки аватарки из API:', apiAvatarUrl)
					setImageError(true)
				}}
				onLoad={() => {
					console.log('✅ Аватарка загружена из API:', apiAvatarUrl)
					setImageLoaded(true)
				}}
			/>
		)
	}

	const getChatTitle = (chat: Chat) => {
		if (chat.type === 'private') {
			return (
				chat.otherUser?.fullName ||
				chat.otherUser?.email ||
				'Неизвестный пользователь'
			)
		} else {
			return chat.task?.title || 'Задача'
		}
	}

	const getChatSubtitle = (chat: Chat) => {
		if (chat.type === 'private') {
			return chat.lastMessage.content || 'Файл'
		} else {
			const senderName =
				chat.lastMessage.sender.fullName || chat.lastMessage.sender.email
			return `${senderName}: ${chat.lastMessage.content || 'Файл'}`
		}
	}

	if (loading) {
		return (
			<div className='fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-gray-900 md:bg-transparent flex items-center justify-center'>
				<div className='text-emerald-400 text-lg'>Загрузка чатов...</div>
			</div>
		)
	}

	return (
		<div 
			className='fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-gray-900 md:bg-transparent p-0 md:p-4 overflow-hidden'
			style={{ touchAction: 'none' }}
		>
			<div className='max-w-7xl mx-auto h-full bg-gray-900 md:bg-gray-900/20 backdrop-blur-sm md:rounded-2xl overflow-hidden flex flex-col'>
				<div className='flex flex-1 overflow-hidden min-h-0' style={{ touchAction: 'pan-y' }}>
					{/* Левая колонка - список чатов */}
					<div
						className={`${
							selectedChat ? 'hidden md:flex' : 'flex'
						} w-full md:w-1/3 bg-gray-800/20 backdrop-blur-sm flex-col min-h-0`}
					>
					{/* Заголовок и поиск */}
					<div className='flex-shrink-0 p-3 sm:p-6 bg-gradient-to-r from-emerald-900/20 to-transparent'>
						<h1 className='text-lg sm:text-2xl font-bold text-emerald-400 mb-2 sm:mb-4 flex items-center'>
							💬 Чаты
						</h1>
						<input
							type='text'
							placeholder='Поиск чатов...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='w-full px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm sm:text-base placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all'
						/>
					</div>

						{/* Список чатов */}
						<div 
							className='flex-1 overflow-y-auto custom-scrollbar'
							style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
						>
							{filteredChats.length === 0 ? (
								<div className='p-6 text-center text-gray-400'>
									<div className='text-4xl mb-3'>💭</div>
									<p className='text-lg font-medium mb-2'>
										{searchQuery ? 'Чаты не найдены' : 'У вас пока нет чатов'}
									</p>
									<p className='text-sm text-gray-500'>
										{searchQuery
											? 'Попробуйте изменить поисковый запрос'
											: 'Начните общение с другими пользователями'}
									</p>
								</div>
							) : (
								filteredChats.map(chat => (
									<div
										key={chat.id}
										onClick={() => handleSelectChat(chat)}
										className={`p-3 sm:p-4 mx-2 sm:mx-3 my-1.5 sm:my-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gray-700/50 active:bg-gray-700 touch-manipulation ${
											selectedChat?.id === chat.id
												? 'bg-emerald-900/30 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
												: 'hover:shadow-md'
										}`}
									>
										<div className='flex items-center space-x-2 sm:space-x-3'>
											{/* Аватар */}
											{chat.type === 'private' ? (
												<AvatarComponent
													avatarUrl={chat.otherUser?.avatarUrl}
													fallbackText={
														chat.otherUser?.fullName ||
														chat.otherUser?.email ||
														'?'
													}
													size={window.innerWidth < 640 ? 44 : 48}
													userId={chat.otherUser?.id}
												/>
											) : (
												<div className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0'>
													<span className='text-lg sm:text-xl'>📋</span>
												</div>
											)}

											{/* Информация о чате */}
											<div className='flex-1 min-w-0'>
												<div className='flex items-center justify-between gap-2'>
													<h3 className='text-white font-medium truncate text-sm sm:text-base'>
														{getChatTitle(chat)}
													</h3>
													<span className='text-[10px] sm:text-xs text-gray-400 bg-gray-700/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0'>
														{formatTime(chat.lastMessage.createdAt)}
													</span>
												</div>
												<p className='text-xs sm:text-sm text-gray-400 truncate mt-0.5 sm:mt-1'>
													{getChatSubtitle(chat)}
												</p>
												{chat.type === 'task' && chat.task?.id && (
													<Link
														href={`/tasks/${chat.task.id}`}
														className='text-[10px] sm:text-xs text-emerald-400 mt-0.5 sm:mt-1 bg-emerald-900/20 hover:bg-emerald-900/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full inline-block truncate max-w-full transition-all duration-200'
														onClick={(e) => e.stopPropagation()}
														title='Перейти к задаче'
													>
														📋 {chat.task.title}
													</Link>
												)}
											</div>

											{/* Индикатор непрочитанных */}
											{chat.unreadCount > 0 && (
												<div className='bg-emerald-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg flex-shrink-0'>
													{chat.unreadCount}
												</div>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>

					{/* Правая колонка - чат */}
					<div
						className={`${
							selectedChat ? 'flex' : 'hidden md:flex'
						} flex-1 flex-col bg-gray-800/10 backdrop-blur-sm min-h-0`}
					>
						{selectedChat ? (
							<>
								{/* Заголовок чата - фиксированный */}
								<div className='flex-shrink-0 p-3 sm:p-6 bg-gradient-to-r from-emerald-900/20 to-transparent border-b border-gray-700/50'>
									<div className='flex items-center space-x-3 sm:space-x-4'>
										{/* Кнопка "Назад" для мобильных */}
										<button
											onClick={() => setSelectedChat(null)}
											className='md:hidden flex items-center justify-center w-12 h-12 rounded-full bg-gray-700/50 hover:bg-gray-700 active:bg-gray-600 transition-colors touch-manipulation'
										>
											<svg
												className='w-6 h-6 text-white'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M15 19l-7-7 7-7'
												/>
											</svg>
										</button>
										{selectedChat.type === 'private' ? (
											<div className='flex-shrink-0'>
												<AvatarComponent
													avatarUrl={selectedChat.otherUser?.avatarUrl}
													fallbackText={
														selectedChat.otherUser?.fullName ||
														selectedChat.otherUser?.email ||
														'?'
													}
													size={window.innerWidth < 640 ? 40 : 48}
													userId={selectedChat.otherUser?.id}
												/>
											</div>
										) : (
											<div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0'>
												<span className='text-xl sm:text-2xl'>📋</span>
											</div>
										)}
										<div className='flex-1 min-w-0'>
											<h2 className='text-white font-semibold text-sm sm:text-lg truncate'>
												{getChatTitle(selectedChat)}
											</h2>
											{selectedChat.type === 'task' && selectedChat.task?.id && (
												<Link
													href={`/tasks/${selectedChat.task.id}`}
													className='text-[10px] sm:text-sm text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block mt-1 truncate max-w-full transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20'
													title='Перейти к задаче'
												>
													📋 {selectedChat.task.title}
												</Link>
											)}
										</div>
									</div>
								</div>

							{/* Сообщения - растягиваемая область */}
							<div 
								className='flex-1 overflow-y-auto px-3 pt-3 pb-4 sm:px-6 sm:pt-6 sm:pb-4 custom-scrollbar'
								style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
							>
									{messagesLoading ? (
										<div className='flex items-center justify-center h-full'>
											<div className='text-center text-gray-400'>
												<div className='animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3'></div>
												<p>Загрузка сообщений...</p>
											</div>
										</div>
									) : messages.length === 0 ? (
										<div className='flex items-center justify-center h-full'>
											<div className='text-center text-gray-400'>
												<div className='text-6xl mb-4'>💬</div>
												<h3 className='text-xl font-semibold mb-2'>
													Начните общение
												</h3>
												<p>Отправьте первое сообщение!</p>
											</div>
										</div>
								) : (
									messages
										.map((msg, index) => {
											// Проверяем, что sender существует
											if (!msg.sender) {
												console.warn('Сообщение без отправителя:', msg)
												return null
											}

											// Определяем позицию в группе
											const prevMsg = index > 0 ? messages[index - 1] : null
											const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
											
											const isFirstInGroup = !prevMsg || prevMsg.sender.id !== msg.sender.id
											const isLastInGroup = !nextMsg || nextMsg.sender.id !== msg.sender.id
											const showSenderName = isFirstInGroup

											return (
												<ChatMessage
													key={msg.id}
													message={msg}
													chatType={selectedChat?.type || 'private'}
													showSenderName={showSenderName}
													isFirstInGroup={isFirstInGroup}
													isLastInGroup={isLastInGroup}
													onMessageUpdate={updatedMsg => {
														setMessages(prev =>
															prev.map(m =>
																m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
															)
														)
													}}
													onMessageDelete={messageId => {
														setMessages(prev =>
															prev.map(m =>
																m.id === messageId
																	? { ...m, content: '[Сообщение удалено]' }
																	: m
															)
														)
													}}
												/>
											)
										})
										.filter(Boolean) // Убираем null значения
								)}

									{/* Индикатор набора сообщения */}
									{isTyping && typingUser && (
										<div className='flex justify-start'>
											<div className='max-w-[75%] p-4 rounded-2xl bg-gray-700/80 backdrop-blur-sm text-gray-100 rounded-bl-md border border-gray-600/50'>
												<div className='flex items-center space-x-2'>
													<div className='flex space-x-1'>
														<div className='w-2 h-2 bg-emerald-400 rounded-full animate-bounce'></div>
														<div
															className='w-2 h-2 bg-emerald-400 rounded-full animate-bounce'
															style={{ animationDelay: '0.1s' }}
														></div>
														<div
															className='w-2 h-2 bg-emerald-400 rounded-full animate-bounce'
															style={{ animationDelay: '0.2s' }}
														></div>
													</div>
													<span className='text-sm text-gray-400'>
														{typingUser} печатает...
													</span>
												</div>
											</div>
										</div>
									)}

									<div ref={messagesEndRef} />
								</div>

								{/* Поле ввода сообщения - фиксированное внизу */}
								<div className='fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto flex-shrink-0 border-t border-gray-700/50 bg-gray-900 md:bg-gray-900/50 backdrop-blur-md z-50 shadow-2xl'>
									<div className='p-3 sm:p-4'>
										<MessageInput
											chatType={selectedChat.type}
											otherUserId={selectedChat.otherUser?.id}
											taskId={selectedChat.task?.id}
											onMessageSent={handleNewMessage}
										/>
									</div>
									{/* Безопасная зона для iOS */}
									<div className='h-safe-bottom md:hidden' style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
								</div>
							</>
						) : (
							<div className='hidden md:flex flex-1 items-center justify-center'>
								<div className='text-center text-gray-400 px-4'>
									<div className='text-6xl sm:text-8xl mb-4 sm:mb-6'>💬</div>
									<h2 className='text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-white'>
										Выберите чат
									</h2>
									<p className='text-base sm:text-lg'>
										Выберите чат из списка слева, чтобы начать общение
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default function ChatsPage() {
	return (
		<Suspense
			fallback={
				<div className='fixed top-14 sm:top-16 left-0 right-0 bottom-0 flex items-center justify-center bg-gray-900 md:bg-transparent'>
					<div className='text-center'>
						<div className='animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4'></div>
						<div className='text-emerald-400 text-lg'>Загрузка чатов...</div>
					</div>
				</div>
			}
		>
			<ChatsPageContent />
		</Suspense>
	)
}
