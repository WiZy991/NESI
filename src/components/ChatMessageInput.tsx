'use client'

import { useUser } from '@/context/UserContext'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type MessageInputProps = {
	chatType: 'private' | 'task'
	otherUserId?: string
	taskId?: string
	onMessageSent: (message: any) => void
}

export default function MessageInput({
	chatType,
	otherUserId,
	taskId,
	onMessageSent,
}: MessageInputProps) {
	const { token } = useUser()
	const [message, setMessage] = useState('')
	const [file, setFile] = useState<File | null>(null)
	const [sending, setSending] = useState(false)
	const [isTyping, setIsTyping] = useState(false)
	const [showEmojiPicker, setShowEmojiPicker] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const emojiPickerRef = useRef<HTMLDivElement>(null)

	// Функция для отправки события набора
	const sendTypingEvent = async (typing: boolean) => {
		if (!token || !otherUserId) return

		try {
			await fetch('/api/typing', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					recipientId: otherUserId,
					chatType,
					chatId:
						chatType === 'task' ? `task_${taskId}` : `private_${otherUserId}`,
					isTyping: typing,
				}),
			})
		} catch (error) {
			console.error('Ошибка отправки события набора:', error)
		}
	}

	// Автоматическое изменение высоты textarea при изменении текста
	useEffect(() => {
		const textarea = textareaRef.current
		if (textarea) {
			// Если сообщение пустое, устанавливаем минимальную высоту
			if (!message.trim()) {
				textarea.style.height = '44px'
				return
			}
			
			// Сбрасываем высоту для корректного расчета scrollHeight
			textarea.style.height = 'auto'
			
			// Вычисляем новую высоту на основе содержимого
			const newHeight = Math.max(44, Math.min(textarea.scrollHeight, 150))
			textarea.style.height = `${newHeight}px`
		}
	}, [message])

	// Обработчик изменения текста
	const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value
		setMessage(value)

		// Отправляем событие начала набора
		if (value.trim() && !isTyping) {
			setIsTyping(true)
			sendTypingEvent(true)
		}

		// Очищаем предыдущий таймаут
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}

		// Устанавливаем таймаут для остановки набора
		typingTimeoutRef.current = setTimeout(() => {
			if (isTyping) {
				setIsTyping(false)
				sendTypingEvent(false)
			}
		}, 1000)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!message.trim() && !file) return

		// Останавливаем набор при отправке
		if (isTyping) {
			setIsTyping(false)
			sendTypingEvent(false)
		}

		setSending(true)
		try {
			const formData = new FormData()
			formData.append('content', message)
			if (file) {
				formData.append('file', file)
			}

			let url = ''
			if (chatType === 'private') {
				url = `/api/messages/send`
				formData.append('recipientId', otherUserId!)
			} else {
				url = `/api/tasks/${taskId}/messages`
			}

			const res = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await res.json()
			if (res.ok) {
				// Добавляем новое сообщение в список
				const newMessage = chatType === 'private' ? data : data.message || data
				onMessageSent(newMessage)
				setMessage('')
				setFile(null)
				
				// Сбрасываем высоту textarea к начальному размеру
				if (textareaRef.current) {
					textareaRef.current.style.height = '44px'
				}
				
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
			} else {
				console.error('Ошибка отправки сообщения:', data)
				alert(
					'Ошибка отправки сообщения: ' + (data.error || 'Неизвестная ошибка')
				)
			}
		} catch (error) {
			console.error('Ошибка отправки сообщения:', error)
		} finally {
			setSending(false)
		}
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			setFile(selectedFile)
		}
	}

	// Функция для сокращения имени файла
	const getTruncatedFileName = (fileName: string, maxLength: number = 30) => {
		if (fileName.length <= maxLength) return fileName

		const extension = fileName.split('.').pop()
		const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
		const truncatedName = nameWithoutExt.substring(
			0,
			maxLength - (extension?.length || 0) - 4
		)

		return `${truncatedName}...${extension ? `.${extension}` : ''}`
	}

	// Обработчик выбора эмоджи
	const handleEmojiClick = (emojiData: any) => {
		setMessage(prev => prev + emojiData.emoji)
		setShowEmojiPicker(false)
	}

	// Закрытие emoji picker при клике вне его
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(event.target as Node)
			) {
				setShowEmojiPicker(false)
			}
		}

		if (showEmojiPicker) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [showEmojiPicker])

	// Очистка таймаута при размонтировании
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}, [])

	return (
		<form onSubmit={handleSubmit} className='px-2 py-2 sm:px-4 sm:py-3'>
			{/* Информация о прикрепленном файле */}
			{file && (
				<div className='mb-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700/50 rounded-lg flex items-center gap-2 text-xs sm:text-sm'>
					<div className='flex items-center gap-2 flex-1 min-w-0 overflow-hidden'>
						<span className='flex-shrink-0 text-emerald-400 text-base sm:text-lg'>
							📎
						</span>
						<div className='flex-1 min-w-0 overflow-hidden'>
							<div className='text-emerald-400 truncate font-medium leading-tight'>
								<span className='hidden sm:inline'>
									{getTruncatedFileName(file.name, 35)}
								</span>
								<span className='inline sm:hidden'>
									{getTruncatedFileName(file.name, 20)}
								</span>
							</div>
							<div className='text-gray-400 text-[10px] sm:text-xs'>
								{(file.size / 1024).toFixed(1)} KB
							</div>
						</div>
					</div>
					<button
						type='button'
						onClick={() => {
							setFile(null)
							if (fileInputRef.current) {
								fileInputRef.current.value = ''
							}
						}}
						className='flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600/50 text-gray-400 hover:text-red-400 transition-colors'
						title='Удалить файл'
					>
						✕
					</button>
				</div>
			)}

			<div className='flex items-end gap-2 sm:gap-2'>
				{/* Кнопка прикрепления файла */}
				<label className='cursor-pointer flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-700 active:bg-gray-600 transition-colors touch-manipulation'>
					<input
						ref={fileInputRef}
						type='file'
						onChange={handleFileChange}
						className='hidden'
						accept='image/*,.pdf,.doc,.docx,.txt'
					/>
					<svg
						className='w-5 h-5 sm:w-5 sm:h-5 text-gray-400'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
						/>
					</svg>
				</label>

				{/* Кнопка эмоджи */}
				<div className='relative' ref={emojiPickerRef}>
					<button
						type='button'
						onClick={() => setShowEmojiPicker(prev => !prev)}
						className='flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-700 active:bg-gray-600 transition-colors text-xl sm:text-lg touch-manipulation'
					>
						😊
					</button>
					{showEmojiPicker && (
						<div className='absolute bottom-full mb-2 right-0 z-50'>
							<EmojiPicker
								onEmojiClick={handleEmojiClick}
								width={280}
								height={350}
								theme='dark' as any
								searchPlaceholder='Поиск эмоджи...'
								previewConfig={{ showPreview: false }}
							/>
						</div>
					)}
				</div>

				{/* Поле ввода сообщения */}
				<div className='flex-1 relative'>
					<textarea
						ref={textareaRef}
						value={message}
						onChange={handleMessageChange}
						onKeyDown={(e) => {
							// Enter без Shift - отправка
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								handleSubmit(e as any)
							}
						}}
						placeholder='Сообщение...'
						rows={1}
						className='w-full px-4 sm:px-4 py-3 sm:py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-3xl text-white text-base sm:text-base placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 resize-none custom-scrollbar'
						disabled={sending}
						style={{ 
							height: '44px',
							minHeight: '44px', 
							maxHeight: '150px',
							lineHeight: '1.5',
							overflow: 'auto',
							transition: 'height 0.1s ease'
						}}
					/>
				</div>

				{/* Кнопка отправки */}
				<button
					type='submit'
					disabled={sending || (!message.trim() && !file)}
					className='flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center touch-manipulation'
					title={sending ? 'Отправка...' : 'Отправить'}
				>
					{sending ? (
						<svg
							className='animate-spin w-3.5 h-3.5 sm:w-5 sm:h-5'
							fill='none'
							viewBox='0 0 24 24'
						>
							<circle
								className='opacity-25'
								cx='12'
								cy='12'
								r='10'
								stroke='currentColor'
								strokeWidth='4'
							></circle>
							<path
								className='opacity-75'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
							></path>
						</svg>
					) : (
						<svg
							className='w-3.5 h-3.5 sm:w-5 sm:h-5'
							fill='currentColor'
							viewBox='0 0 24 24'
						>
							<path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
						</svg>
					)}
				</button>
			</div>
		</form>
	)
}
