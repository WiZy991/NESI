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
			className='p-6 bg-gradient-to-r from-emerald-900/20 to-transparent'
		>
			<div className='flex items-center space-x-3'>
				{/* Поле ввода сообщения */}
				<div className='flex-1'>
					<input
						type='text'
						value={message}
						onChange={handleMessageChange}
						placeholder='Введите сообщение...'
						className='w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all'
						disabled={sending}
					/>
				</div>

				{/* Кнопка прикрепления файла */}
				<label className='cursor-pointer'>
					<input
						ref={fileInputRef}
						type='file'
						onChange={handleFileChange}
						className='hidden'
						accept='image/*,.pdf,.doc,.docx,.txt'
					/>
					<span className='text-gray-400 hover:text-emerald-400 text-xl'>
						📎
					</span>
				</label>

				{/* Кнопка отправки */}
				<button
					type='submit'
					disabled={sending || (!message.trim() && !file)}
					className='px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/25'
				>
					{sending ? 'Отправка...' : 'Отправить'}
				</button>
			</div>

			{/* Информация о прикрепленном файле */}
			{file && (
				<div className='mt-2 text-sm text-emerald-400'>
					📎 Файл: {file.name} ({(file.size / 1024).toFixed(1)} KB)
				</div>
			)}
		</form>
	)
}
