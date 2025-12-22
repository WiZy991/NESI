'use client'

import AttachmentsModal from '@/components/AttachmentsModal'
import ChatMessage from '@/components/ChatMessage'
import MessageInput from '@/components/ChatMessageInput'
import ChatMessageSearch from '@/components/ChatMessageSearch'
import ChatSkeleton from '@/components/ChatSkeleton'
import EmptyState from '@/components/EmptyState'
import { MessageSkeleton } from '@/components/SkeletonLoader'
import { useUser } from '@/context/UserContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { clientLogger } from '@/lib/clientLogger'
import { useConfirm } from '@/lib/confirm'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import React, {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'

type ChatPresence = {
	lastReadAt: string | null
	lastActivityAt: string | null
	typingAt: string | null
}

type Chat = {
	id: string
	type: 'private' | 'task' | 'team'
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
		executorId: string | null
		teamId: string | null
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
		} | null
		team?: {
			id: string
			name: string
		} | null
	}
	team?: {
		id: string
		name: string
		description: string | null
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
	presence?: ChatPresence | null
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

const relativeTimeFormatter = new Intl.RelativeTimeFormat('ru', {
	numeric: 'auto',
})

const DEFAULT_PRESENCE: ChatPresence = {
	lastReadAt: null,
	lastActivityAt: null,
	typingAt: null,
}

// Кэш для пользователей без загруженных аватаров, чтобы не дергать API на каждый рендер
const avatarAvailabilityCache = new Map<string, boolean>()
const onlineStatusCache = new Map<string, boolean | null>()

function isPresenceEqual(a?: ChatPresence | null, b?: ChatPresence | null) {
	return (
		(a?.lastReadAt ?? null) === (b?.lastReadAt ?? null) &&
		(a?.lastActivityAt ?? null) === (b?.lastActivityAt ?? null) &&
		(a?.typingAt ?? null) === (b?.typingAt ?? null)
	)
}

function parseTimestamp(value?: string | null) {
	if (!value) return null
	const timestamp = Date.parse(value)
	return Number.isNaN(timestamp) ? null : timestamp
}

function formatRelativeTime(value?: string | null) {
	const timestamp = parseTimestamp(value)
	if (!timestamp) return null

	const now = Date.now()
	const diffMs = timestamp - now
	const diffSeconds = Math.round(diffMs / 1000)
	const diffMinutes = Math.round(diffSeconds / 60)
	const diffHours = Math.round(diffMinutes / 60)
	const diffDays = Math.round(diffHours / 24)

	if (Math.abs(diffSeconds) < 30) {
		return 'только что'
	}

	if (Math.abs(diffMinutes) < 60) {
		return relativeTimeFormatter.format(diffMinutes, 'minute')
	}

	if (Math.abs(diffHours) < 24) {
		return relativeTimeFormatter.format(diffHours, 'hour')
	}

	if (Math.abs(diffDays) < 7) {
		return relativeTimeFormatter.format(diffDays, 'day')
	}

	return new Date(timestamp).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: 'long',
	})
}

function formatAbsoluteTime(value?: string | null) {
	const timestamp = parseTimestamp(value)
	if (!timestamp) return undefined
	return new Date(timestamp).toLocaleString('ru-RU', {
		day: '2-digit',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
	})
}

type PresenceDisplay = {
	text: string
	tooltip?: string
	indicatorClass: string
}

