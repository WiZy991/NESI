'use client'

import { useUser } from '@/context/UserContext'
import { useEffect, useRef, useState } from 'react'

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
	const fileInputRef = useRef<HTMLInputElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

	// Обработчик изменения текста
	const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

	// Очистка таймаута при размонтировании
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}, [])

	return (
		<form
			onSubmit={handleSubmit}
			className='p-2 sm:p-4 bg-gray-900/50 backdrop-blur-sm'
		>
			{/* Информация о прикрепленном файле */}
			{file && (
				<div className='mb-2 px-2 py-1.5 bg-gray-700/50 rounded-lg flex items-center justify-between text-sm'>
					<span className='text-emerald-400 truncate flex-1'>
						📎 {file.name}
					</span>
					<button
						type='button'
						onClick={() => {
							setFile(null)
							if (fileInputRef.current) {
								fileInputRef.current.value = ''
							}
						}}
						className='ml-2 text-gray-400 hover:text-red-400 transition-colors'
					>
						✕
					</button>
				</div>
			)}

			<div className='flex items-end gap-2'>
				{/* Кнопка прикрепления файла */}
				<label className='cursor-pointer flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-700 transition-colors'>
					<input
						ref={fileInputRef}
						type='file'
						onChange={handleFileChange}
						className='hidden'
						accept='image/*,.pdf,.doc,.docx,.txt'
					/>
					<svg
						className='w-5 h-5 text-gray-400'
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

				{/* Поле ввода сообщения */}
				<div className='flex-1 relative'>
					<input
						type='text'
						value={message}
						onChange={handleMessageChange}
						placeholder='Сообщение...'
						className='w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-3xl text-white text-sm sm:text-base placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all'
						disabled={sending}
					/>
				</div>

				{/* Кнопка отправки */}
				<button
					type='submit'
					disabled={sending || (!message.trim() && !file)}
					className='flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center'
					title={sending ? 'Отправка...' : 'Отправить'}
				>
					{sending ? (
						<svg
							className='animate-spin w-4 h-4 sm:w-5 sm:h-5'
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
							className='w-4 h-4 sm:w-5 sm:h-5'
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
