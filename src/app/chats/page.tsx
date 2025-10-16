'use client'

import MessageInput from '@/components/ChatMessageInput'
import FilePreview from '@/components/FilePreview'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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

export default function ChatsPage() {
	const { user, token } = useUser()
	const [chats, setChats] = useState<Chat[]>([])
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(true)
	const [messagesLoading, setMessagesLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [isTyping, setIsTyping] = useState(false)
	const [typingUser, setTypingUser] = useState<string | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const eventSourceRef = useRef<EventSource | null>(null)
	const searchParams = useSearchParams()
	const openUserId = searchParams.get('open')

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
					setChats(data.chats || [])
					console.log('✅ Чаты загружены:', data.chats?.length || 0)

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

	// --- ✅ Обработка ?open=USER_ID ---
	useEffect(() => {
		if (!openUserId || !chats.length || !token) return

		const existingChat = chats.find(
			c => c.type === 'private' && c.otherUser?.id === openUserId
		)

		if (existingChat) {
			console.log('✅ Автооткрытие чата с пользователем:', openUserId)
			setSelectedChat(existingChat)
		} else {
			console.log('⚙️ Чат с пользователем не найден, создаём новый...')
			createPrivateChat(openUserId)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [openUserId, chats])

	// --- Создание приватного чата при необходимости ---
	const createPrivateChat = async (userId: string) => {
		try {
			const res = await fetch('/api/chats', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ participantId: userId }),
			})
			const data = await res.json()
			if (res.ok && data.chat) {
				console.log('✅ Новый чат создан:', data.chat)
				setChats(prev => [...prev, data.chat])
				setSelectedChat(data.chat)
			} else {
				console.error('❌ Ошибка при создании чата:', data)
			}
		} catch (err) {
			console.error('Ошибка создания приватного чата:', err)
		}
	}
	// Загрузка сообщений для выбранного чата
	useEffect(() => {
		if (!selectedChat || !token) return

		const fetchMessages = async () => {
			setMessagesLoading(true)
			try {
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
				}
			} catch (error) {
				console.error('Ошибка загрузки сообщений:', error)
			} finally {
				setMessagesLoading(false)
			}
		}

		fetchMessages()
	}, [selectedChat, token])

	// Автоскролл к последнему сообщению
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

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
				if (chat.type === 'private' && chat.otherUser?.id) {
					await fetch('/api/chats/mark-private-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ otherUserId: chat.otherUser.id }),
					})
				} else if (chat.type === 'task' && chat.task?.id) {
					await fetch('/api/chats/mark-task-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ taskId: chat.task.id }),
					})
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
			<div className='min-h-screen bg-transparent flex items-center justify-center'>
				<div className='text-emerald-400 text-lg'>Загрузка чатов...</div>
			</div>
		)
	}

	return (
		<div className='h-screen bg-transparent from-gray-900 via-black to-gray-900 p-4'>
			<div className='max-w-7xl mx-auto h-full bg-gray-900/20 backdrop-blur-sm rounded-2xl overflow-hidden'>
				<div className='flex h-full'>
					{/* Левая колонка - список чатов */}
					<div className='w-1/3 bg-gray-800/20 backdrop-blur-sm flex flex-col'>
						{/* Заголовок и поиск */}
						<div className='flex-shrink-0 p-6 bg-gradient-to-r from-emerald-900/20 to-transparent'>
							<h1 className='text-2xl font-bold text-emerald-400 mb-4 flex items-center'>
								💬 Чаты
							</h1>
							<input
								type='text'
								placeholder='Поиск чатов...'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all'
							/>
						</div>

						{/* Список чатов */}
						<div className='flex-1 overflow-y-auto custom-scrollbar'>
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
										className={`p-4 mx-3 my-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gray-700/50 ${
											selectedChat?.id === chat.id
												? 'bg-emerald-900/30 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
												: 'hover:shadow-md'
										}`}
									>
										<div className='flex items-center space-x-3'>
											{/* Аватар */}
											{chat.type === 'private' ? (
												<AvatarComponent
													avatarUrl={chat.otherUser?.avatarUrl}
													fallbackText={
														chat.otherUser?.fullName ||
														chat.otherUser?.email ||
														'?'
													}
													size={48}
													userId={chat.otherUser?.id}
												/>
											) : (
												<div className='w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg'>
													📋
												</div>
											)}

											{/* Информация о чате */}
											<div className='flex-1 min-w-0'>
												<div className='flex items-center justify-between'>
													<h3 className='text-white font-medium truncate'>
														{getChatTitle(chat)}
													</h3>
													<span className='text-xs text-gray-400 ml-2 bg-gray-700/50 px-2 py-1 rounded-full'>
														{formatTime(chat.lastMessage.createdAt)}
													</span>
												</div>
												<p className='text-sm text-gray-400 truncate mt-1'>
													{getChatSubtitle(chat)}
												</p>
												{chat.type === 'task' && (
													<p className='text-xs text-emerald-400 mt-1 bg-emerald-900/20 px-2 py-1 rounded-full inline-block'>
														📋 {chat.task?.title}
													</p>
												)}
											</div>

											{/* Индикатор непрочитанных */}
											{chat.unreadCount > 0 && (
												<div className='bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg'>
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
					<div className='flex-1 flex flex-col bg-gray-800/10 backdrop-blur-sm'>
						{selectedChat ? (
							<>
								{/* Заголовок чата - фиксированный */}
								<div className='flex-shrink-0 p-6 bg-gradient-to-r from-emerald-900/20 to-transparent'>
									<div className='flex items-center space-x-4'>
										<div className='w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg'>
											{selectedChat.type === 'private' ? (
												<AvatarComponent
													avatarUrl={selectedChat.otherUser?.avatarUrl}
													fallbackText={
														selectedChat.otherUser?.fullName ||
														selectedChat.otherUser?.email ||
														'?'
													}
													size={40}
													userId={selectedChat.otherUser?.id}
												/>
											) : (
												'📋'
											)}
										</div>
										<div>
											<h2 className='text-white font-semibold text-lg'>
												{getChatTitle(selectedChat)}
											</h2>
											{selectedChat.type === 'task' && (
												<p className='text-sm text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full inline-block mt-1'>
													📋 {selectedChat.task?.title}
												</p>
											)}
										</div>
									</div>
								</div>

								{/* Сообщения - растягиваемая область */}
								<div className='flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar'>
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
											.map(msg => {
												// Проверяем, что sender существует
												if (!msg.sender) {
													console.warn('Сообщение без отправителя:', msg)
													return null
												}

												const isMine = msg.sender.id === user?.id
												return (
													<div
														key={msg.id}
														className={`flex ${
															isMine ? 'justify-end' : 'justify-start'
														}`}
													>
														<div
															className={`max-w-[75%] p-4 rounded-2xl shadow-lg ${
																isMine
																	? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md'
																	: 'bg-gray-700/80 backdrop-blur-sm text-gray-100 rounded-bl-md border border-gray-600/50'
															}`}
														>
															<div className='text-xs opacity-80 mb-2'>
																<Link
																	href={
																		isMine
																			? '/profile'
																			: `/users/${msg.sender.id}`
																	}
																	className={`${
																		isMine
																			? 'text-emerald-100'
																			: 'text-blue-400'
																	} hover:underline font-medium`}
																>
																	{msg.sender.fullName ||
																		msg.sender.email ||
																		'Неизвестный пользователь'}
																</Link>{' '}
																<span className='text-xs opacity-60'>
																	{new Date(msg.createdAt).toLocaleTimeString()}
																</span>
															</div>
															{msg.content && (
																<p className='mb-2 leading-relaxed'>
																	{msg.content}
																</p>
															)}
															{msg.fileUrl && (
																<FilePreview
																	fileUrl={msg.fileUrl}
																	fileName={msg.fileName}
																	mimeType={msg.fileMimetype}
																/>
															)}
														</div>
													</div>
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
								<div className='flex-shrink-0'>
									<MessageInput
										chatType={selectedChat.type}
										otherUserId={selectedChat.otherUser?.id}
										taskId={selectedChat.task?.id}
										onMessageSent={handleNewMessage}
									/>
								</div>
							</>
						) : (
							<div className='flex-1 flex items-center justify-center'>
								<div className='text-center text-gray-400'>
									<div className='text-8xl mb-6'>💬</div>
									<h2 className='text-2xl font-semibold mb-3 text-white'>
										Выберите чат
									</h2>
									<p className='text-lg'>
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