function ChatsPageContent() {
	const { user, token, setUnreadCount } = useUser()
	const { confirm, Dialog } = useConfirm()
	const searchParams = useSearchParams()
	const openUserId = searchParams?.get('open')
	const openTaskId = searchParams?.get('taskId')

	const [chats, setChats] = useState<Chat[]>([])
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(true)
	const [messagesLoading, setMessagesLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [chatTypeFilter, setChatTypeFilter] = useState<'all' | 'private' | 'task' | 'team'>('all')
	const [messageSearchQuery, setMessageSearchQuery] = useState('')
	const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false)
	const [messageSearchMatches, setMessageSearchMatches] = useState<number[]>([])
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
	const previousSearchQueryRef = useRef<string>('')
	const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false)
	const [highlightedMessageId, setHighlightedMessageId] = useState<
		string | null
	>(null)
	const [isTyping, setIsTyping] = useState(false)
	const [typingUser, setTypingUser] = useState<string | null>(null)
	const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const [hiddenChats, setHiddenChats] = useState<Set<string>>(new Set())
	const [contextMenu, setContextMenu] = useState<{
		chatId: string
		x: number
		y: number
	} | null>(null)
	const touchStartTimeRef = useRef<number | null>(null)
	const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

	// Отслеживание размера окна для адаптивности
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	// Предотвращаем скролл страницы при нажатии пробела (кроме полей ввода)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Предотвращаем скролл при нажатии пробела
			if (e.key === ' ' || e.key === 'Spacebar') {
				const target = e.target as HTMLElement
				// Разрешаем пробел только в полях ввода
				const isInput = 
					target.tagName === 'TEXTAREA' || 
					target.tagName === 'INPUT' ||
					target.isContentEditable ||
					target.getAttribute('contenteditable') === 'true'
				
				// Если это не поле ввода - предотвращаем скролл
				if (!isInput) {
					e.preventDefault()
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown, { passive: false })
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [])
	const [replyTo, setReplyTo] = useState<Message['replyTo']>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const eventSourceRef = useRef<EventSource | null>(null)
	const selectedChatRef = useRef<Chat | null>(null)
	const messageSearchRefs = useRef<Map<string, HTMLDivElement>>(new Map())
	const searchInputRef = useRef<HTMLInputElement>(null)
	const hasInitializedChatsRef = useRef(false)
	const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const mergePresence = useCallback(
		(
			prevPresence: ChatPresence | null | undefined,
			updates: Partial<ChatPresence>
		) => {
			const prev = prevPresence ?? DEFAULT_PRESENCE
			let changed = false
			const result: ChatPresence = { ...prev }

			if (updates.lastReadAt !== undefined) {
				const nextValue = updates.lastReadAt ?? null
				const incomingTs = parseTimestamp(nextValue)
				const currentTs = parseTimestamp(prev.lastReadAt)

				if (
					prev.lastReadAt !== nextValue &&
					(!currentTs || !incomingTs || incomingTs >= currentTs)
				) {
					result.lastReadAt = nextValue
					changed = true
				}
			}

			if (updates.lastActivityAt !== undefined) {
				const nextValue = updates.lastActivityAt ?? null
				const incomingTs = parseTimestamp(nextValue)
				const currentTs = parseTimestamp(prev.lastActivityAt)

				if (
					prev.lastActivityAt !== nextValue &&
					(!currentTs || !incomingTs || incomingTs >= currentTs)
				) {
					result.lastActivityAt = nextValue
					changed = true
				}
			}

			if (updates.typingAt !== undefined) {
				const nextValue = updates.typingAt ?? null
				if (prev.typingAt !== nextValue) {
					result.typingAt = nextValue
					changed = true
				}
			}

			return changed ? result : prevPresence ?? prev
		},
		[]
	)

	const updateChatPresence = useCallback(
		(chatId: string, updates: Partial<ChatPresence>) => {
			setChats(prevChats =>
				prevChats.map(chat => {
					if (chat.id !== chatId) return chat
					const merged = mergePresence(chat.presence, updates)
					if (
						merged === chat.presence ||
						isPresenceEqual(merged, chat.presence)
					) {
						return chat
					}
					return {
						...chat,
						presence: merged,
					}
				})
			)

			setSelectedChat(prevSelected => {
				if (!prevSelected || prevSelected.id !== chatId) {
					return prevSelected
				}

				const merged = mergePresence(prevSelected.presence, updates)
				if (
					merged === prevSelected.presence ||
					isPresenceEqual(merged, prevSelected.presence)
				) {
					return prevSelected
				}

				return {
					...prevSelected,
					presence: merged,
				}
			})
		},
		[mergePresence]
	)

	useEffect(() => {
		if (!selectedChat) return
		const updated = chats.find(chat => chat.id === selectedChat.id)
		if (updated && updated !== selectedChat) {
			setSelectedChat(updated)
		}
	}, [chats, selectedChat])

	useEffect(() => {
		selectedChatRef.current = selectedChat
	}, [selectedChat])

	useEffect(() => {
		setIsTyping(false)
		setTypingUser(null)
		setIsAttachmentsOpen(false)
	}, [selectedChat?.id])

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current)
			}
		}
	}, [])

	const scrollToMessageById = useCallback((messageId: string) => {
		const element = messageSearchRefs.current.get(messageId)
		const container = messagesContainerRef.current
		if (element && container) {
			const elementRect = element.getBoundingClientRect()
			const containerRect = container.getBoundingClientRect()
			const offsetTop =
				elementRect.top - containerRect.top + container.scrollTop
			const targetScroll =
				offsetTop - container.clientHeight / 2 + elementRect.height / 2

			container.scrollTo({
				top: Math.max(0, targetScroll),
				behavior: 'smooth',
			})

			setHighlightedMessageId(messageId)
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current)
			}
			highlightTimeoutRef.current = setTimeout(() => {
				setHighlightedMessageId(prev => (prev === messageId ? null : prev))
				highlightTimeoutRef.current = null
			}, 2000)
		} else {
			clientLogger.warn('Не удалось найти сообщение для вложения', {
				messageId,
			})
		}
	}, [])

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

		const events = [
			'focus',
			'blur',
			'mousedown',
			'mouseup',
			'click',
			'touchstart',
			'touchend',
		]
		events.forEach(event => {
			input.addEventListener(event, removeOutline, true)
		})

		const observer = new MutationObserver(() => {
			removeOutline()
		})
		observer.observe(input, {
			attributes: true,
			attributeFilter: ['style', 'class'],
		})

		return () => {
			events.forEach(event => {
				input.removeEventListener(event, removeOutline, true)
			})
			observer.disconnect()
		}
	}, [])

	// Блокируем скролл страницы полностью
	useEffect(() => {
		// Сохраняем текущие стили
		const originalBodyOverflow = document.body.style.overflow
		const originalBodyHeight = document.body.style.height
		const originalBodyPosition = document.body.style.position
		const originalHtmlOverflow = document.documentElement.style.overflow
		const originalHtmlHeight = document.documentElement.style.height

		// Блокируем скролл на body и html
		document.body.style.overflow = 'hidden'
		document.body.style.height = '100vh'
		document.body.style.position = 'fixed'
		document.body.style.width = '100%'
		document.documentElement.style.overflow = 'hidden'
		document.documentElement.style.height = '100vh'

		// Функция для проверки, может ли элемент скроллиться
		const canScroll = (element: HTMLElement, deltaY: number): boolean => {
			if (deltaY > 0) {
				// Скролл вниз
				return (
					element.scrollTop + element.clientHeight < element.scrollHeight - 1
				)
			} else {
				// Скролл вверх
				return element.scrollTop > 1
			}
		}

		// Функция для поиска скроллируемого контейнера
		const findScrollableContainer = (
			target: HTMLElement
		): HTMLElement | null => {
			let element: HTMLElement | null = target
			while (element && element !== document.body) {
				if (
					element.hasAttribute('data-chat-container') ||
					element.classList.contains('overflow-y-auto') ||
					element.classList.contains('custom-scrollbar')
				) {
					// Проверяем, что элемент действительно скроллируемый
					if (element.scrollHeight > element.clientHeight) {
						return element
					}
				}
				element = element.parentElement
			}
			return null
		}

		// Блокируем скролл через колесо мыши
		const preventWheel = (e: WheelEvent) => {
			const target = e.target as HTMLElement
			const scrollableContainer = findScrollableContainer(target)

			if (scrollableContainer) {
				// Если контейнер не может скроллиться дальше, блокируем событие
				if (!canScroll(scrollableContainer, e.deltaY)) {
					e.preventDefault()
					e.stopPropagation()
				}
			} else {
				// Если это не скроллируемый контейнер, блокируем всегда
				e.preventDefault()
				e.stopPropagation()
			}
		}

		// Блокируем скролл через touch события
		const preventTouchMove = (e: TouchEvent) => {
			const target = e.target as HTMLElement
			const scrollableContainer = findScrollableContainer(target)

			if (!scrollableContainer) {
				// Если это не скроллируемый контейнер, блокируем всегда
				e.preventDefault()
				e.stopPropagation()
			}
		}

		// Предотвращаем скролл страницы через события scroll
		const preventScroll = (e: Event) => {
			const target = e.target as HTMLElement
			const scrollableContainer = findScrollableContainer(target)

			if (!scrollableContainer) {
				// Если это не скроллируемый контейнер, блокируем
				e.preventDefault()
				e.stopPropagation()
			}
		}

		// Добавляем обработчики
		document.addEventListener('scroll', preventScroll, {
			passive: false,
			capture: true,
		})
		document.addEventListener('wheel', preventWheel, {
			passive: false,
			capture: true,
		})
		document.addEventListener('touchmove', preventTouchMove, {
			passive: false,
			capture: true,
		})

		return () => {
			// Удаляем обработчики
			document.removeEventListener('scroll', preventScroll, {
				capture: true,
			} as any)
			document.removeEventListener('wheel', preventWheel, {
				capture: true,
			} as any)
			document.removeEventListener('touchmove', preventTouchMove, {
				capture: true,
			} as any)

			// Восстанавливаем стили при размонтировании
			document.body.style.overflow = originalBodyOverflow
			document.body.style.height = originalBodyHeight
			document.body.style.position = originalBodyPosition
			document.body.style.width = ''
			document.documentElement.style.overflow = originalHtmlOverflow
			document.documentElement.style.height = originalHtmlHeight
		}
	}, [])

	// Загрузка списка чатов и подключение к SSE
	useEffect(() => {
		if (!token) {
			hasInitializedChatsRef.current = false
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
				eventSourceRef.current = null
			}
			return
		}

		if (hasInitializedChatsRef.current) {
			return
		}
		hasInitializedChatsRef.current = true

		let isMounted = true

		const fetchChats = async () => {
			try {
				clientLogger.debug('Загружаем чаты')
				const { fetchWithRetry } = await import('@/lib/retry')
				const res = await fetchWithRetry(
					'/api/chats',
					{
						headers: { Authorization: `Bearer ${token}` },
					},
					{
						maxRetries: 2,
						retryDelay: 1000,
					}
				)

				// Проверяем, есть ли содержимое в ответе
				const text = await res.text()
				if (!text || text.trim() === '') {
					clientLogger.warn('Пустой ответ от API чатов')
					setChats([])
					setLoading(false)
					return
				}

				let data
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					clientLogger.error('Ошибка парсинга JSON', parseError, {
						textResponse: text?.substring(0, 200),
					})
					setChats([])
					setLoading(false)
					return
				}

				clientLogger.debug('Ответ API чатов', {
					chatsCount: data.chats?.length || 0,
				})
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
					clientLogger.debug('Чаты загружены', { count: loadedChats.length })

					// Устанавливаем флаг для автооткрытия чата
					if (openUserId || openTaskId) {
						clientLogger.debug('Обнаружен параметр для автооткрытия', {
							openUserId,
							openTaskId,
						})
						setShouldAutoOpen(true)
					}

					// Отладочная информация для аватарок
					clientLogger.debug('Аватарки в загруженных чатах')
					data.chats?.forEach((chat: any) => {
						if (chat.type === 'private') {
							clientLogger.debug(`Приватный чат с ${chat.otherUser?.id}`, {
								fullName: chat.otherUser?.fullName,
								email: chat.otherUser?.email,
								avatarUrl: chat.otherUser?.avatarUrl,
							})
						} else if (chat.type === 'task') {
							clientLogger.debug(`Чат задачи ${chat.task?.id}`, {
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
					const errorMessage = data?.error || 'Неизвестная ошибка'
					clientLogger.error('Ошибка API чатов', new Error(errorMessage), {
						status: res.status,
						statusText: res.statusText,
					})
					if (!isMounted) return
					setChats([])
				}
			} catch (error: any) {
				clientLogger.error('Ошибка загрузки чатов', error)
				if (!isMounted) return
				setChats([])
			} finally {
				if (!isMounted) return
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
				clientLogger.info('SSE подключение установлено для чатов')
			}

			eventSource.onmessage = event => {
				if (!isMounted) return
				try {
					const data = JSON.parse(event.data)
					clientLogger.debug('Получено событие SSE для чатов', {
						type: data.type,
					})

					const currentSelectedChat = selectedChatRef.current

					if (data.type === 'message') {
						if (data.chatId) {
							updateChatPresence(data.chatId, {
								lastActivityAt: data.timestamp ?? new Date().toISOString(),
								typingAt: null,
							})
						}

						// Добавляем новое сообщение в текущий чат, если оно относится к нему
						if (currentSelectedChat) {
							const isCurrentChat =
								(data.chatType === 'private' &&
									currentSelectedChat.type === 'private' &&
									currentSelectedChat.otherUser?.id === data.senderId) ||
								(data.chatType === 'task' &&
									currentSelectedChat.type === 'task' &&
									currentSelectedChat.task?.id ===
										data.chatId.replace('task_', ''))

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

								// Проверяем, нет ли уже такого сообщения (защита от дубликатов)
								setMessages(prev => {
									const exists = prev.some(m => m.id === newMessage.id)
									if (exists) {
										return prev
									}
									return [...prev, newMessage]
								})

								// Обновляем список чатов с новым последним сообщением
								setChats(prev =>
									prev.map(chat => {
										if (chat.id === currentSelectedChat.id) {
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
											clientLogger.error('Ошибка обработки уведомлений', err)
										})
								}

								// Автоматически прокручиваем вниз при новом сообщении в открытом чате (плавно)
								setTimeout(() => {
									const container = messagesContainerRef.current
									if (container) {
										// Плавная прокрутка до самого низа
										const targetScrollTop =
											container.scrollHeight - container.clientHeight
										const startScrollTop = container.scrollTop
										const distance = targetScrollTop - startScrollTop
										const duration = 300 // Длительность анимации в мс
										const startTime = Date.now()

										const animateScroll = () => {
											const elapsed = Date.now() - startTime
											const progress = Math.min(elapsed / duration, 1)
											// Используем easing функцию для плавности
											const easeOutCubic = 1 - Math.pow(1 - progress, 3)
											const currentScrollTop =
												startScrollTop + distance * easeOutCubic

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
											chat.id === currentSelectedChat?.id
												? 0
												: chat.unreadCount + 1,
									}
								}
								return chat
							})
						)
					} else if (data.type === 'typing') {
						const chatId: string | undefined = data.chatId
						if (chatId) {
							updateChatPresence(chatId, { typingAt: new Date().toISOString() })
						}

						if (currentSelectedChat && chatId === currentSelectedChat.id) {
							setIsTyping(true)
							setTypingUser(data.sender || 'Собеседник')
						}
					} else if (data.type === 'stoppedTyping') {
						const chatId: string | undefined = data.chatId
						if (chatId) {
							updateChatPresence(chatId, { typingAt: null })
						}

						if (currentSelectedChat && chatId === currentSelectedChat.id) {
							setIsTyping(false)
							setTypingUser(null)
						}
					} else if (data.type === 'messageSent') {
						// Обработка сообщений, отправленных с других устройств того же пользователя
						// Это позволяет синхронизировать сообщения между устройствами
						if (data.messageData && currentSelectedChat) {
							const messageData = data.messageData

							// Проверяем, относится ли сообщение к текущему открытому чату
							const isCurrentChat =
								(data.chatType === 'private' &&
									currentSelectedChat.type === 'private' &&
									currentSelectedChat.otherUser?.id === data.recipientId) ||
								(data.chatType === 'task' &&
									currentSelectedChat.type === 'task' &&
									currentSelectedChat.task?.id ===
										data.chatId.replace('task_', ''))

							if (isCurrentChat) {
								// Проверяем, нет ли уже такого сообщения (защита от дубликатов)
								setMessages(prev => {
									const exists = prev.some(m => m.id === messageData.id)
									if (exists) {
										return prev
									}

									// Добавляем новое сообщение
									const newMessage: Message = {
										id: messageData.id,
										content: messageData.content,
										fileUrl: messageData.fileUrl || undefined,
										fileName: messageData.fileName || undefined,
										fileMimetype: messageData.fileMimetype || undefined,
										fileId: messageData.fileId || undefined,
										createdAt: messageData.createdAt,
										editedAt: messageData.editedAt || null,
										replyTo: messageData.replyTo || null,
										sender: {
											id: messageData.sender.id,
											fullName: messageData.sender.fullName,
											email: messageData.sender.email,
											avatarUrl: messageData.sender.avatarUrl,
										},
									}

									return [...prev, newMessage]
								})

								// Обновляем список чатов с новым последним сообщением
								setChats(prev =>
									prev.map(chat => {
										if (chat.id === currentSelectedChat.id) {
											const newMessage: Message = {
												id: messageData.id,
												content: messageData.content,
												fileUrl: messageData.fileUrl || undefined,
												fileName: messageData.fileName || undefined,
												fileMimetype: messageData.fileMimetype || undefined,
												fileId: messageData.fileId || undefined,
												createdAt: messageData.createdAt,
												editedAt: messageData.editedAt || null,
												replyTo: messageData.replyTo || null,
												sender: {
													id: messageData.sender.id,
													fullName: messageData.sender.fullName,
													email: messageData.sender.email,
													avatarUrl: messageData.sender.avatarUrl,
												},
											}

											return {
												...chat,
												lastMessage: newMessage,
											}
										}
										return chat
									})
								)

								// Автоматически прокручиваем вниз при новом сообщении
								setTimeout(() => {
									const container = messagesContainerRef.current
									if (container) {
										const targetScrollTop =
											container.scrollHeight - container.clientHeight
										const startScrollTop = container.scrollTop
										const distance = targetScrollTop - startScrollTop
										const duration = 300
										const startTime = Date.now()

										const animateScroll = () => {
											const elapsed = Date.now() - startTime
											const progress = Math.min(elapsed / duration, 1)
											const easeOutCubic = 1 - Math.pow(1 - progress, 3)
											const currentScrollTop =
												startScrollTop + distance * easeOutCubic

											container.scrollTop = currentScrollTop

											if (progress < 1) {
												requestAnimationFrame(animateScroll)
											} else {
												container.scrollTop = container.scrollHeight
											}
										}

										requestAnimationFrame(animateScroll)
									}
								}, 100)
							} else {
								// Если чат не открыт, обновляем список чатов
								setChats(prev =>
									prev.map(chat => {
										if (
											(data.chatType === 'private' &&
												chat.type === 'private' &&
												chat.otherUser?.id === data.recipientId) ||
											(data.chatType === 'task' &&
												chat.type === 'task' &&
												chat.task?.id === data.chatId.replace('task_', ''))
										) {
											const newMessage: Message = {
												id: messageData.id,
												content: messageData.content,
												fileUrl: messageData.fileUrl || undefined,
												fileName: messageData.fileName || undefined,
												fileMimetype: messageData.fileMimetype || undefined,
												fileId: messageData.fileId || undefined,
												createdAt: messageData.createdAt,
												editedAt: messageData.editedAt || null,
												replyTo: messageData.replyTo || null,
												sender: {
													id: messageData.sender.id,
													fullName: messageData.sender.fullName,
													email: messageData.sender.email,
													avatarUrl: messageData.sender.avatarUrl,
												},
											}

											return {
												...chat,
												lastMessage: newMessage,
											}
										}
										return chat
									})
								)
							}
						}
					} else if (data.type === 'chatPresence') {
						const chatId: string | undefined = data.chatId
						if (chatId) {
							const updates: Partial<ChatPresence> = {}

							if (data.lastReadAt !== undefined) {
								updates.lastReadAt = data.lastReadAt ?? null
							}

							if (data.lastActivityAt !== undefined) {
								updates.lastActivityAt = data.lastActivityAt ?? null
							}

							if (data.typingAt !== undefined) {
								updates.typingAt = data.typingAt ?? null
							}

							if (Object.keys(updates).length > 0) {
								updateChatPresence(chatId, updates)
							}
						}
					}
				} catch (error) {
					clientLogger.error('Ошибка парсинга SSE сообщения', error)
				}
			}

			eventSource.onerror = error => {
				clientLogger.error('Ошибка SSE в чатах', error)

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
			isMounted = false
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
				eventSourceRef.current = null
			}
			hasInitializedChatsRef.current = false
		}
	}, [token, updateChatPresence, setUnreadCount])

	// Сбрасываем ответ при смене чата
	useEffect(() => {
		setReplyTo(null)
	}, [selectedChat?.id])

	// Загрузка сообщений для выбранного чата
	useEffect(() => {
		if (!selectedChat || !token) return

		const chatId = selectedChat.id
		const chatType = selectedChat.type
		const otherUserId = selectedChat.otherUser?.id
		const taskId = selectedChat.task?.id
		let cancelled = false

		// Показываем загрузку при смене чата
		setMessagesLoading(true)
		// Не очищаем сообщения сразу - они будут очищены при начале загрузки новых

		const fetchMessages = async ({ withLoader = true } = {}) => {
			if (withLoader) {
				setMessagesLoading(true)
			}
			// Очищаем сообщения только когда начинаем загрузку новых
			if (!cancelled) {
				setMessages([])
			}
			try {
				// Если это временный чат (только что созданный), просто показываем пустой список
				if (chatId.startsWith('temp_')) {
					clientLogger.debug(
						'Временный чат, показываем пустой список сообщений'
					)
					if (!cancelled) {
						setMessages([])
					}
					return
				}

				let url = ''
				if (chatType === 'private') {
					url = `/api/messages/${otherUserId}`
				} else if (chatType === 'team') {
					const teamId = selectedChat.team?.id
					if (!teamId) {
						if (!cancelled) {
							setMessages([])
						}
						return
					}
					url = `/api/teams/${teamId}/chat`
				} else {
					url = `/api/tasks/${taskId}/messages`
				}

				clientLogger.debug('Загружаем сообщения для чата', { chatType, url })
				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				})

				clientLogger.debug('Статус ответа', {
					status: res.status,
					statusText: res.statusText,
				})

				// Проверяем, есть ли содержимое в ответе
				const text = await res.text()
				if (!text || text.trim() === '') {
					clientLogger.warn('Пустой ответ от API', { status: res.status })
					if (!cancelled) {
						setMessages([])
					}
					return
				}

				let data
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					clientLogger.error('Ошибка парсинга JSON', parseError, {
						textResponse: text?.substring(0, 200),
					})
					if (!cancelled) {
						setMessages([])
					}
					return
				}

				clientLogger.debug('Ответ API сообщений', {
					status: res.status,
					ok: res.ok,
					dataType: Array.isArray(data) ? 'array' : typeof data,
					dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
					dataPreview: JSON.stringify(data).substring(0, 200),
				})

				if (res.ok) {
					const messagesData = data.messages || data || []
					clientLogger.debug('Сообщения загружены', {
						count: messagesData.length,
					})
					if (messagesData.length > 0) {
						clientLogger.debug('Первое сообщение', { message: messagesData[0] })
						// Проверяем сообщения с ответами
						const messagesWithReplies = messagesData.filter(
							(m: Message) => m.replyTo !== null && m.replyTo !== undefined
						)
						if (messagesWithReplies.length > 0) {
							clientLogger.debug('Найдено сообщений с ответами', {
								count: messagesWithReplies.length,
							})
							clientLogger.debug('Пример ответа', {
								replyTo: messagesWithReplies[0].replyTo,
							})
						} else {
							clientLogger.debug('Нет сообщений с ответами')
						}
					}
					if (!cancelled) {
						setMessages(messagesData)
					}

					// Прокручиваем вниз после загрузки сообщений (плавно) только при первом показе
					if (withLoader) {
						setTimeout(() => {
							const container = messagesContainerRef.current
							if (container) {
								// Плавная прокрутка до самого низа
								const targetScrollTop =
									container.scrollHeight - container.clientHeight
								const startScrollTop = container.scrollTop
								const distance = targetScrollTop - startScrollTop
								const duration = 400 // Длительность анимации в мс
								const startTime = Date.now()

								const animateScroll = () => {
									const elapsed = Date.now() - startTime
									const progress = Math.min(elapsed / duration, 1)
									// Используем easing функцию для плавности
									const easeOutCubic = 1 - Math.pow(1 - progress, 3)
									const currentScrollTop =
										startScrollTop + distance * easeOutCubic

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
					}
				} else {
					// Если это ошибка, но есть данные, все равно пытаемся их использовать
					if (
						data &&
						typeof data === 'object' &&
						(data.messages || Array.isArray(data))
					) {
						const messagesData = data.messages || data || []
						clientLogger.warn('API вернул ошибку, но есть данные', {
							count: messagesData.length,
						})
						if (!cancelled) {
							setMessages(messagesData)
						}
					} else {
						const errorMessage = data?.error || 'Неизвестная ошибка'
						clientLogger.error(
							'Ошибка API сообщений',
							new Error(errorMessage),
							{
								status: res.status,
								statusText: res.statusText,
								errorMessage: errorMessage,
								url: url,
								responseText: text.substring(0, 500),
							}
						)
						// Если это ошибка сервера, но не критичная, просто показываем пустой список
						if (!cancelled) {
							if (res.status >= 500) {
								clientLogger.error(
									'Серверная ошибка, устанавливаем пустой список сообщений'
								)
							}
							setMessages([])
						}
					}
				}
			} catch (error) {
				clientLogger.error('Ошибка загрузки сообщений', error)
				if (!cancelled) {
					setMessages([])
				}
			} finally {
				if (withLoader) {
					setMessagesLoading(false)
				}
			}
		}

		fetchMessages()

		let pollingInterval: number | null = null
		if (typeof window !== 'undefined') {
			pollingInterval = window.setInterval(() => {
				if (typeof document !== 'undefined' && document.hidden) {
					return
				}
				void fetchMessages({ withLoader: false })
			}, 10000)
		}

		return () => {
			cancelled = true
			if (pollingInterval !== null) {
				window.clearInterval(pollingInterval)
			}
		}
	}, [
		selectedChat?.id,
		selectedChat?.type,
		selectedChat?.otherUser?.id,
		selectedChat?.task?.id,
		selectedChat?.team?.id,
		token,
	])

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
			clientLogger.debug('Автоскролл к последнему сообщению')
			// Используем плавную прокрутку до самого низа
			const container = messagesContainerRef.current
			if (container) {
				// Функция для плавной прокрутки до самого низа
				const smoothScrollToBottom = () => {
					const targetScrollTop =
						container.scrollHeight - container.clientHeight
					const startScrollTop = container.scrollTop
					const distance = targetScrollTop - startScrollTop
					const duration = 300 // Длительность анимации в мс
					const startTime = Date.now()

					const animateScroll = () => {
						const elapsed = Date.now() - startTime
						const progress = Math.min(elapsed / duration, 1)
						// Используем easing функцию для плавности
						const easeOutCubic = 1 - Math.pow(1 - progress, 3)
						const currentScrollTop = startScrollTop + distance * easeOutCubic

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
							const targetScrollTop =
								container.scrollHeight - container.clientHeight
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
				container.scrollHeight - container.scrollTop - container.clientHeight >
				100
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
				clientLogger.debug('Ждем загрузки данных пользователя и токена')
			}
			return
		}

		// Если открываем чат задачи
		if (openTaskId) {
			clientLogger.debug('Пытаемся открыть чат задачи', { taskId: openTaskId })

			// Ищем существующий чат задачи
			const existingTaskChat = chats.find(
				(chat: Chat) => chat.type === 'task' && chat.task?.id === openTaskId
			)

			if (existingTaskChat) {
				clientLogger.debug('Чат задачи найден, открываем', {
					chat: existingTaskChat,
				})
				handleSelectChat(existingTaskChat)
				setShouldAutoOpen(false)
				window.history.replaceState({}, '', '/chats')
			} else {
				clientLogger.debug('Чат задачи не найден, создаем новый')

				const createTaskChat = async () => {
					try {
						// Загружаем данные задачи
						const taskRes = await fetch(`/api/tasks/${openTaskId}`, {
							headers: token ? { Authorization: `Bearer ${token}` } : {},
						})

						if (!taskRes.ok) {
							clientLogger.error('Задача не найдена', undefined, {
								taskId: openTaskId,
							})
							setShouldAutoOpen(false)
							return
						}

						const taskData = await taskRes.json()
						const task = taskData.task || taskData

						// Определяем другого участника (если я заказчик - нужен исполнитель, и наоборот)
						const isCustomer = user.id === task.customerId
						const otherUser = isCustomer ? task.executor : task.customer

						if (!otherUser) {
							clientLogger.error(
								'Второй участник чата не найден (задача без исполнителя)',
								undefined,
								{ taskId: openTaskId }
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

						clientLogger.debug('Создан временный чат задачи', {
							chat: tempTaskChat,
						})
						// Добавляем чат только если такого еще нет (защита от дубликатов)
						setChats(prev => {
							// Проверяем, нет ли уже чата с таким task.id
							const existingChat = prev.find(
								chat => chat.type === 'task' && chat.task?.id === task.id
							)
							if (existingChat) {
								clientLogger.debug('Чат задачи уже существует, используем его', {
									taskId: task.id,
									existingChatId: existingChat.id,
								})
								// Выбираем существующий чат
								setSelectedChat(existingChat)
								setMessages([])
								return prev
							}
							// Добавляем новый чат и выбираем его
							setSelectedChat(tempTaskChat)
							setMessages([])
							return [tempTaskChat, ...prev]
						})
						setShouldAutoOpen(false)
						window.history.replaceState({}, '', '/chats')
					} catch (error) {
						clientLogger.error('Ошибка создания чата задачи', error, {
							taskId: openTaskId,
						})
						setShouldAutoOpen(false)
					}
				}

				createTaskChat()
			}
			return
		}

		// Если открываем приватный чат
		clientLogger.debug('Пытаемся открыть чат с пользователем', {
			userId: openUserId,
		})

		// Ищем существующий чат
		const existingChat = chats.find(
			(chat: Chat) =>
				chat.type === 'private' && chat.otherUser?.id === openUserId
		)

		if (existingChat) {
			clientLogger.debug('Чат найден, открываем', { chat: existingChat })
			// Используем handleSelectChat вместо прямого setSelectedChat
			// чтобы сработала пометка как прочитанное
			handleSelectChat(existingChat)
			setShouldAutoOpen(false)
			window.history.replaceState({}, '', '/chats')
		} else {
			// Создаем новый чат
			clientLogger.debug('Чат не найден, создаем новый с пользователем', {
				userId: openUserId,
			})

			const createNewChat = async () => {
				try {
					const userRes = await fetch(`/api/users/${openUserId}`, {
						headers: token ? { Authorization: `Bearer ${token}` } : {},
					})

					if (!userRes.ok) {
						clientLogger.error('Пользователь не найден', undefined, {
							userId: openUserId,
						})
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

					clientLogger.debug('Создан временный чат', { chat: tempChat })
					// Добавляем чат только если такого еще нет (защита от дубликатов)
					setChats(prev => {
						// Проверяем, нет ли уже чата с этим пользователем
						const existingChat = prev.find(
							chat => chat.type === 'private' && chat.otherUser?.id === otherUser.id
						)
						if (existingChat) {
							clientLogger.debug('Приватный чат уже существует, используем его', {
								otherUserId: otherUser.id,
								existingChatId: existingChat.id,
							})
							// Выбираем существующий чат
							setSelectedChat(existingChat)
							setMessages([])
							return prev
						}
						// Добавляем новый чат и выбираем его
						setSelectedChat(tempChat)
						setMessages([])
						return [tempChat, ...prev]
					})
					setShouldAutoOpen(false)
					window.history.replaceState({}, '', '/chats')
				} catch (error) {
					clientLogger.error('Ошибка создания чата', error, {
						userId: openUserId,
					})
					setShouldAutoOpen(false)
				}
			}

			createNewChat()
		}
	}, [openUserId, openTaskId, shouldAutoOpen, chats, user, token])

	// Функция для выбора чата
	const handleSelectChat = async (chat: Chat) => {
		// Если чат уже выбран, не перезагружаем сообщения
		if (selectedChat?.id === chat.id) {
			return
		}

		setSelectedChat(chat)
		// Сообщения будут очищены в useEffect при начале загрузки
		setMessagesLoading(true)

		// Отправляем событие о том, что чат открыт (для Header)
		if (typeof window !== 'undefined') {
			const chatInfo =
				chat.type === 'private'
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
					clientLogger.debug('Прочитано, удалено уведомлений', {
						deletedNotifications: data.deletedNotifications,
					})

					const nowIso = data.lastReadAt || new Date().toISOString()
					updateChatPresence(chat.id, {
						lastReadAt: nowIso,
						lastActivityAt: nowIso,
						typingAt: null,
					})

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
				clientLogger.error(
					'Ошибка при пометке сообщений как прочитанных',
					error
				)
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
		clientLogger.debug('handleNewMessage вызван с данными', {
			message: newMessage,
		})
		clientLogger.debug('Файл в сообщении', {
			fileId: newMessage.fileId,
			fileName: newMessage.fileName,
			fileMimetype: newMessage.fileMimetype,
			fileUrl: newMessage.fileUrl,
		})
		// Добавляем новое сообщение в список без дубликатов
		setMessages(prev => {
			if (!newMessage) return prev

			const hasId = Boolean(newMessage.id)
			if (hasId) {
				const existsIndex = prev.findIndex(msg => msg.id === newMessage.id)
				if (existsIndex !== -1) {
					// Обновляем существующее сообщение (например, если прилетели новые поля)
					const next = [...prev]
					next[existsIndex] = { ...prev[existsIndex], ...newMessage }
					return next
				}
			} else if (newMessage.createdAt) {
				const exists = prev.some(
					msg =>
						!msg.id &&
						msg.createdAt === newMessage.createdAt &&
						msg.content === newMessage.content
				)
				if (exists) {
					return prev
				}
			}

			return [...prev, newMessage]
		})

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
				clientLogger.error('Ошибка обновления чатов', error)
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

				const nowIso = new Date().toISOString()
				updateChatPresence(selectedChat.id, {
					lastReadAt: nowIso,
					lastActivityAt: nowIso,
					typingAt: null,
				})

				// Уведомляем хедер об изменении счетчика
				window.dispatchEvent(new CustomEvent('messageSent'))
			} catch (error) {
				clientLogger.error('Ошибка при пометке чата как прочитанного', error)
			}
		}
	}

	// Загружаем скрытые чаты из localStorage
	useEffect(() => {
		if (typeof window === 'undefined' || !user) return
		try {
			const stored = localStorage.getItem(`hiddenChats_${user.id}`)
			if (stored) {
				const hidden = JSON.parse(stored) as string[]
				setHiddenChats(new Set(hidden))
			}
		} catch (err) {
			console.error('Ошибка загрузки скрытых чатов:', err)
		}
	}, [user])

	// Функция для удаления чата
	const handleDeleteChat = useCallback(async (chatId: string) => {
		if (!user) return

		// Закрываем контекстное меню перед показом диалога
		setContextMenu(null)

		// Используем кастомное подтверждение
		await confirm({
			title: 'Удаление чата',
			message: 'Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.',
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: () => {
				const newHiddenChats = new Set(hiddenChats)
				newHiddenChats.add(chatId)
				setHiddenChats(newHiddenChats)

				// Сохраняем в localStorage
				try {
					localStorage.setItem(`hiddenChats_${user.id}`, JSON.stringify(Array.from(newHiddenChats)))
				} catch (err) {
					console.error('Ошибка сохранения скрытых чатов:', err)
				}

				// Если удаляемый чат был выбран, закрываем его
				if (selectedChat?.id === chatId) {
					setSelectedChat(null)
				}

				toast.success('Чат удален из списка.')
			},
		})
	}, [hiddenChats, user, selectedChat, confirm])

	// Обработчик контекстного меню (ПКМ на ПК)
	const handleContextMenu = useCallback((e: React.MouseEvent, chatId: string) => {
		e.preventDefault()
		e.stopPropagation()
		setContextMenu({
			chatId,
			x: e.clientX,
			y: e.clientY,
		})
	}, [])

	// Обработчики для долгого нажатия на мобильных
	const handleTouchStart = useCallback((e: React.TouchEvent, chatId: string) => {
		touchStartTimeRef.current = Date.now()
		const touch = e.touches[0]
		touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
	}, [])

	const handleTouchEnd = useCallback((e: React.TouchEvent, chatId: string) => {
		if (!touchStartTimeRef.current || !touchStartPosRef.current) return

		const touchEndTime = Date.now()
		const duration = touchEndTime - touchStartTimeRef.current
		const touch = e.changedTouches[0]
		const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x)
		const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y)

		// Если нажатие длилось больше 500мс и не было движения (не скролл)
		if (duration > 500 && deltaX < 10 && deltaY < 10) {
			e.preventDefault()
			e.stopPropagation()
			setContextMenu({
				chatId,
				x: touch.clientX,
				y: touch.clientY,
			})
		}

		touchStartTimeRef.current = null
		touchStartPosRef.current = null
	}, [])

	// Закрытие контекстного меню при клике вне его
	useEffect(() => {
		if (!contextMenu) return

		const handleClickOutside = () => {
			setContextMenu(null)
		}

		// Небольшая задержка, чтобы не закрыть меню сразу при открытии
		const timeout = setTimeout(() => {
			document.addEventListener('click', handleClickOutside)
			document.addEventListener('contextmenu', handleClickOutside)
		}, 100)

		return () => {
			clearTimeout(timeout)
			document.removeEventListener('click', handleClickOutside)
			document.removeEventListener('contextmenu', handleClickOutside)
		}
	}, [contextMenu])

	// Фильтрация чатов по поиску и скрытым чатам
	const filteredChats = chats.filter(chat => {
		// Исключаем скрытые чаты
		if (hiddenChats.has(chat.id)) return false

		const searchLower = searchQuery.toLowerCase()
		if (!searchQuery) return true

		if (chat.type === 'private') {
			const name = chat.otherUser?.fullName || chat.otherUser?.email || ''
			return name.toLowerCase().includes(searchLower)
		} else if (chat.type === 'team') {
			const teamName = chat.team?.name || ''
			return teamName.toLowerCase().includes(searchLower)
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

		const trimmed = avatarUrl.trim()
		if (!trimmed) return null

		// Абсолютные ссылки используем как есть
		if (/^https?:\/\//i.test(trimmed)) {
			return trimmed
		}

		// Пути, которые уже начинаются с / (например, /api/files/… или /uploads/…)
		if (trimmed.startsWith('/')) {
			return trimmed
		}

		const normalized = trimmed.replace(/^\/+/, '')

		// Если путь уже указывает на API или файл, не дописываем uploads
		if (
			normalized.startsWith('api/') ||
			normalized.startsWith('files/') ||
			normalized.startsWith('storage/')
		) {
			return `/${normalized}`
		}

		// Для путей uploads добавляем начальный слеш
		if (normalized.startsWith('uploads/')) {
			return `/${normalized}`
		}

		// Остальные относительные пути считаем файлом в uploads
		return `/uploads/${normalized}`
	}

	// Компонент аватарки с fallback (мемоизирован для предотвращения моргания)
	const AvatarComponent = React.memo(
		({
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
			const imageErrorRef = useRef(false)
			const [imageError, setImageError] = useState(false)
			const [isOnline, setIsOnline] = useState<boolean | null>(() => {
				if (userId && onlineStatusCache.has(userId)) {
					return onlineStatusCache.get(userId) ?? null
				}
				return null
			})
			const onlineStatusRef = useRef<{
				userId: string | undefined
				status: boolean | null
			}>({ userId: undefined, status: null })
			const normalizedAvatarPath = useMemo(() => {
				if (!avatarUrl) return null
				const normalized = getAvatarUrl(avatarUrl)
				if (!normalized) return null
				if (normalized.startsWith('http')) {
					return normalized
				}
				const trimmed = normalized.replace(/^\/+/, '')
				return `/${trimmed}`
			}, [avatarUrl])
			const shouldTryApiAvatar =
				!normalizedAvatarPath &&
				Boolean(userId) &&
				avatarAvailabilityCache.get(userId!) !== false
			const resolvedAvatarUrl =
				normalizedAvatarPath ||
				(shouldTryApiAvatar && userId ? `/api/avatars/${userId}` : null)

			// Сбрасываем ошибку только при изменении userId или avatarUrl
			useEffect(() => {
				imageErrorRef.current = false
				setImageError(false)
			}, [userId, avatarUrl])

			// Проверяем онлайн статус пользователя
			useEffect(() => {
				if (!userId) {
					setIsOnline(null)
					onlineStatusRef.current = { userId: undefined, status: null }
					return
				}

				const cachedStatus = onlineStatusCache.get(userId)
				if (cachedStatus !== undefined) {
					setIsOnline(cachedStatus)
					onlineStatusRef.current = { userId, status: cachedStatus }
				}

				// Если статус уже загружен для этого пользователя, не перезагружаем
				if (
					onlineStatusRef.current.userId === userId &&
					onlineStatusRef.current.status !== null
				) {
					setIsOnline(onlineStatusRef.current.status)
					return
				}

				const checkOnlineStatus = async () => {
					try {
						const res = await fetch(`/api/users/${userId}/online`, {
							method: 'GET',
							headers: { 'Content-Type': 'application/json' },
						})

						if (!res.ok) {
							clientLogger.error('Ошибка проверки онлайн статуса', undefined, {
								status: res.status,
							})
							return
						}

						const data = await res.json()
						// Если privacy = true, значит пользователь скрыл статус
						let status: boolean | null = null
						if (data.privacy) {
							status = null
						} else {
							status = data.online === true
						}

						onlineStatusRef.current = { userId, status }
						onlineStatusCache.set(userId, status)
						setIsOnline(status)
					} catch (err) {
						clientLogger.error('Ошибка проверки онлайн статуса', err)
						onlineStatusRef.current = { userId, status: null }
						if (cachedStatus === undefined) {
							setIsOnline(null)
						}
					}
				}

				checkOnlineStatus()
				// Обновляем статус каждые 30 секунд
				const interval = setInterval(checkOnlineStatus, 30 * 1000)

				return () => clearInterval(interval)
			}, [userId])

			// Если нет URL или произошла ошибка загрузки, показываем fallback
			if (!resolvedAvatarUrl || imageError || imageErrorRef.current) {
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
									? 'bg-emerald-400'
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
				<div
					className='relative flex-shrink-0'
					style={{ width: size, height: size }}
				>
					<img
						src={resolvedAvatarUrl}
						alt='avatar'
						width={size}
						height={size}
						className='rounded-full object-cover w-full h-full'
						style={{
							width: size,
							height: size,
							objectFit: 'cover',
							objectPosition: 'center',
						}}
						onError={() => {
							// Отсутствие аватарки - нормальная ситуация, не логируем как ошибку
							if (!imageErrorRef.current) {
								imageErrorRef.current = true
								setImageError(true)
								if (!normalizedAvatarPath && userId) {
									avatarAvailabilityCache.set(userId, false)
								}
							}
						}}
						onLoad={() => {
							if (!normalizedAvatarPath && userId) {
								avatarAvailabilityCache.set(userId, true)
							}
						}}
					/>
					{/* Индикатор онлайн статуса */}
					{isOnline !== null && (
						<div
							className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
								isOnline ? 'bg-emerald-400' : 'bg-gray-500'
							}`}
							style={{ width: size * 0.25, height: size * 0.25 }}
							title={isOnline ? 'В сети' : 'Не в сети'}
						/>
					)}
				</div>
			)
		},
		(prevProps, nextProps) => {
			// Функция сравнения для мемоизации - компонент пересоздается только если изменились пропсы
			return (
				prevProps.userId === nextProps.userId &&
				prevProps.avatarUrl === nextProps.avatarUrl &&
				prevProps.fallbackText === nextProps.fallbackText &&
				prevProps.size === nextProps.size
			)
		}
	)

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

	// Проверка, является ли сообщение голосовым
	const isVoiceMessage = (content: string | undefined): boolean => {
		if (!content || typeof content !== 'string') return false
		try {
			// Быстрая проверка по строке
			const hasVoiceType =
				content.includes('"type":"voice"') ||
				content.includes('"type": "voice"') ||
				content.includes('&quot;type&quot;:&quot;voice&quot;') ||
				content.includes('&quot;type&quot;: &quot;voice&quot;')
			const hasWaveform =
				content.includes('"waveform"') ||
				content.includes('&quot;waveform&quot;')

			if (!hasVoiceType || !hasWaveform) return false

			// Полная проверка через парсинг JSON
			let parsed
			try {
				parsed = JSON.parse(content)
			} catch {
				const unescaped = content.replace(/&quot;/g, '"')
				parsed = JSON.parse(unescaped)
			}

			return (
				parsed &&
				parsed.type === 'voice' &&
				typeof parsed.duration === 'number' &&
				Array.isArray(parsed.waveform)
			)
		} catch {
			return false
		}
	}

	// Функция для декодирования HTML entities
	const decodeHtmlEntities = (text: string | null | undefined): string => {
		if (!text) return text || ''

		// Сначала декодируем через DOM API (если доступен)
		let decoded = text
		if (typeof document !== 'undefined') {
			try {
				const textarea = document.createElement('textarea')
				textarea.innerHTML = text
				decoded = textarea.value
			} catch (e) {
				// Если не получилось, используем замену
			}
		}

		// Дополнительно декодируем часто используемые entities
		return (
			decoded
				.replace(/&quot;/g, '"')
				.replace(/&#x2F;/gi, '/') // case-insensitive для x2F и x2f
				.replace(/&#x2f;/g, '/')
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&#39;/g, "'")
				.replace(/&apos;/g, "'")
				.replace(/&#x27;/g, "'")
				// Декодируем числовые entities для слэшей
				.replace(/&#47;/g, '/')
				.replace(/&#92;/g, '\\')
		)
	}

	const getChatSubtitle = (chat: Chat) => {
		const lastMessageContent = chat.lastMessage.content

		// Проверяем, является ли последнее сообщение голосовым
		if (isVoiceMessage(lastMessageContent)) {
			if (chat.type === 'private') {
				return '🎤 Голосовое сообщение'
			} else {
				const senderName =
					chat.lastMessage.sender.fullName || chat.lastMessage.sender.email
				return `${senderName}: 🎤 Голосовое сообщение`
			}
		}

		// Декодируем HTML entities перед отображением
		const decodedContent = decodeHtmlEntities(lastMessageContent)

		if (chat.type === 'private') {
			return decodedContent || 'Файл'
		} else {
			const senderName =
				chat.lastMessage.sender.fullName || chat.lastMessage.sender.email
			return `${senderName}: ${decodedContent || 'Файл'}`
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
		if (
			matches.length > 0 &&
			messageSearchQuery.trim() !== '' &&
			queryChanged
		) {
			const firstMatch = messages[matches[0]]
			if (firstMatch) {
				setTimeout(() => {
					const element = messageSearchRefs.current.get(firstMatch.id)
					if (element && messagesContainerRef.current) {
						// Используем прокрутку контейнера вместо scrollIntoView, чтобы избежать прыжков
						const container = messagesContainerRef.current
						const elementTop = element.offsetTop
						const containerHeight = container.clientHeight
						const scrollPosition =
							elementTop - containerHeight / 2 + element.clientHeight / 2
						container.scrollTo({ top: scrollPosition, behavior: 'smooth' })
					}
				}, 100)
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
			if (element && messagesContainerRef.current) {
				// Используем прокрутку контейнера вместо scrollIntoView
				const container = messagesContainerRef.current
				const elementTop = element.offsetTop
				const containerHeight = container.clientHeight
				const scrollPosition =
					elementTop - containerHeight / 2 + element.clientHeight / 2
				container.scrollTo({ top: scrollPosition, behavior: 'smooth' })
			}
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
			if (element && messagesContainerRef.current) {
				// Используем прокрутку контейнера вместо scrollIntoView
				const container = messagesContainerRef.current
				const elementTop = element.offsetTop
				const containerHeight = container.clientHeight
				const scrollPosition =
					elementTop - containerHeight / 2 + element.clientHeight / 2
				container.scrollTo({ top: scrollPosition, behavior: 'smooth' })
			}
		}
	}

	const presenceDisplay = useMemo<PresenceDisplay | null>(() => {
		if (!selectedChat) return null

		const presence = selectedChat.presence ?? null
		const now = Date.now()
		const typingTimestamp = parseTimestamp(
			isTyping ? new Date().toISOString() : presence?.typingAt
		)
		const typingWindowMs = 5 * 1000

		if (
			(isTyping && typingUser) ||
			(typingTimestamp && now - typingTimestamp <= typingWindowMs)
		) {
			const name =
				typingUser ||
				selectedChat.otherUser?.fullName ||
				selectedChat.otherUser?.email ||
				'Собеседник'

			return {
				text: `${name} печатает…`,
				indicatorClass: 'bg-emerald-400 animate-pulse',
				tooltip: undefined,
			}
		}

		const lastActivityTs = parseTimestamp(presence?.lastActivityAt)
		const lastReadTs = parseTimestamp(presence?.lastReadAt)

		if (lastActivityTs && now - lastActivityTs <= 2 * 60 * 1000) {
			return {
				text: 'В сети',
				indicatorClass: 'bg-emerald-400',
				tooltip: formatAbsoluteTime(presence?.lastActivityAt),
			}
		}

		const readRelative = formatRelativeTime(presence?.lastReadAt)
		if (presence?.lastReadAt && readRelative) {
			return {
				text: `Прочитано ${readRelative}`,
				indicatorClass: 'bg-sky-400',
				tooltip: formatAbsoluteTime(presence.lastReadAt),
			}
		}

		const activityRelative = formatRelativeTime(presence?.lastActivityAt)
		if (presence?.lastActivityAt && activityRelative) {
			return {
				text: `Был онлайн ${activityRelative}`,
				indicatorClass: 'bg-gray-500',
				tooltip: formatAbsoluteTime(presence.lastActivityAt),
			}
		}

		return {
			text: 'Статус недоступен',
			indicatorClass: 'bg-gray-600',
			tooltip: undefined,
		}
	}, [selectedChat, isTyping, typingUser])

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
					height: 'calc(100vh - 6rem)',
					maxHeight: 'calc(100vh - 6rem)',
					minHeight: 'calc(100vh - 6rem)',
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
			className='fixed inset-x-0 px-2 sm:px-3 md:px-6 overflow-x-hidden max-w-full'
			style={{
				top: isMobile
					? '80px' // Отступ для мобильных (хедер ~64px + небольшой отступ)
					: 'calc(0.5rem - 1px)',
				height: isMobile ? 'calc(100dvh - 80px)' : 'calc(100vh - 6rem)',
				maxHeight: isMobile ? 'calc(100dvh - 80px)' : 'calc(100vh - 6rem)',
				minHeight: isMobile ? 'calc(100dvh - 80px)' : 'calc(100vh - 6rem)',
				paddingTop: 0,
				paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : '0',
				overflow: 'hidden',
				maxWidth: '100vw',
			}}
		>
			<div
				className='w-full h-full flex flex-col bg-slate-900/35 md:rounded-3xl border border-emerald-300/25 overflow-hidden max-w-full'
				style={{ overflow: 'hidden', maxWidth: '100%' }}
			>
				<div
					className='flex flex-1 overflow-hidden min-h-0 max-w-full'
					style={{ touchAction: 'pan-y', overflow: 'hidden', maxWidth: '100%' }}
				>
					{/* Левая колонка - список чатов */}
					<div
						className={`${
							selectedChat ? 'hidden md:flex' : 'flex'
						} w-full md:w-[340px] lg:w-[360px] flex-none border-r border-emerald-300/25 flex-col min-h-0 bg-slate-900/30 overflow-hidden max-w-full`}
						style={{ overflow: 'hidden' }}
					>
						{/* Заголовок и поиск */}
						<div className='flex-shrink-0 p-4 sm:p-6 border-b border-emerald-300/25 bg-slate-900/40 backdrop-blur-lg'>
							<h1 className='text-xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent mb-3 sm:mb-5 flex items-center gap-3'>
								💬 <span>Чаты</span>
							</h1>
							
							{/* Табы для фильтрации по типам чатов */}
							<div className='flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2' style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
								<style jsx global>{`
									.scrollbar-hide::-webkit-scrollbar {
										display: none;
										width: 0;
										height: 0;
									}
								`}</style>
								{[
									{ value: 'all' as const, label: 'Все', icon: '💬' },
									{ value: 'private' as const, label: 'Приватные', icon: '👤' },
									{ value: 'task' as const, label: 'Задачи', icon: '📋' },
									{ value: 'team' as const, label: 'Команды', icon: '👥' },
								].map(tab => (
									<button
										key={tab.value}
										type="button"
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											setChatTypeFilter(tab.value)
										}}
										className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer touch-manipulation ${
											chatTypeFilter === tab.value
												? 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 text-emerald-200 border-2 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] transform scale-105'
												: 'bg-slate-800/40 text-slate-300 border-2 border-slate-700/40 hover:bg-slate-800/60 hover:border-emerald-300/30 hover:text-emerald-300 active:scale-95'
										}`}
									>
										<span className='text-base sm:text-lg'>{tab.icon}</span>
										<span>{tab.label}</span>
									</button>
								))}
							</div>
							
							<div className='relative'>
								<input
									ref={searchInputRef}
									type='text'
									placeholder='Поиск чатов...'
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className='w-full px-5 py-3.5 sm:py-4 bg-slate-800/35 border-2 border-emerald-300/30 rounded-full text-white text-sm sm:text-base placeholder-slate-300/80 focus:border-emerald-300 focus:outline-none focus:bg-slate-800/45 transition-all shadow-lg hover:shadow-emerald-300/15 ios-transition'
									style={
										{
											outline: 'none',
											outlineOffset: '0',
											boxShadow: 'none',
											WebkitAppearance: 'none',
											appearance: 'none',
										} as React.CSSProperties
									}
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
										onClick={() => {
											if (!contextMenu) {
												handleSelectChat(chat)
											}
										}}
										onContextMenu={(e) => handleContextMenu(e, chat.id)}
										onTouchStart={(e) => handleTouchStart(e, chat.id)}
										onTouchEnd={(e) => handleTouchEnd(e, chat.id)}
										className={`group relative p-4 sm:p-5 mx-3 sm:mx-4 my-2 sm:my-2.5 rounded-3xl cursor-pointer ios-transition hover-lift touch-manipulation ${
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
											) : chat.type === 'team' ? (
												<div className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0'>
													<span className='text-lg sm:text-xl'>👥</span>
												</div>
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
						} flex-1 flex-col bg-gradient-to-br from-slate-900/35 via-slate-900/20 to-slate-900/8 min-h-0 h-full overflow-hidden backdrop-blur-lg max-w-full`}
						style={{ overflow: 'hidden', maxWidth: '100%' }}
					>
						{selectedChat ? (
							<>
								{/* Заголовок чата - фиксированный */}
								<div className='flex-shrink-0 px-2 sm:px-5 md:px-8 py-2.5 sm:py-4 md:py-5 border-b border-emerald-300/25 bg-slate-900/32 shadow-[0_12px_32px_rgba(15,118,110,0.22)] backdrop-blur-md relative'>
									{selectedChat && (
										<div className='absolute top-1.5 right-1.5 sm:top-3 sm:right-3 md:top-4 md:right-4 flex items-center gap-1 sm:gap-2'>
											{messages.length > 0 && (
												<button
													onClick={() => setIsMessageSearchOpen(prev => !prev)}
													className='p-1.5 sm:p-2.5 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition touch-manipulation'
													aria-label='Поиск в сообщениях (Ctrl+F)'
													title='Поиск в сообщениях (Ctrl+F)'
													style={{
														WebkitTapHighlightColor: 'transparent',
													}}
												>
													<span className='text-sm sm:text-base md:text-lg'>
														🔍
													</span>
												</button>
											)}
											<button
												onClick={() => setIsAttachmentsOpen(true)}
												className='p-1.5 sm:p-2.5 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg text-emerald-200 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition touch-manipulation'
												title='Открыть вложения'
												style={{
													WebkitTapHighlightColor: 'transparent',
												}}
											>
												<span className='text-sm sm:text-base md:text-lg'>
													📎
												</span>
											</button>
											<button
												onClick={() => {
													if (typeof window !== 'undefined') {
														window.dispatchEvent(
															new CustomEvent('openMessageTemplates')
														)
													}
												}}
												className='p-1.5 sm:p-2.5 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg text-emerald-200 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition touch-manipulation'
												title='Шаблоны сообщений'
												style={{
													WebkitTapHighlightColor: 'transparent',
												}}
											>
												<span className='text-sm sm:text-base md:text-lg'>
													📄
												</span>
											</button>
										</div>
									)}
									<div className='flex items-center space-x-2 sm:space-x-3 md:space-x-4 pr-16 sm:pr-24 md:pr-28'>
										{/* Кнопка "Назад" для мобильных */}
										<button
											onClick={() => {
												setSelectedChat(null)
												// Отправляем событие о том, что чат закрыт (для Header)
												if (typeof window !== 'undefined') {
													window.dispatchEvent(new CustomEvent('chatClosed'))
												}
											}}
											className='md:hidden flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-gray-600/60 to-gray-700/60 border border-gray-500/30 hover:border-emerald-400/50 active:bg-gray-600 active:scale-95 ios-transition hover-scale touch-manipulation shadow-lg transition-transform'
											aria-label='Вернуться к списку чатов'
											style={{
												WebkitTapHighlightColor: 'transparent',
											}}
										>
											<svg
												className='w-4 h-4 sm:w-5 sm:h-5 text-white'
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
													size={
														isMobile ? 36 : window.innerWidth < 640 ? 40 : 48
													}
													userId={selectedChat.otherUser?.id}
												/>
											</div>
										) : (
											<div className='w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0'>
												<span className='text-lg sm:text-xl md:text-2xl'>
													📋
												</span>
											</div>
										)}
										<div className='flex-1 min-w-0'>
											<h2 className='text-white font-semibold text-xs sm:text-sm md:text-lg truncate'>
												{selectedChat.type === 'private'
													? selectedChat.otherUser?.fullName ||
													  selectedChat.otherUser?.email ||
													  'Неизвестный пользователь'
													: getChatTitle(selectedChat)}
											</h2>
											<div className='flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap'>
												{selectedChat.type === 'task' ? (
													<>
														<span className='text-[9px] sm:text-[10px] md:text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded-full'>
															💼 Чат по задаче
														</span>
														{selectedChat.task?.title && (
															<span className='text-xs sm:text-sm text-gray-300 truncate max-w-[200px] sm:max-w-[300px]'>
																{selectedChat.task.title}
															</span>
														)}
													</>
												) : selectedChat.type === 'team' ? (
													<>
														<span className='text-[9px] sm:text-[10px] md:text-xs text-blue-300 bg-blue-900/30 border border-blue-500/30 px-1.5 sm:px-2 py-0.5 rounded-full'>
															👥 Внутренний чат команды
														</span>
														{selectedChat.team?.name && (
															<span className='text-xs sm:text-sm text-gray-300 truncate max-w-[200px] sm:max-w-[300px]'>
																{selectedChat.team.name}
															</span>
														)}
														<span className='text-[9px] sm:text-[10px] text-gray-500'>
															Сообщения видны только команде
														</span>
													</>
												) : null}
											</div>
											{presenceDisplay && (
												<div
													className='mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] md:text-xs text-slate-300 flex items-center gap-1.5 sm:gap-2'
													title={presenceDisplay.tooltip}
												>
													<span className='inline-flex items-center gap-1 sm:gap-2'>
														<span
															className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${presenceDisplay.indicatorClass}`}
														/>
														<span className='truncate'>
															{presenceDisplay.text}
														</span>
													</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Сообщения - растягиваемая область */}
								<div
									ref={messagesContainerRef}
									data-chat-container
									className='flex-1 overflow-y-auto px-3 sm:px-5 md:px-8 lg:px-10 xl:px-16 pt-4 sm:pt-6 pb-4 sm:pb-10 custom-scrollbar relative min-h-0'
									style={{
										touchAction: 'pan-y',
										WebkitOverflowScrolling: 'touch',
										paddingBottom: isMobile
											? 'calc(1rem + env(safe-area-inset-bottom, 0px))'
											: '2.5rem',
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
										<div className='flex flex-col gap-3 p-4'>
											{Array.from({ length: 3 }).map((_, i) => (
												<MessageSkeleton key={i} />
											))}
										</div>
									) : messages.length === 0 && !messagesLoading ? (
										<EmptyState
											icon={MessageSquare}
											title='Начните общение'
											description='Отправьте первое сообщение!'
										/>
									) : (
										<div className='max-w-4xl w-full mx-auto space-y-2 sm:space-y-3 md:space-y-4 px-2 sm:px-4 overflow-x-hidden'>
											{messages
												.map((msg, index) => {
													// Проверяем, что sender существует
													if (!msg.sender) {
														clientLogger.warn('Сообщение без отправителя', {
															message: msg,
														})
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
													const isAttachmentHighlight =
														highlightedMessageId === msg.id

													const wrapperClasses: string[] = []
													if (isHighlighted) {
														wrapperClasses.push(
															'bg-emerald-500/25 rounded-lg px-2 -mx-2 py-1 -my-1 transition-all duration-200'
														)
													} else if (isSearchMatch) {
														wrapperClasses.push(
															'bg-emerald-500/10 rounded-lg px-2 -mx-2 py-1 -my-1'
														)
													}

													if (isAttachmentHighlight) {
														wrapperClasses.push(
															'ring-2 ring-emerald-400/70 rounded-lg px-2 -mx-2 py-1 -my-1 animate-pulse shadow-[0_0_18px_rgba(16,185,129,0.35)]'
														)
													}

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
															className={wrapperClasses.join(' ')}
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
																	const messageToReply = messages.find(
																		m => m.id === messageId
																	)
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
										className='fixed right-4 sm:right-6 md:right-8 z-40 w-10 h-10 sm:w-9 sm:h-9 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-600/95 text-gray-300 hover:text-white rounded-full shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 animate-scaleFadeIn border border-slate-600/50 hover:border-slate-500/70 hover:scale-105 active:scale-95 touch-manipulation'
										style={{
											bottom: isMobile
												? 'calc(120px + env(safe-area-inset-bottom, 0px))'
												: '6rem',
										}}
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
								<div
									className='flex-shrink-0 border-t border-slate-700/50 bg-slate-800/60 md:bg-slate-800/50 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-10'
									style={{
										position: 'relative',
										zIndex: 100,
										touchAction: 'manipulation',
										pointerEvents: 'auto',
										paddingBottom: isMobile
											? `calc(0.5rem + env(safe-area-inset-bottom, 0px))`
											: '0',
									}}
								>
									<div
										className='px-4 py-2 sm:px-5 sm:px-3'
										style={{
											position: 'relative',
											zIndex: 101,
											touchAction: 'manipulation',
											pointerEvents: 'auto',
										}}
									>
										<MessageInput
											chatType={selectedChat.type}
											otherUserId={selectedChat.otherUser?.id}
											taskId={selectedChat.task?.id}
											teamId={selectedChat.team?.id}
											onMessageSent={handleNewMessage}
											replyTo={replyTo}
											onCancelReply={() => setReplyTo(null)}
											showTemplatesButton={false}
										/>
									</div>
									{/* Дополнительный отступ для мобильных браузеров */}
									{isMobile && (
										<div
											className='h-4 md:hidden'
											style={{
												minHeight:
													'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
											}}
										/>
									)}
								</div>

								<AttachmentsModal
									isOpen={isAttachmentsOpen}
									onClose={() => setIsAttachmentsOpen(false)}
									chatId={selectedChat.id}
									chatType={selectedChat.type}
									chatTitle={
										selectedChat.type === 'private'
											? selectedChat.otherUser?.fullName ||
											  selectedChat.otherUser?.email ||
											  'Неизвестный пользователь'
											: getChatTitle(selectedChat)
									}
									onLocateMessage={messageId => {
										setIsAttachmentsOpen(false)
										setTimeout(() => scrollToMessageById(messageId), 200)
									}}
								/>
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

			{/* Контекстное меню для удаления чата */}
			{contextMenu && typeof window !== 'undefined' && document.body && createPortal(
				<>
					{/* Backdrop */}
					<div
						className='fixed inset-0 z-[9997]'
						onClick={() => setContextMenu(null)}
					/>
					{/* Меню */}
					<div
						className='fixed z-[9998] w-48 bg-slate-900/95 border border-red-500/40 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.3)] overflow-hidden animate-fade-in'
						style={{
							left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
							top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px`,
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => handleDeleteChat(contextMenu.chatId)}
							className='w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition text-red-400 hover:text-red-300'
						>
							<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
							</svg>
							<span>Удалить чат</span>
						</button>
					</div>
				</>,
				document.body
			)}

			{/* Диалог подтверждения */}
			{Dialog}
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
