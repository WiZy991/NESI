'use client'

import ChatMessage from '@/components/ChatMessage'
import MessageInput from '@/components/ChatMessageInput'
import ChatMessageSearch from '@/components/ChatMessageSearch'
import ChatSkeleton from '@/components/ChatSkeleton'
import EmptyState from '@/components/EmptyState'
import { useUser } from '@/context/UserContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { MessageSquare } from 'lucide-react'
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
	fileId?: string
	createdAt: string
	editedAt?: string | null
	replyTo?: {
		id: string
		content: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	} | null
	reactions?: Array<{
		emoji: string
		userId: string
		user?: {
			id: string
			fullName?: string
			email: string
		}
	}>
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
	const [messageSearchQuery, setMessageSearchQuery] = useState('')
	const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false)
	const [messageSearchMatches, setMessageSearchMatches] = useState<number[]>([])
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
	const previousSearchQueryRef = useRef<string>('')
	const [isTyping, setIsTyping] = useState(false)
	const [typingUser, setTypingUser] = useState<string | null>(null)
	const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
	const [replyTo, setReplyTo] = useState<Message['replyTo']>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const eventSourceRef = useRef<EventSource | null>(null)
	const messageSearchRefs = useRef<Map<string, HTMLDivElement>>(new Map())
	const searchInputRef = useRef<HTMLInputElement>(null)

	// КРИТИЧНО: Убираем квадратную обводку outline для поля поиска чатов
	useEffect(() => {
		const input = searchInputRef.current
		if (!input) return

		const removeOutline = () => {
			input.style.setProperty('outline', 'none', 'important')
			input.style.setProperty('outline-offset', '0', 'important')
			input.style.setProperty('box-shadow', 'none', 'important')
		}

		removeOutline()

		const events = ['focus', 'blur', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend']
		events.forEach(event => {
			input.addEventListener(event, removeOutline, true)
		})

		const observer = new MutationObserver(() => {
			removeOutline()
		})
		observer.observe(input, {
			attributes: true,
			attributeFilter: ['style', 'class']
		})

		return () => {
			events.forEach(event => {
				input.removeEventListener(event, removeOutline, true)
			})
			observer.disconnect()
		}
	}, [])

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
				
				// Проверяем, есть ли содержимое в ответе
				const text = await res.text()
				if (!text || text.trim() === '') {
					console.warn('⚠️ Пустой ответ от API чатов')
					setChats([])
					setLoading(false)
					return
				}

				let data
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					console.error('❌ Ошибка парсинга JSON:', parseError, 'Ответ:', text.substring(0, 200))
					setChats([])
					setLoading(false)
					return
				}

				console.log('📊 Ответ API чатов:', data)
				if (res.ok) {
					const loadedChats = data.chats || []

					// Сохраняем временные чаты, которые ещё не были заменены реальными
					setChats(prevChats => {
						const tempChats = prevChats.filter(chat =>
							chat.id.startsWith('temp_')
						)

						// Для каждого временного чата проверяем, есть ли уже реальный чат
						const validTempChats = tempChats.filter(tempChat => {
							if (tempChat.type === 'task' && tempChat.task?.id) {
								// Проверяем, есть ли реальный чат для этой задачи
								const realChatExists = loadedChats.some(
									(realChat: Chat) =>
										realChat.type === 'task' &&
										realChat.task?.id === tempChat.task?.id
								)
								return !realChatExists // Оставляем временный только если нет реального
							}
							if (tempChat.type === 'private' && tempChat.otherUser?.id) {
								// Проверяем, есть ли реальный чат с этим пользователем
								const realChatExists = loadedChats.some(
									(realChat: Chat) =>
										realChat.type === 'private' &&
										realChat.otherUser?.id === tempChat.otherUser?.id
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
						console.log('🔍 Обнаружен параметр для автооткрытия:', {
							openUserId,
							openTaskId,
						})
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
					console.error('❌ Ошибка API чатов:', {
						status: res.status,
						statusText: res.statusText,
						data: data,
						error: data?.error || 'Неизвестная ошибка'
					})
					setChats([])
				}
			} catch (error: any) {
				console.error('❌ Ошибка загрузки чатов:', error)
				setChats([])
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
								
								// Если пользователь находится в этом чате, помечаем уведомления как прочитанные
								// и обновляем счетчик уведомлений
								if (data.messageId && token) {
									// Помечаем уведомления связанные с этим сообщением как прочитанные
									fetch('/api/notifications/read', {
										method: 'POST',
										headers: {
											'Content-Type': 'application/json',
											Authorization: `Bearer ${token}`,
										},
										body: JSON.stringify({
											messageId: data.messageId,
											chatType: data.chatType,
											chatId: data.chatId,
										}),
									})
										.then(() => {
											// Обновляем счетчик непрочитанных уведомлений после пометки как прочитанных
											return fetch('/api/notifications/unread-count', {
												headers: {
													Authorization: `Bearer ${token}`,
												},
											})
										})
										.then(res => res.json())
										.then(unreadData => {
											if (unreadData.count !== undefined) {
												setUnreadCount(unreadData.count)
											}
										})
										.catch(err => {
											console.error('Ошибка обработки уведомлений:', err)
										})
								}
								
								// Автоматически прокручиваем вниз при новом сообщении в открытом чате (плавно)
								setTimeout(() => {
									const container = messagesContainerRef.current
									if (container) {
										// Плавная прокрутка до самого низа
										const targetScrollTop = container.scrollHeight - container.clientHeight
										const startScrollTop = container.scrollTop
										const distance = targetScrollTop - startScrollTop
										const duration = 300 // Длительность анимации в мс
										const startTime = Date.now()
										
										const animateScroll = () => {
											const elapsed = Date.now() - startTime
											const progress = Math.min(elapsed / duration, 1)
											// Используем easing функцию для плавности
											const easeOutCubic = 1 - Math.pow(1 - progress, 3)
											const currentScrollTop = startScrollTop + (distance * easeOutCubic)
											
											container.scrollTop = currentScrollTop
											
											if (progress < 1) {
												requestAnimationFrame(animateScroll)
											} else {
												// Финальная проверка - убеждаемся что прокрутили до самого низа
												container.scrollTop = container.scrollHeight
											}
										}
										
										requestAnimationFrame(animateScroll)
									}
								}, 100)
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

	// Сбрасываем ответ при смене чата
	useEffect(() => {
		setReplyTo(null)
	}, [selectedChat?.id])

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
				
				console.log('📡 Статус ответа:', res.status, res.statusText)
				
				// Проверяем, есть ли содержимое в ответе
				const text = await res.text()
				if (!text || text.trim() === '') {
					console.warn('⚠️ Пустой ответ от API, статус:', res.status)
					setMessages([])
					setMessagesLoading(false)
					return
				}

				let data
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					console.error('❌ Ошибка парсинга JSON:', parseError, 'Ответ:', text.substring(0, 200))
					setMessages([])
					setMessagesLoading(false)
					return
				}

				console.log('📊 Ответ API сообщений:', {
					status: res.status,
					ok: res.ok,
					dataType: Array.isArray(data) ? 'array' : typeof data,
					dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
					dataPreview: JSON.stringify(data).substring(0, 200)
				})

				if (res.ok) {
					const messagesData = data.messages || data || []
					console.log('✅ Сообщения загружены:', messagesData.length)
					if (messagesData.length > 0) {
						console.log('📝 Первое сообщение:', messagesData[0])
						// Проверяем сообщения с ответами
						const messagesWithReplies = messagesData.filter((m: Message) => m.replyTo !== null && m.replyTo !== undefined)
						if (messagesWithReplies.length > 0) {
							console.log('💬 Найдено сообщений с ответами:', messagesWithReplies.length)
							console.log('📎 Пример ответа:', JSON.stringify(messagesWithReplies[0].replyTo, null, 2))
						} else {
							console.log('⚠️ Нет сообщений с ответами')
						}
					}
					setMessages(messagesData)
					
					// Прокручиваем вниз после загрузки сообщений (плавно)
					setTimeout(() => {
						const container = messagesContainerRef.current
						if (container) {
							// Плавная прокрутка до самого низа
							const targetScrollTop = container.scrollHeight - container.clientHeight
							const startScrollTop = container.scrollTop
							const distance = targetScrollTop - startScrollTop
							const duration = 400 // Длительность анимации в мс
							const startTime = Date.now()
							
							const animateScroll = () => {
								const elapsed = Date.now() - startTime
								const progress = Math.min(elapsed / duration, 1)
								// Используем easing функцию для плавности
								const easeOutCubic = 1 - Math.pow(1 - progress, 3)
								const currentScrollTop = startScrollTop + (distance * easeOutCubic)
								
								container.scrollTop = currentScrollTop
								
								if (progress < 1) {
									requestAnimationFrame(animateScroll)
								} else {
									// Финальная проверка - убеждаемся что прокрутили до самого низа
									container.scrollTop = container.scrollHeight
								}
							}
							
							requestAnimationFrame(animateScroll)
						}
					}, 200)
				} else {
					// Если это ошибка, но есть данные, все равно пытаемся их использовать
					if (data && typeof data === 'object' && (data.messages || Array.isArray(data))) {
						const messagesData = data.messages || data || []
						console.warn('⚠️ API вернул ошибку, но есть данные:', messagesData.length)
						setMessages(messagesData)
					} else {
						console.error('❌ Ошибка API сообщений:', {
							status: res.status,
							statusText: res.statusText,
							data: data,
							url: url,
							responseText: text.substring(0, 500)
						})
						// Если это ошибка сервера, но не критичная, просто показываем пустой список
						if (res.status >= 500) {
							console.error('❌ Серверная ошибка, устанавливаем пустой список сообщений')
						}
						setMessages([])
					}
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

	// Автоскролл к последнему сообщению при открытии чата (только если поиск не открыт)
	// НЕ прокручиваем после закрытия поиска
	const preventAutoScrollRef = useRef(false)
	
	useEffect(() => {
		// Если поиск был открыт и теперь закрыт, предотвращаем прокрутку
		if (!isMessageSearchOpen && preventAutoScrollRef.current) {
			preventAutoScrollRef.current = false
			return
		}
	}, [isMessageSearchOpen])
	
	useEffect(() => {
		// Не прокручиваем если поиск только что закрыли
		if (preventAutoScrollRef.current) {
			return
		}
		
		if (messages.length > 0 && !messagesLoading && !isMessageSearchOpen) {
			console.log('📜 Автоскролл к последнему сообщению')
			// Используем плавную прокрутку до самого низа
			const container = messagesContainerRef.current
			if (container) {
				// Функция для плавной прокрутки до самого низа
				const smoothScrollToBottom = () => {
					const targetScrollTop = container.scrollHeight - container.clientHeight
					const startScrollTop = container.scrollTop
					const distance = targetScrollTop - startScrollTop
					const duration = 300 // Длительность анимации в мс
					const startTime = Date.now()
					
					const animateScroll = () => {
						const elapsed = Date.now() - startTime
						const progress = Math.min(elapsed / duration, 1)
						// Используем easing функцию для плавности
						const easeOutCubic = 1 - Math.pow(1 - progress, 3)
						const currentScrollTop = startScrollTop + (distance * easeOutCubic)
						
						container.scrollTop = currentScrollTop
						
						if (progress < 1) {
							requestAnimationFrame(animateScroll)
						} else {
							// Финальная проверка - убеждаемся что прокрутили до самого низа
							container.scrollTop = container.scrollHeight
						}
					}
					
					requestAnimationFrame(animateScroll)
				}
				
				// Первая попытка - через небольшую задержку для рендера
				setTimeout(() => {
					smoothScrollToBottom()
					// Дополнительная проверка через задержку на случай если контент еще загружается
					setTimeout(() => {
						if (container.scrollHeight > container.clientHeight) {
							const targetScrollTop = container.scrollHeight - container.clientHeight
							if (Math.abs(container.scrollTop - targetScrollTop) > 10) {
								container.scrollTop = container.scrollHeight
							}
						}
					}, 400)
				}, 100)
			}
		}
	}, [messages.length, messagesLoading, isMessageSearchOpen])

	// Отслеживание позиции прокрутки для кнопки "вниз"
	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const handleScroll = () => {
			// Проверяем, прокручен ли контейнер не до самого низа (с небольшим отступом в 100px)
			const isScrolledUp = 
				container.scrollHeight - container.scrollTop - container.clientHeight > 100
			setShowScrollToBottom(isScrolledUp)
		}

		container.addEventListener('scroll', handleScroll)
		// Проверяем при монтировании
		handleScroll()

		return () => {
			container.removeEventListener('scroll', handleScroll)
		}
	}, [messages.length, isMessageSearchOpen])

	// Функция прокрутки вниз
	const scrollToBottom = (instant = false) => {
		const container = messagesContainerRef.current
		if (container) {
			// Прокручиваем контейнер напрямую до самого низа
			container.scrollTo({
				top: container.scrollHeight,
				behavior: instant ? 'auto' : 'smooth',
			})
		} else {
			// Fallback на scrollIntoView
			messagesEndRef.current?.scrollIntoView({
				behavior: instant ? 'auto' : 'smooth',
				block: 'end',
			})
		}
	}

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
				(chat: Chat) => chat.type === 'task' && chat.task?.id === openTaskId
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
							console.error(
								'❌ Второй участник чата не найден (задача без исполнителя)'
							)
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
		
		// Отправляем событие о том, что чат открыт (для Header)
		if (typeof window !== 'undefined') {
			const chatInfo = chat.type === 'private' 
				? { chatType: 'private', chatId: chat.otherUser?.id }
				: { chatType: 'task', chatId: chat.task?.id }
			window.dispatchEvent(new CustomEvent('chatOpened', { detail: chatInfo }))
		}

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
					console.log(
						`✅ Прочитано, удалено уведомлений: ${data.deletedNotifications}`
					)

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
		console.log('📨 handleNewMessage вызван с данными:', newMessage)
		console.log('📎 Файл в сообщении:', {
			fileId: newMessage.fileId,
			fileName: newMessage.fileName,
			fileMimetype: newMessage.fileMimetype,
			fileUrl: newMessage.fileUrl
		})
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
					} else if (
						selectedChat.type === 'private' &&
						selectedChat.otherUser?.id
					) {
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
		const [isOnline, setIsOnline] = useState<boolean | null>(null)

		// Проверяем онлайн статус пользователя
		useEffect(() => {
			if (!userId) {
				setIsOnline(null)
				return
			}

			const checkOnlineStatus = async () => {
				try {
					const res = await fetch(`/api/users/${userId}/online`, {
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
					})
					
					if (!res.ok) {
						console.error('Ошибка проверки онлайн статуса:', res.status)
						return
					}
					
					const data = await res.json()
					// Если privacy = true, значит пользователь скрыл статус
					if (data.privacy) {
						setIsOnline(null)
					} else {
						setIsOnline(data.online === true)
					}
				} catch (err) {
					console.error('Ошибка проверки онлайн статуса:', err)
					setIsOnline(null)
				}
			}

			checkOnlineStatus()
			// Обновляем статус каждые 30 секунд
			const interval = setInterval(checkOnlineStatus, 30 * 1000)

			return () => clearInterval(interval)
		}, [userId])

		// Если есть userId, используем API для получения аватарки
		const apiAvatarUrl = userId ? `/api/avatars/${userId}` : null

		// Если нет URL или произошла ошибка загрузки, показываем fallback
		if (!apiAvatarUrl || imageError) {
			return (
				<div className='relative flex-shrink-0'>
					<div
						className='rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg'
						style={{ width: size, height: size }}
					>
						{fallbackText.charAt(0).toUpperCase()}
					</div>
					{/* Индикатор онлайн статуса */}
					<div
						className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
							isOnline === true 
								? 'bg-emerald-400 animate-pulse' 
								: isOnline === false 
									? 'bg-gray-500' 
									: 'bg-gray-600'
						}`}
						style={{ width: size * 0.25, height: size * 0.25 }}
						title={
							isOnline === true 
								? 'В сети' 
								: isOnline === false 
									? 'Не в сети' 
									: 'Статус неизвестен'
						}
					/>
				</div>
			)
		}

		return (
			<div className='relative flex-shrink-0'>
				<img
					src={apiAvatarUrl}
					alt='avatar'
					width={size}
					height={size}
					className='rounded-full object-cover'
					onError={() => {
						// Отсутствие аватарки - нормальная ситуация, не логируем как ошибку
						setImageError(true)
					}}
					onLoad={() => {
						// Аватарка успешно загружена
					}}
				/>
				{/* Индикатор онлайн статуса */}
				{isOnline !== null && (
					<div
						className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
							isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
						}`}
						style={{ width: size * 0.25, height: size * 0.25 }}
						title={isOnline ? 'В сети' : 'Не в сети'}
					/>
				)}
			</div>
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

	// Поиск по сообщениям
	useEffect(() => {
		if (!messageSearchQuery.trim() || messages.length === 0) {
			setMessageSearchMatches([])
			setCurrentMatchIndex(0)
			return
		}

		const query = messageSearchQuery.toLowerCase()
		const matches: number[] = []

		messages.forEach((msg, index) => {
			if (msg.content?.toLowerCase().includes(query)) {
				matches.push(index)
			}
		})

		setMessageSearchMatches(matches)
		setCurrentMatchIndex(matches.length > 0 ? 0 : -1)

		// Прокрутка к первому совпадению только если запрос изменился (не при первом открытии)
		const queryChanged = previousSearchQueryRef.current !== messageSearchQuery
		if (matches.length > 0 && messageSearchQuery.trim() !== '' && queryChanged) {
			const firstMatch = messages[matches[0]]
			if (firstMatch) {
				setTimeout(() => {
					const element = messageSearchRefs.current.get(firstMatch.id)
					element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}, 50)
			}
		}
		
		previousSearchQueryRef.current = messageSearchQuery
	}, [messageSearchQuery, messages])

	// Навигация по совпадениям
	const goToNextMatch = () => {
		if (messageSearchMatches.length === 0) return
		const nextIndex = (currentMatchIndex + 1) % messageSearchMatches.length
		setCurrentMatchIndex(nextIndex)
		const matchIndex = messageSearchMatches[nextIndex]
		const message = messages[matchIndex]
		if (message) {
			const element = messageSearchRefs.current.get(message.id)
			element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}

	const goToPreviousMatch = () => {
		if (messageSearchMatches.length === 0) return
		const prevIndex =
			currentMatchIndex === 0
				? messageSearchMatches.length - 1
				: currentMatchIndex - 1
		setCurrentMatchIndex(prevIndex)
		const matchIndex = messageSearchMatches[prevIndex]
		const message = messages[matchIndex]
		if (message) {
			const element = messageSearchRefs.current.get(message.id)
			element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}

	// Горячая клавиша Ctrl+F для поиска в сообщениях
	useKeyboardShortcuts([
		{
			key: 'f',
			ctrlKey: true,
			callback: () => {
				if (selectedChat && messages.length > 0) {
					setIsMessageSearchOpen(true)
				}
			},
		},
	])

	if (loading) {
		return (
			<div 
				className='fixed inset-x-0 top-16 px-3 sm:px-6'
				style={{ 
					height: 'calc(100vh - 4rem)',
					maxHeight: 'calc(100vh - 4rem)',
					minHeight: 'calc(100vh - 4rem)'
				}}
			>
				<div className='w-full h-full flex items-center justify-center'>
					<ChatSkeleton />
				</div>
			</div>
		)
	}

	return (
		<div 
			className='fixed inset-x-0 px-2 sm:px-3 md:px-6'
			style={{ 
				top: typeof window !== 'undefined' && window.innerWidth < 768 
					? '80px' // Отступ для мобильных (хедер ~64px + небольшой отступ)
					: 'calc(0.5rem - 1px)',
				height: typeof window !== 'undefined' && window.innerWidth < 768
					? 'calc(100vh - 80px)'
					: 'calc(100vh - 2rem + 1px)',
				maxHeight: typeof window !== 'undefined' && window.innerWidth < 768
					? 'calc(100vh - 80px)'
					: 'calc(100vh - 6rem + 1px)',
				minHeight: typeof window !== 'undefined' && window.innerWidth < 768
					? 'calc(100vh - 80px)'
					: 'calc(100vh - 6rem + 1px)',
				paddingTop: 0
			}}
		>
			<div className='w-full h-full flex flex-col bg-slate-900/35 md:rounded-3xl border border-emerald-300/25 overflow-hidden'>
				<div
					className='flex flex-1 overflow-hidden min-h-0'
					style={{ touchAction: 'pan-y' }}
				>
					{/* Левая колонка - список чатов */}
					<div
						className={`${
							selectedChat ? 'hidden md:flex' : 'flex'
						} w-full md:w-[340px] lg:w-[360px] flex-none border-r border-emerald-300/25 flex-col min-h-0 bg-slate-900/30`}
					>
						{/* Заголовок и поиск */}
						<div className='flex-shrink-0 p-4 sm:p-6 border-b border-emerald-300/25 bg-slate-900/40 backdrop-blur-lg'>
							<h1 className='text-xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent mb-3 sm:mb-5 flex items-center gap-3'>
								💬 <span>Чаты</span>
							</h1>
							<div className='relative'>
								<input
									ref={searchInputRef}
									type='text'
									placeholder='Поиск чатов...'
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className='w-full px-5 py-3.5 sm:py-4 bg-slate-800/35 border-2 border-emerald-300/30 rounded-full text-white text-sm sm:text-base placeholder-slate-300/80 focus:border-emerald-300 focus:outline-none focus:bg-slate-800/45 transition-all shadow-lg hover:shadow-emerald-300/15 ios-transition'
									style={{ 
										outline: 'none',
										outlineOffset: '0',
										boxShadow: 'none',
										WebkitAppearance: 'none',
										appearance: 'none'
									} as React.CSSProperties}
								/>
								<div className='absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/50'>
									🔍
								</div>
							</div>
						</div>

						{/* Список чатов */}
						<div
							className='flex-1 overflow-y-auto custom-scrollbar'
							style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
						>
							{filteredChats.length === 0 ? (
								<EmptyState
									icon={MessageSquare}
									title={
										searchQuery ? 'Чаты не найдены' : 'У вас пока нет чатов'
									}
									description={
										searchQuery
											? 'Попробуйте изменить поисковый запрос'
											: 'Начните общение с другими пользователями'
									}
								/>
							) : (
								filteredChats.map(chat => (
									<div
										key={chat.id}
										onClick={() => handleSelectChat(chat)}
										className={`p-4 sm:p-5 mx-3 sm:mx-4 my-2 sm:my-2.5 rounded-3xl cursor-pointer ios-transition hover-lift touch-manipulation ${
											selectedChat?.id === chat.id
												? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/15 border-2 border-emerald-300/40 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
												: 'bg-gradient-to-br from-slate-800/25 to-slate-900/35 border border-slate-700/30 hover:border-emerald-300/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]'
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
													<span className='text-[10px] sm:text-xs text-slate-200 bg-slate-800/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0'>
														{formatTime(chat.lastMessage.createdAt)}
													</span>
												</div>
												<p className='text-xs sm:text-sm text-slate-300 truncate mt-0.5 sm:mt-1'>
													{getChatSubtitle(chat)}
												</p>
												{chat.type === 'task' && chat.task?.id && (
													<Link
														href={`/tasks/${chat.task.id}`}
														className='text-[10px] sm:text-xs text-emerald-300 mt-0.5 sm:mt-1 bg-emerald-600/15 hover:bg-emerald-600/25 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full inline-block truncate max-w-full transition-all duration-200'
														onClick={e => e.stopPropagation()}
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
						} flex-1 flex-col bg-gradient-to-br from-slate-900/35 via-slate-900/20 to-slate-900/8 min-h-0 h-full overflow-hidden backdrop-blur-lg`}
					>
						{selectedChat ? (
							<>
								{/* Заголовок чата - фиксированный */}
								<div className='flex-shrink-0 px-3 sm:px-5 md:px-8 py-3 sm:py-4 md:py-5 border-b border-emerald-300/25 bg-slate-900/32 shadow-[0_12px_32px_rgba(15,118,110,0.22)] backdrop-blur-md relative'>
									{/* Кнопка поиска в сообщениях */}
									{selectedChat && messages.length > 0 && (
										<button
											onClick={() =>
												setIsMessageSearchOpen(!isMessageSearchOpen)
											}
											className='absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 p-2 sm:p-2.5 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition touch-manipulation'
											aria-label='Поиск в сообщениях (Ctrl+F)'
											title='Поиск в сообщениях (Ctrl+F)'
										>
											<span className='text-base sm:text-lg'>🔍</span>
										</button>
									)}
									<div className='flex items-center space-x-2 sm:space-x-3 md:space-x-4 pr-12 sm:pr-14 md:pr-16'>
										{/* Кнопка "Назад" для мобильных */}
										<button
											onClick={() => {
												setSelectedChat(null)
												// Отправляем событие о том, что чат закрыт (для Header)
												if (typeof window !== 'undefined') {
													window.dispatchEvent(new CustomEvent('chatClosed'))
												}
											}}
											className='md:hidden flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-600/60 to-gray-700/60 border border-gray-500/30 hover:border-emerald-400/50 active:bg-gray-600 active:scale-95 ios-transition hover-scale touch-manipulation shadow-lg transition-transform'
											aria-label='Вернуться к списку чатов'
										>
											<svg
												className='w-5 h-5 sm:w-6 sm:h-6 text-white'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2.5}
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
												{selectedChat.type === 'private' 
													? (selectedChat.otherUser?.fullName || selectedChat.otherUser?.email || 'Неизвестный пользователь')
													: getChatTitle(selectedChat)
												}
											</h2>
											<div className='flex items-center gap-2 mt-1 flex-wrap'>
												{selectedChat.type === 'task' ? (
													<>
														<span className='text-[10px] sm:text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 px-2 py-0.5 rounded-full'>
															💼 Чат по задаче
														</span>
														{selectedChat.task?.id && (
															<Link
																href={`/tasks/${selectedChat.task.id}`}
																className='text-[10px] sm:text-xs text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 px-2 py-0.5 rounded-full inline-block truncate max-w-full transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20'
																title='Перейти к задаче'
															>
																📋 {selectedChat.task.title}
															</Link>
														)}
													</>
												) : (
													<span className='text-[10px] sm:text-xs text-blue-300 bg-blue-900/30 border border-blue-500/30 px-2 py-0.5 rounded-full'>
														👤 По запросу найма
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Сообщения - растягиваемая область */}
								<div
									ref={messagesContainerRef}
									className='flex-1 overflow-y-auto px-3 sm:px-5 md:px-8 lg:px-10 xl:px-16 pt-4 sm:pt-6 pb-4 sm:pb-10 custom-scrollbar relative min-h-0'
									style={{
										touchAction: 'pan-y',
										WebkitOverflowScrolling: 'touch',
									}}
								>
									{/* Поиск по сообщениям */}
									{selectedChat && (
										<ChatMessageSearch
											isOpen={isMessageSearchOpen}
											onClose={() => {
												setIsMessageSearchOpen(false)
												setMessageSearchQuery('')
												setMessageSearchMatches([])
												setCurrentMatchIndex(0)
												previousSearchQueryRef.current = ''
												// Предотвращаем автоматическую прокрутку после закрытия поиска
												preventAutoScrollRef.current = true
											}}
											searchQuery={messageSearchQuery}
											onSearchChange={setMessageSearchQuery}
											matchCount={messageSearchMatches.length}
											currentMatch={currentMatchIndex + 1}
											onNext={goToNextMatch}
											onPrevious={goToPreviousMatch}
										/>
									)}
									{messagesLoading ? (
										<div className='flex items-center justify-center h-full'>
											<div className='text-center text-slate-200'>
												<div className='animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3'></div>
												<p>Загрузка сообщений...</p>
											</div>
										</div>
									) : messages.length === 0 ? (
										<EmptyState
											icon={MessageSquare}
											title='Начните общение'
											description='Отправьте первое сообщение!'
										/>
									) : (
										<div className='max-w-4xl w-full mx-auto space-y-2 sm:space-y-3 md:space-y-4'>
											{messages
												.map((msg, index) => {
													// Проверяем, что sender существует
													if (!msg.sender) {
														console.warn('Сообщение без отправителя:', msg)
														return null
													}

													// Определяем позицию в группе
													const prevMsg = index > 0 ? messages[index - 1] : null
													const nextMsg =
														index < messages.length - 1
															? messages[index + 1]
															: null

													const isFirstInGroup =
														!prevMsg || prevMsg.sender.id !== msg.sender.id
													const isLastInGroup =
														!nextMsg || nextMsg.sender.id !== msg.sender.id
													const showSenderName = isFirstInGroup

													const isHighlighted =
														messageSearchQuery &&
														msg.content
															?.toLowerCase()
															.includes(messageSearchQuery.toLowerCase()) &&
														messageSearchMatches.includes(index) &&
														messageSearchMatches[currentMatchIndex] === index
													const isSearchMatch =
														messageSearchQuery &&
														messageSearchMatches.includes(index) &&
														!isHighlighted

													return (
														<div
															key={msg.id}
															data-message-id={msg.id}
															ref={el => {
																if (el) {
																	messageSearchRefs.current.set(msg.id, el)
																} else {
																	messageSearchRefs.current.delete(msg.id)
																}
															}}
															className={
																isHighlighted
																	? 'bg-emerald-500/25 rounded-lg px-2 -mx-2 py-1 -my-1 transition-all duration-200'
																	: isSearchMatch
																		? 'bg-emerald-500/10 rounded-lg px-2 -mx-2 py-1 -my-1'
																		: ''
															}
														>
															<ChatMessage
																message={msg}
																chatType={selectedChat?.type || 'private'}
																showSenderName={showSenderName}
																isFirstInGroup={isFirstInGroup}
																isLastInGroup={isLastInGroup}
																onMessageUpdate={updatedMsg => {
																	setMessages(prev =>
																		prev.map(m =>
																			m.id === updatedMsg.id
																				? { ...m, ...updatedMsg }
																				: m
																		)
																	)
																}}
																onMessageDelete={messageId => {
																	setMessages(prev =>
																		prev.map(m =>
																			m.id === messageId
																				? {
																						...m,
																						content: '[Сообщение удалено]',
																				  }
																				: m
																		)
																	)
																}}
																onReply={messageId => {
																	const messageToReply = messages.find(m => m.id === messageId)
																	if (messageToReply) {
																		setReplyTo({
																			id: messageToReply.id,
																			content: messageToReply.content || 'Файл',
																			sender: messageToReply.sender,
																		})
																	}
																}}
															/>
														</div>
													)
												})
												.filter(Boolean)}
										</div>
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
													<span className='text-sm text-slate-200'>
														{typingUser} печатает...
													</span>
												</div>
											</div>
										</div>
									)}

									<div ref={messagesEndRef} />
								</div>
								
								{/* Кнопка прокрутки вниз */}
								{showScrollToBottom && !isMessageSearchOpen && (
									<button
										onClick={() => scrollToBottom()}
										className='fixed bottom-20 sm:bottom-24 right-4 sm:right-6 md:right-8 z-40 w-10 h-10 sm:w-9 sm:h-9 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-600/95 text-gray-300 hover:text-white rounded-full shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 animate-scaleFadeIn border border-slate-600/50 hover:border-slate-500/70 hover:scale-105 active:scale-95 touch-manipulation'
										aria-label='Прокрутить вниз'
										title='Прокрутить вниз'
									>
										<svg
											className='w-5 h-5 sm:w-4 sm:h-4'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M19 14l-7 7m0 0l-7-7m7 7V3'
											/>
										</svg>
									</button>
								)}

								{/* Поле ввода сообщения - закреплённое внизу колонки */}
								<div className='flex-shrink-0 border-t border-slate-700/50 bg-slate-800/60 md:bg-slate-800/50 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-10'>
									<div className='px-4 py-2 sm:px-5 sm:px-3'>
										<MessageInput
											chatType={selectedChat.type}
											otherUserId={selectedChat.otherUser?.id}
											taskId={selectedChat.task?.id}
											onMessageSent={handleNewMessage}
											replyTo={replyTo}
											onCancelReply={() => setReplyTo(null)}
										/>
									</div>
									{/* Безопасная зона для iOS */}
									<div
										className='h-safe-bottom md:hidden'
										style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
									/>
								</div>
							</>
						) : (
							<div className='hidden md:flex flex-1 items-center justify-center'>
								<div className='text-center text-slate-200 px-4'>
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
