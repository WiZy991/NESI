'use client'

import { useUser } from '@/context/UserContext'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type MessageInputProps = {
	chatType: 'private' | 'task'
	otherUserId?: string
	taskId?: string
	onMessageSent: (message: any) => void
	replyTo?: {
		id: string
		content: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	} | null
	onCancelReply?: () => void
}

export default function MessageInput({
	chatType,
	otherUserId,
	taskId,
	onMessageSent,
	replyTo,
	onCancelReply,
}: MessageInputProps) {
	const { token } = useUser()
	const [message, setMessage] = useState('')
	const [file, setFile] = useState<File | null>(null)
	const [filePreview, setFilePreview] = useState<string | null>(null)
	const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
	const [uploadProgress, setUploadProgress] = useState<number>(0)
	const [uploading, setUploading] = useState(false)
	const [videoPlaying, setVideoPlaying] = useState(false)
	const [sending, setSending] = useState(false)
	const [imageRotation, setImageRotation] = useState<number>(0)
	const [caption, setCaption] = useState<string>('')
	const [isTyping, setIsTyping] = useState(false)
	const [showEmojiPicker, setShowEmojiPicker] = useState(false)
	const [showCaptionEmojiPicker, setShowCaptionEmojiPicker] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const captionTextareaRef = useRef<HTMLTextAreaElement>(null)
	
	// Отслеживание размера окна для адаптивности
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 640)
		}
		
		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])
	const fileInputRef = useRef<HTMLInputElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const emojiPickerRef = useRef<HTMLDivElement>(null)
	const emojiButtonRef = useRef<HTMLButtonElement>(null)
	const videoPreviewRef = useRef<HTMLVideoElement>(null)
	const uploadXhrRef = useRef<XMLHttpRequest | null>(null)
	const currentUploadingFileRef = useRef<File | null>(null)

	// КРИТИЧНО: Убираем квадратную обводку outline - она всегда квадратная!
	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return

		const removeOutline = () => {
			textarea.style.setProperty('outline', 'none', 'important')
			textarea.style.setProperty('outline-offset', '0', 'important')
			textarea.style.setProperty('box-shadow', 'none', 'important')
		}

		// Устанавливаем сразу
		removeOutline()

		// Обработчики для всех событий
		const events = ['focus', 'blur', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend']
		events.forEach(event => {
			textarea.addEventListener(event, removeOutline, true)
		})

		// MutationObserver для отслеживания изменений стилей
		const observer = new MutationObserver(() => {
			removeOutline()
		})
		observer.observe(textarea, {
			attributes: true,
			attributeFilter: ['style', 'class']
		})

		return () => {
			events.forEach(event => {
				textarea.removeEventListener(event, removeOutline, true)
			})
			observer.disconnect()
		}
	}, [])

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

	const handleSubmit = async (e: React.FormEvent, captionText?: string) => {
		e.preventDefault()
		const messageToSend = captionText !== undefined ? captionText : message
		
		// Убеждаемся, что messageToSend - это строка
		const contentString = typeof messageToSend === 'string' ? messageToSend : String(messageToSend || '')
		
		if (!contentString.trim() && !file) return

		// Останавливаем набор при отправке
		if (isTyping) {
			setIsTyping(false)
			sendTypingEvent(false)
		}

		setSending(true)
		
		try {
			// Используем JSON для отправки, так как файл уже загружен
			const body: any = {
				content: contentString.trim() || '', // Отправляем подпись или обычное сообщение (всегда строка)
			}

			if (uploadedFileId) {
				body.fileId = uploadedFileId
			}

			if (replyTo?.id) {
				body.replyToId = replyTo.id
			}

			let url = ''
			if (chatType === 'private') {
				url = `/api/messages/send`
				body.recipientId = otherUserId!
			} else {
				url = `/api/tasks/${taskId}/messages`
			}

			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			})

			// Проверяем, есть ли содержимое в ответе
			const text = await res.text()
			if (!text || text.trim() === '') {
				console.error('⚠️ Пустой ответ от API при отправке сообщения')
				alert('Ошибка отправки сообщения: сервер вернул пустой ответ')
				setSending(false)
				return
			}

			let data
			try {
				data = JSON.parse(text)
			} catch (parseError) {
				console.error('❌ Ошибка парсинга JSON при отправке сообщения:', parseError, 'Ответ:', text.substring(0, 200))
				alert('Ошибка отправки сообщения: неверный формат ответа от сервера')
				setSending(false)
				return
			}

			if (res.ok) {
				// Добавляем новое сообщение в список
				const newMessage = chatType === 'private' ? data : data.message || data
				console.log('✅ Сообщение отправлено, полученный ответ:', newMessage)
				console.log('📎 Данные файла в ответе:', {
					fileId: newMessage.fileId,
					fileName: newMessage.fileName,
					fileMimetype: newMessage.fileMimetype,
					fileUrl: newMessage.fileUrl
				})
				onMessageSent(newMessage)
				
				// Сбрасываем все состояния после успешной отправки
				setMessage('')
				setCaption('')
				setShowCaptionEmojiPicker(false)
				setFile(null)
				setFilePreview(null)
				setUploadedFileId(null)
				setUploadProgress(0)
				setVideoPlaying(false)
				setImageRotation(0)
				setUploading(false)
				setSending(false)
				currentUploadingFileRef.current = null
				
				// Отменяем активные загрузки
				if (uploadXhrRef.current) {
					uploadXhrRef.current.abort()
					uploadXhrRef.current = null
				}
				if (videoPreviewRef.current) {
					videoPreviewRef.current.pause()
					videoPreviewRef.current.currentTime = 0
				}
				
				// Отменяем ответ после отправки
				if (onCancelReply) {
					onCancelReply()
				}
				
				// Сбрасываем высоту textarea к начальному размеру
				if (textareaRef.current) {
					textareaRef.current.style.height = '44px'
				}
				
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
			} else {
				// Формируем понятное сообщение об ошибке
				const errorText = data?.error || data?.details || data?.message || 'Неизвестная ошибка'
				const errorMessage = typeof errorText === 'string' ? errorText : JSON.stringify(errorText)
				
				console.error('❌ Ошибка отправки сообщения:', {
					status: res.status,
					statusText: res.statusText,
					error: errorMessage,
					data: data,
					bodySent: body,
				})
				
				// Показываем пользователю понятное сообщение об ошибке
				alert(`Ошибка отправки сообщения: ${errorMessage}`)
				setSending(false)
			}
		} catch (error: any) {
			console.error('Ошибка отправки сообщения:', error)
			const errorMessage = error?.message || String(error) || 'Неизвестная ошибка'
			alert(`Ошибка отправки сообщения: ${errorMessage}`)
			setSending(false)
		}
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (!selectedFile || !token) return

		// Отменяем предыдущую загрузку если она идет
		if (uploadXhrRef.current) {
			uploadXhrRef.current.abort()
			uploadXhrRef.current = null
		}

		// Останавливаем предыдущее видео если было
		if (videoPreviewRef.current) {
			videoPreviewRef.current.pause()
			videoPreviewRef.current.currentTime = 0
		}

		// Сбрасываем состояние перед загрузкой нового файла (НО НЕ ПОДПИСЬ!)
		// setCaption('') - УБРАНО: подпись должна сохраняться при смене файла
		setShowCaptionEmojiPicker(false)
		setImageRotation(0)
		setVideoPlaying(false)

		// Обновляем текущий загружаемый файл
		currentUploadingFileRef.current = selectedFile
		setFile(selectedFile)
		setUploadProgress(0)
		setUploading(true)
		setUploadedFileId(null)
		
		// Создаем предпросмотр для изображений и видео
		const fileType = selectedFile.type
		if (fileType.startsWith('image/')) {
			const reader = new FileReader()
			reader.onloadend = () => {
				setFilePreview(reader.result as string)
			}
			reader.readAsDataURL(selectedFile)
		} else if (fileType.startsWith('video/')) {
			const reader = new FileReader()
			reader.onloadend = () => {
				setFilePreview(reader.result as string)
			}
			reader.readAsDataURL(selectedFile)
				} else {
			setFilePreview(null)
		}

		// Сразу начинаем загрузку файла на сервер
		try {
			console.log('📤 Начало загрузки файла:', selectedFile.name, selectedFile.size)
			const formData = new FormData()
			formData.append('file', selectedFile)

			const xhr = new XMLHttpRequest()
			uploadXhrRef.current = xhr
			
			// Отслеживаем прогресс загрузки
			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable && currentUploadingFileRef.current === selectedFile) {
					const percentComplete = (e.loaded / e.total) * 100
					setUploadProgress(percentComplete)
					console.log('📊 Прогресс загрузки:', Math.round(percentComplete) + '%')
				}
			})

			const uploadResult = await new Promise<{ id: string; url: string }>((resolve, reject) => {
				xhr.addEventListener('load', () => {
					console.log('📥 Загрузка завершена, статус:', xhr.status)
					uploadXhrRef.current = null
					if (xhr.status === 200) {
						try {
							const responseText = xhr.responseText || xhr.response
							if (!responseText || responseText.trim() === '') {
								console.error('❌ Пустой ответ от сервера')
								reject(new Error('Пустой ответ от сервера'))
								return
							}
							const data = JSON.parse(responseText)
							if (data.id) {
								console.log('✅ Файл загружен успешно, ID:', data.id)
								resolve({ id: data.id, url: data.url || '' })
							} else {
								console.error('❌ Неверный формат ответа, отсутствует id:', data)
								reject(new Error('Неверный формат ответа: отсутствует id файла'))
							}
						} catch (e) {
							console.error('❌ Ошибка парсинга ответа:', e, 'Ответ:', xhr.responseText?.substring(0, 200))
							reject(new Error('Ошибка парсинга ответа от сервера'))
						}
					} else {
						// Обработка ошибок HTTP
						try {
							const responseText = xhr.responseText || xhr.response || ''
							let errorMessage = `Ошибка загрузки файла (${xhr.status} ${xhr.statusText || ''})`
							
							if (responseText && typeof responseText === 'string' && responseText.trim() !== '') {
								try {
									const error = JSON.parse(responseText)
									errorMessage = error.error || error.message || error.details || errorMessage
								} catch (parseError) {
									// Если не JSON, попробуем использовать как текст
									if (responseText.length < 200) {
										errorMessage = responseText
									}
								}
							}
							
							reject(new Error(errorMessage))
						} catch (parseError) {
							console.error('Неожиданная ошибка при обработке ответа об ошибке:', parseError)
							reject(new Error(`Ошибка загрузки файла (${xhr.status} ${xhr.statusText || 'Неизвестная ошибка'})`))
						}
					}
				})

				xhr.addEventListener('error', (e) => {
					uploadXhrRef.current = null
					console.error('Ошибка сети при загрузке файла:', e)
					reject(new Error('Ошибка сети при загрузке файла'))
				})

				xhr.addEventListener('abort', () => {
					uploadXhrRef.current = null
					// Отклоняем промис с особым сообщением, которое мы потом будем игнорировать
					const abortError = new Error('UPLOAD_ABORTED')
					abortError.name = 'UploadAborted'
					reject(abortError)
				})

				xhr.open('POST', '/api/upload/chat-file')
				xhr.setRequestHeader('Authorization', `Bearer ${token}`)
				xhr.send(formData)
			})

			// Проверяем, что файл еще актуален (не был заменен другим)
			if (currentUploadingFileRef.current === selectedFile) {
				console.log('✅ Устанавливаем uploadedFileId:', uploadResult.id)
				setUploadedFileId(uploadResult.id)
				setUploadProgress(100)
				setUploading(false)
			} else {
				console.log('⚠️ Файл был заменен, игнорируем результат загрузки')
			}
		} catch (error: any) {
			// Игнорируем ошибку если загрузка была отменена из-за выбора нового файла
			// или если файл уже был заменен другим
			const wasAborted = error?.message === 'UPLOAD_ABORTED' || 
							   error?.name === 'UploadAborted' ||
							   error?.message === 'Загрузка отменена' ||
							   currentUploadingFileRef.current !== selectedFile
			
			if (!wasAborted && currentUploadingFileRef.current === selectedFile) {
				console.error('Ошибка загрузки файла:', error)
				const errorMessage = error?.message || 'Ошибка загрузки файла'
				alert(errorMessage)
				setFile(null)
				setFilePreview(null)
				setUploadProgress(0)
				setUploading(false)
				setVideoPlaying(false)
				setUploadedFileId(null)
				currentUploadingFileRef.current = null
				if (videoPreviewRef.current) {
					videoPreviewRef.current.pause()
					videoPreviewRef.current.currentTime = 0
				}
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
			} else {
				// Загрузка была отменена или файл заменен, просто сбрасываем состояние
				if (currentUploadingFileRef.current === selectedFile) {
					setUploading(false)
				}
			}
		}
	}
	
	// Функция определения типа файла
	const getFileType = (file: File): 'image' | 'video' | 'document' => {
		if (file.type.startsWith('image/')) return 'image'
		if (file.type.startsWith('video/')) return 'video'
		return 'document'
	}
	
	// Функция форматирования размера файла
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return bytes + ' B'
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
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
	const handleEmojiClick = (emojiData: any, isCaption: boolean = false) => {
		// emoji-picker-react возвращает эмодзи в разных форматах
		// Приоритет: emoji > unified (конвертируем) > native
		let emoji: string = ''
		
		if (emojiData.emoji) {
			emoji = emojiData.emoji
		} else if (emojiData.unified) {
			// Конвертируем unified код (например, "1F600" или "1F600-1F5FF") в символ
			try {
				const codes = emojiData.unified.split('-').map((hex: string) => parseInt(hex, 16))
				emoji = String.fromCodePoint(...codes)
			} catch (e) {
				console.error('Ошибка конвертации unified кода:', e)
				emoji = emojiData.native || ''
			}
		} else if (emojiData.native) {
			emoji = emojiData.native
		}
		
		if (emoji) {
			if (isCaption) {
				// Вставляем emoji в подпись
				setCaption(prev => prev + emoji)
			} else {
				// Вставляем emoji в основное поле сообщения
				const textarea = textareaRef.current
				if (textarea) {
					const start = textarea.selectionStart || 0
					const end = textarea.selectionEnd || 0
					const textBefore = message.substring(0, start)
					const textAfter = message.substring(end)
					setMessage(textBefore + emoji + textAfter)
					
					// Устанавливаем курсор после вставленного emoji
					setTimeout(() => {
						textarea.focus()
						textarea.setSelectionRange(start + emoji.length, start + emoji.length)
					}, 0)
				} else {
					setMessage(prev => prev + emoji)
				}
			}
		} else {
			console.warn('Не удалось извлечь эмодзи из:', emojiData)
		}
		
		setShowEmojiPicker(false)
	}

	// Закрытие emoji picker при нажатии Escape
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (showCaptionEmojiPicker) {
					setShowCaptionEmojiPicker(false)
				} else if (showEmojiPicker) {
				setShowEmojiPicker(false)
				}
			}
		}

		if (showEmojiPicker || showCaptionEmojiPicker) {
			document.addEventListener('keydown', handleEscape)
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
		}
	}, [showEmojiPicker, showCaptionEmojiPicker])

	// Очистка таймаута при размонтировании
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}, [])

	return (
		<form onSubmit={handleSubmit} className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4'>
			{/* Информация об ответе на сообщение */}
			{replyTo && (
				<div className='mb-3 px-4 py-2.5 bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-xl flex items-start gap-3 text-xs sm:text-sm transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-top-2 shadow-lg'>
					<div className='flex-1 min-w-0'>
						<div className='text-slate-200 font-medium mb-1 flex items-center gap-2'>
							<span className='text-emerald-400/80'>↩️</span>
							<span>{replyTo.sender.fullName || replyTo.sender.email}</span>
						</div>
						<div className='text-gray-400 line-clamp-2 pl-6 border-l-2 border-emerald-400/30'>
							{replyTo.content || '📎 Файл'}
						</div>
					</div>
					{onCancelReply && (
						<button
							type='button'
							onClick={onCancelReply}
							className='flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-600/60 text-gray-400 hover:text-white transition-all duration-150 ease-out'
							aria-label='Отменить ответ'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
							</svg>
						</button>
					)}
				</div>
			)}

			{/* Модальное окно предпросмотра файла - центрировано на экране */}
			{file && filePreview && (getFileType(file) === 'image' || getFileType(file) === 'video') && typeof window !== 'undefined' && createPortal(
				<div 
					className='fixed inset-0 z-[9999] flex items-center justify-center p-4'
					style={{ 
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 9999
					}}
				>
					{/* Затемненный фон */}
					<div 
						className='absolute inset-0 bg-black/60 backdrop-blur-sm'
						onClick={() => {
							// Отменяем загрузку если она идет
							if (uploadXhrRef.current) {
								uploadXhrRef.current.abort()
								uploadXhrRef.current = null
							}
							// Очищаем состояние
							setFile(null)
							setFilePreview(null)
							setUploadedFileId(null)
							setUploadProgress(0)
							setVideoPlaying(false)
							setUploading(false)
							setImageRotation(0)
							setCaption('')
							setShowCaptionEmojiPicker(false)
							currentUploadingFileRef.current = null
							if (videoPreviewRef.current) {
								videoPreviewRef.current.pause()
								videoPreviewRef.current.currentTime = 0
							}
							if (fileInputRef.current) {
								fileInputRef.current.value = ''
							}
						}}
					/>
					
					{/* Модальное окно с предпросмотром */}
					<div className='relative w-full max-w-[calc(100vw-20px)] sm:max-w-[420px] md:max-w-[500px] bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl animate-scaleFadeIn overflow-hidden z-10 mx-auto'>
						{/* Заголовок */}
						<div className='px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-700/50'>
							<div className='flex items-center gap-2 flex-1 min-w-0'>
								<span className='text-slate-200 font-medium text-sm truncate'>
									{getFileType(file) === 'image' ? 'Отправить изображение' : 'Отправить видео'}
						</span>
							</div>
							<div className='flex items-center gap-2'>
								{/* Кнопка смены файла */}
								<label
									className='flex-shrink-0 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 active:bg-slate-700/70 text-gray-400 hover:text-white transition-colors cursor-pointer touch-manipulation'
									title='Сменить файл'
									aria-label='Сменить файл'
								>
									<input
										type='file'
										onChange={(e) => {
											// Обрабатываем новый файл (handleFileChange уже отменяет предыдущую загрузку и сбрасывает состояние)
											handleFileChange(e)
											// Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
											if (e.target) {
												e.target.value = ''
											}
										}}
										accept={getFileType(file) === 'image' ? 'image/*' : '.mp4,.webm,.mov,.avi,.mkv,.wmv,.m4v,.flv'}
										className='hidden'
									/>
									<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' />
									</svg>
								</label>
								{/* Кнопка закрытия */}
								<button
									type='button'
									className='flex-shrink-0 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 active:bg-slate-700/70 text-gray-400 hover:text-white transition-colors touch-manipulation'
									onClick={() => {
										// Отменяем загрузку если она идет
										if (uploadXhrRef.current) {
											uploadXhrRef.current.abort()
											uploadXhrRef.current = null
										}
										// Очищаем состояние
										setFile(null)
										setFilePreview(null)
										setUploadedFileId(null)
										setUploadProgress(0)
										setVideoPlaying(false)
										setUploading(false)
										setImageRotation(0)
										setCaption('')
										setShowCaptionEmojiPicker(false)
										currentUploadingFileRef.current = null
										if (videoPreviewRef.current) {
											videoPreviewRef.current.pause()
											videoPreviewRef.current.currentTime = 0
										}
										if (fileInputRef.current) {
											fileInputRef.current.value = ''
										}
									}}
									aria-label='Закрыть'
								>
									<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
									</svg>
								</button>
							</div>
						</div>
						
						{/* Предпросмотр файла */}
						<div className='relative bg-slate-900/30'>
							<div 
								className='relative w-full aspect-square max-h-[400px] overflow-hidden bg-slate-900/50 flex items-center justify-center'
								onClick={() => {
									if (getFileType(file) === 'video' && videoPreviewRef.current) {
										if (videoPlaying) {
											videoPreviewRef.current.pause()
											setVideoPlaying(false)
										} else {
											videoPreviewRef.current.play()
											setVideoPlaying(true)
										}
									}
								}}
							>
								{getFileType(file) === 'image' ? (
									<img
										src={filePreview}
										alt='Предпросмотр'
										className='w-full h-full object-contain transition-transform duration-300'
										style={{ transform: `rotate(${imageRotation}deg)` }}
									/>
								) : (
									<>
										<video
											ref={videoPreviewRef}
											src={filePreview}
											className='w-full h-full object-contain'
											controls={videoPlaying}
											muted={false}
											onClick={(e) => e.stopPropagation()}
											onPlay={() => setVideoPlaying(true)}
											onPause={() => setVideoPlaying(false)}
										/>
										{!videoPlaying && (
											<div className='absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer'>
												<div className='w-16 h-16 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center shadow-2xl hover:scale-110 transition-transform'>
													<svg className='w-8 h-8 text-white ml-1' fill='currentColor' viewBox='0 0 24 24'>
														<path d='M8 5v14l11-7z' />
													</svg>
												</div>
											</div>
										)}
									</>
								)}
								
								{/* Кнопки действий поверх предпросмотра */}
								{!uploading && (
									<div className='absolute top-3 right-3 flex gap-2'>
									{getFileType(file) === 'image' && (
										<button
											type='button'
											onClick={(e) => {
												e.stopPropagation()
												setImageRotation(prev => (prev + 90) % 360)
											}}
											className='w-9 h-9 rounded-xl bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors shadow-lg'
											aria-label='Повернуть изображение'
											title='Повернуть изображение'
										>
											<svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
											</svg>
										</button>
									)}
									</div>
								)}
							</div>
							
							{/* Статус-бар загрузки - расширенный */}
							<div className='px-4 py-3 bg-slate-900/50 border-t border-slate-700/50'>
								{/* Информация о файле */}
								<div className='flex items-center justify-between mb-2'>
									<div className='flex-1 min-w-0'>
										<div className='text-slate-200 text-sm font-medium truncate'>
											{file.name}
										</div>
										<div className='text-gray-400 text-xs mt-0.5'>
											{formatFileSize(file.size)}
										</div>
									</div>
									{uploading && (
										<div className='flex items-center gap-2 flex-shrink-0 ml-3'>
											<svg className='animate-spin w-4 h-4 text-emerald-400' fill='none' viewBox='0 0 24 24'>
												<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
												<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
											</svg>
											<span className='text-emerald-400 text-sm font-medium'>{Math.round(uploadProgress)}%</span>
										</div>
									)}
									{!uploading && uploadedFileId && (
										<div className='flex items-center gap-1 flex-shrink-0 ml-3 text-emerald-400'>
											<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
											</svg>
											<span className='text-xs font-medium'>Готово</span>
										</div>
									)}
								</div>
								
								{/* Прогресс-бар */}
								<div className='w-full bg-slate-700/40 rounded-full h-2 overflow-hidden mb-2'>
									<div
										className='h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-sm'
										style={{ width: `${uploadProgress}%` }}
									/>
								</div>
								
								{/* Текстовый статус загрузки */}
								{uploading && (
									<div className='text-xs text-emerald-400 font-medium flex items-center gap-1.5'>
										<svg className='animate-spin w-3 h-3' fill='none' viewBox='0 0 24 24'>
											<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
											<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
										</svg>
										<span>Загрузка файла: {Math.round(uploadProgress)}%</span>
									</div>
								)}
								{!uploading && uploadedFileId && (
									<div className='text-xs text-emerald-400 font-medium flex items-center gap-1.5'>
										<svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
										</svg>
										<span>Файл загружен и готов к отправке</span>
									</div>
								)}
								{!uploading && !uploadedFileId && uploadProgress === 0 && (
									<div className='text-xs text-gray-400 flex items-center gap-1.5'>
										<svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
										</svg>
										<span>Ожидание начала загрузки...</span>
									</div>
								)}
							</div>
						</div>
						
						{/* Поле ввода подписи к файлу */}
						<div className='px-4 py-3 border-t border-slate-700/50 bg-slate-900/30 relative'>
							<div className='flex items-center gap-2'>
								<textarea
									ref={captionTextareaRef}
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder='Добавьте подпись к файлу...'
									rows={2}
									className='flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white text-sm placeholder-gray-500 focus:border-emerald-400/60 focus:outline-none focus:bg-slate-800/80 resize-none custom-scrollbar transition-all duration-200'
									disabled={sending}
									style={{
										minHeight: '44px',
										maxHeight: '100px',
										lineHeight: '1.5',
									}}
									onKeyDown={(e) => {
										// Enter без Shift - отправка (если файл загружен)
										if (e.key === 'Enter' && !e.shiftKey && uploadedFileId && !uploading && !sending) {
											e.preventDefault()
											const originalMessage = message
											setMessage(caption.trim())
											setTimeout(async () => {
												await handleSubmit(new Event('submit') as any)
												setMessage(originalMessage)
											}, 10)
										}
									}}
								/>
								{/* Кнопка эмодзи для подписи - отдельная */}
								<button
									type='button'
									onClick={() => setShowCaptionEmojiPicker(prev => !prev)}
									className={`flex-shrink-0 w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-700/60 hover:bg-slate-700/80 active:bg-slate-700/90 text-lg transition-colors touch-manipulation ${
										showCaptionEmojiPicker ? 'bg-emerald-500/20 border border-emerald-400/60' : ''
									}`}
									disabled={sending}
									aria-label='Эмодзи для подписи'
								>
									😊
								</button>
							</div>
							{/* Счетчик символов */}
							<div className='mt-1.5 text-xs text-gray-500 text-right'>
								{caption.length > 0 && `${caption.length} символов`}
							</div>
							
							{/* Отдельный эмодзи-пикер для подписи */}
							{showCaptionEmojiPicker && typeof window !== 'undefined' && createPortal(
								<>
									{/* Overlay для закрытия при клике вне */}
									<div
										className='fixed inset-0 z-[10000] bg-transparent'
										onClick={() => setShowCaptionEmojiPicker(false)}
									/>
									{/* Эмодзи пикер */}
									<div
										className='fixed z-[10001]'
							style={{
								bottom: isMobile ? '250px' : '200px',
								right: isMobile ? '10px' : '20px',
								left: isMobile ? '10px' : 'auto',
								width: isMobile ? 'calc(100vw - 20px)' : '280px',
								maxWidth: 'calc(100vw - 20px)',
							}}
										onClick={(e) => e.stopPropagation()}
									>
										<div className='bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl p-2 animate-scaleFadeIn'>
											{/* Компактный список эмодзи со скроллом */}
											<div 
												className='overflow-y-auto custom-scrollbar'
												style={{ 
													maxHeight: isMobile ? '200px' : '280px',
													WebkitOverflowScrolling: 'touch'
												}}
											>
												<div className='grid grid-cols-7 sm:grid-cols-8 gap-1.5 sm:gap-2'>
													{/* Все популярные эмодзи */}
													{['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🤔', '👎', '😊', '😍', '🤣', '😱', '😭', '🤗', '🙏', '💪', '🎊', '✅', '❌', '⭐', '💯', '💖', '💕', '🤝', '🙌', '👌', '🤯', '🥳', '😎', '🤩', '😇', '🎯', '🚀', '👀', '🔥', '💯', '✨', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎮', '🎯', '🎲', '🎳', '🎸', '🎺', '🎻', '🥁', '🎹', '🎼', '🎵', '🎶'].map((emoji) => (
														<button
															key={emoji}
															onClick={(e) => {
																e.stopPropagation()
																const textarea = captionTextareaRef.current
																if (textarea) {
																	const start = textarea.selectionStart || 0
																	const end = textarea.selectionEnd || 0
																	const textBefore = caption.substring(0, start)
																	const textAfter = caption.substring(end)
																	setCaption(textBefore + emoji + textAfter)
																	
																	// Устанавливаем курсор после вставленного emoji
																	setTimeout(() => {
																		textarea.focus()
																		textarea.setSelectionRange(start + emoji.length, start + emoji.length)
																	}, 0)
																} else {
																	setCaption(prev => prev + emoji)
																}
																setShowCaptionEmojiPicker(false)
															}}
															className='w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-gray-700/50 active:bg-gray-700/70 flex items-center justify-center text-lg sm:text-xl transition-all hover:scale-125 active:scale-95 touch-manipulation'
															aria-label={`Эмодзи ${emoji}`}
														>
															{emoji}
														</button>
													))}
												</div>
											</div>
										</div>
									</div>
								</>,
								document.body
							)}
						</div>
						
						{/* Футер с действиями */}
						<div className='px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 border-t border-slate-700/50'>
							<button
								type='button'
								onClick={() => {
									// Отменяем загрузку если она идет
									if (uploadXhrRef.current) {
										uploadXhrRef.current.abort()
										uploadXhrRef.current = null
									}
									// Очищаем состояние
									setFile(null)
									setFilePreview(null)
									setUploadedFileId(null)
									setUploadProgress(0)
									setVideoPlaying(false)
									setUploading(false)
									setImageRotation(0)
									setCaption('')
									setShowCaptionEmojiPicker(false)
									currentUploadingFileRef.current = null
									if (videoPreviewRef.current) {
										videoPreviewRef.current.pause()
										videoPreviewRef.current.currentTime = 0
									}
									if (fileInputRef.current) {
										fileInputRef.current.value = ''
									}
								}}
								className='px-4 py-2.5 sm:py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 active:bg-slate-700/80 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'
								disabled={sending}
							>
								Отмена
							</button>
							<button
								type='button'
								onClick={async (e) => {
									if (!uploadedFileId || sending) return
									
									// Убеждаемся, что caption - это строка перед передачей
									const captionText = typeof caption === 'string' ? caption : String(caption || '')
									// Отправляем подпись напрямую в handleSubmit
									await handleSubmit(e, captionText.trim() || '')
									// После успешной отправки модальное окно закроется через handleSubmit
									setCaption('')
									setShowCaptionEmojiPicker(false)
								}}
								disabled={!uploadedFileId || uploading || sending}
								className='px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-500 active:from-emerald-600 active:to-emerald-700 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:hover:shadow-none touch-manipulation'
							>
								{sending ? (
									<span className='flex items-center gap-2'>
										<svg className='animate-spin w-4 h-4' fill='none' viewBox='0 0 24 24'>
											<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
											<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
										</svg>
										Отправка...
									</span>
								) : (
									'Отправить'
								)}
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}
			
			{/* Компактный индикатор для документов (не изображения/видео) */}
			{file && (!filePreview || (getFileType(file) !== 'image' && getFileType(file) !== 'video')) && (
				<div className='mb-2 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-lg animate-scaleFadeIn'>
					<div className='flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700/60 flex items-center justify-center'>
						<svg className='w-5 h-5 text-emerald-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
						</svg>
					</div>
						<div className='flex-1 min-w-0 overflow-hidden'>
						<div className='text-slate-100 truncate font-medium text-sm leading-tight'>
							{file.name}
							</div>
						<div className='flex items-center gap-2 mt-0.5'>
							<span className='text-gray-400 text-xs'>
								{formatFileSize(file.size)}
								</span>
							{uploading && (
								<span className='text-emerald-400 text-xs font-medium'>
									{Math.round(uploadProgress)}%
								</span>
							)}
							</div>
						{(uploading || uploadProgress > 0) && (
							<div className='mt-1.5 w-full bg-slate-700/40 rounded-full h-1 overflow-hidden'>
								<div
									className='h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-200'
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
						)}
						</div>
					<div className='flex items-center gap-1.5'>
						{uploading ? (
							<div className='w-6 h-6 flex items-center justify-center'>
								<svg className='animate-spin w-4 h-4 text-emerald-400' fill='none' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
								</svg>
					</div>
						) : (
					<button
						type='button'
						onClick={() => {
									if (uploadXhrRef.current) {
										uploadXhrRef.current.abort()
										uploadXhrRef.current = null
									}
							setFile(null)
									setFilePreview(null)
									setUploadedFileId(null)
									setUploadProgress(0)
									setVideoPlaying(false)
									setUploading(false)
									currentUploadingFileRef.current = null
							if (fileInputRef.current) {
								fileInputRef.current.value = ''
							}
						}}
								className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-200'
						aria-label='Удалить файл'
					>
								<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
								</svg>
					</button>
						)}
					</div>
				</div>
			)}

			<div className='flex items-center gap-2.5'>
				{/* Кнопка прикрепления файла */}
				<label 
					className='cursor-pointer flex-shrink-0 w-11 h-11 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-700/80 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button touch-manipulation transition-all duration-200 active:scale-95'
					aria-label="Прикрепить файл"
				>
					<input
						ref={fileInputRef}
						type='file'
						onChange={handleFileChange}
						className='hidden'
						accept='.mp4,.webm,.mov,.avi,.mkv,.wmv,.m4v,.flv,image/*,.pdf,.doc,.docx,.txt'
					/>
					<svg
						className='w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors duration-200'
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

				{/* Эмодзи пикер через Portal - стильное всплывающее окно без размытия фона */}
				{showEmojiPicker && typeof window !== 'undefined' && createPortal(
					<>
						{/* Overlay для закрытия при клике вне - прозрачный, без размытия */}
						<div
							className='fixed inset-0 z-[9998] bg-transparent'
							onClick={() => setShowEmojiPicker(false)}
						/>
						{/* Контейнер эмодзи пикера - компактный как реакция, но со скроллом */}
						<div
							className='fixed z-[9999]'
							style={{
								bottom: isMobile ? '140px' : '80px',
								right: isMobile ? '10px' : '20px',
								left: isMobile ? '10px' : 'auto',
								width: isMobile ? 'calc(100vw - 20px)' : '280px',
								maxWidth: 'calc(100vw - 20px)',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div className='bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl p-2 animate-scaleFadeIn'>
								{/* Компактный список эмодзи со скроллом */}
								<div 
									className='overflow-y-auto custom-scrollbar'
									style={{ 
										maxHeight: isMobile ? '200px' : '280px',
										WebkitOverflowScrolling: 'touch'
									}}
								>
									<div className='grid grid-cols-7 sm:grid-cols-8 gap-1 sm:gap-1.5'>
										{/* Все популярные эмодзи */}
										{['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🤔', '👎', '😊', '😍', '🤣', '😱', '😭', '🤗', '🙏', '💪', '🎊', '✅', '❌', '⭐', '💯', '💖', '💕', '🤝', '🙌', '👌', '🤯', '🥳', '😎', '🤩', '😇', '🎯', '🚀', '👀', '🔥', '💯', '✨', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎮', '🎯', '🎲', '🎳', '🎸', '🎺', '🎻', '🥁', '🎹', '🎼', '🎵', '🎶'].map((emoji) => (
											<button
												key={emoji}
												onClick={(e) => {
													e.stopPropagation()
													const isCaptionMode = !!(file && filePreview && (getFileType(file) === 'image' || getFileType(file) === 'video'))
													// Имитируем структуру EmojiClickData
													handleEmojiClick({ emoji, unified: '' }, isCaptionMode)
													setShowEmojiPicker(false)
												}}
												className='w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-gray-700/50 active:bg-gray-700/70 flex items-center justify-center text-xl sm:text-2xl transition-all hover:scale-125 active:scale-95 touch-manipulation'
												aria-label={`Эмодзи ${emoji}`}
											>
												{emoji}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
					</>,
					document.body
					)}

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
						placeholder='Напишите сообщение...'
						rows={1}
						className='w-full px-4 py-3 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-2xl text-white text-base placeholder-gray-500 focus:border-emerald-400/60 focus:outline-none focus:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-0 resize-none custom-scrollbar shadow-md hover:border-slate-500/70 transition-all duration-200 ease-out'
						disabled={sending}
						style={{ 
							height: '44px',
							minHeight: '44px', 
							maxHeight: '150px',
							lineHeight: '1.5',
							overflow: 'auto',
							transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
							outline: 'none',
							outlineOffset: '0',
							boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
							WebkitAppearance: 'none',
							appearance: 'none',
							fontFamily: "'Inter', 'Poppins', system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif"
						} as React.CSSProperties}
					/>
				</div>

				{/* Кнопка эмоджи */}
				<div className='relative' ref={emojiPickerRef}>
					<button
						ref={emojiButtonRef}
						type='button'
						onClick={() => setShowEmojiPicker(prev => !prev)}
						className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border ${
							showEmojiPicker ? 'border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'border-slate-600/50'
						} hover:border-emerald-400/50 hover:bg-slate-700/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button text-2xl touch-manipulation transition-all duration-200 active:scale-95`}
						style={{ minHeight: '44px', minWidth: '44px' }}
						aria-label="Эмодзи"
					>
						😊
					</button>
				</div>

				{/* Кнопка отправки */}
				<button
					type='submit'
					disabled={!!(sending || (!message.trim() && !uploadedFileId) || uploading || (file && !uploadedFileId))}
					className='flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ios-button shadow-md hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center touch-manipulation border border-emerald-400/30 transition-all duration-200'
					style={{ minHeight: '44px', minWidth: '44px' }}
					title={uploading ? 'Загрузка файла...' : sending ? 'Отправка...' : (file && !uploadedFileId) ? 'Ожидание загрузки файла' : 'Отправить'}
				>
					{sending ? (
						<svg
							className='animate-spin w-5 h-5'
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
							className='w-5 h-5'
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
