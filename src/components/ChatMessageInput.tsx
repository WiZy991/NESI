'use client'

import { useUser } from '@/context/UserContext'
import { ChevronDown, FileText, Mic, Send, X, Download, RotateCw, Trash2, Smile } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MessageTemplatesModal from './MessageTemplatesModal'
import VoicePlayer from './VoicePlayer'
import VideoPlayer from './VideoPlayer'

type MessageInputProps = {
	chatType: 'private' | 'task' | 'team'
	otherUserId?: string
	taskId?: string
	teamId?: string
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
	showTemplatesButton?: boolean
}

type TypingContext = {
	recipientId: string
	chatType: 'private' | 'task' | 'team'
	chatId: string
	taskId?: string
	teamId?: string
}

const emojiList = [
	'👍',
	'❤️',
	'😂',
	'😮',
	'😢',
	'🔥',
	'👏',
	'🎉',
	'🤔',
	'👎',
	'😊',
	'😍',
	'🤣',
	'😱',
	'😭',
	'🤗',
	'🙏',
	'💪',
	'🎊',
	'✅',
	'❌',
	'⭐',
	'💯',
	'💕',
	'🤝',
	'🙌',
	'👌',
	'🤯',
	'🥳',
	'😎',
	'🤩',
	'😇',
	'🎯',
	'🚀',
	'👀',
	'✨',
	'🥰',
	'😏',
	'😴',
	'🤤',
	'🤬',
	'🤡',
	'🫡',
	'🤖',
	'💩',
	'🧠',
	'🫶',
	'🤌',
	'👏',
	'👆',
	'👇',
	'👉',
	'👈',
	'✌️',
	'🤞',
	'🤟',
	'🖖',
	'🤙',
	'👌',
]

type VoiceMetadata = {
	duration: number
	waveform: number[]
}

type AttachmentKind = 'image' | 'video' | 'document' | 'audio' | 'voice'

type ComposerAttachment = {
	id: string
	file: File
	name: string
	size: number
	kind: AttachmentKind
	previewUrl: string | null
	uploadedFileId: string | null
	uploadProgress: number
	status: 'uploading' | 'ready' | 'error'
	rotation?: number
	voiceMetadata?: VoiceMetadata | null
	audioPreviewUrl?: string | null
	waveform?: number[]
	caption?: string
	compress?: boolean
}

const WAVEFORM_SAMPLES = 48

async function extractWaveform(
	blob: Blob,
	sampleCount: number = WAVEFORM_SAMPLES
): Promise<VoiceMetadata> {
	const audioContext = new AudioContext()
	const arrayBuffer = await blob.arrayBuffer()
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

	const rawData = audioBuffer.getChannelData(0)
	const blockSize = Math.floor(rawData.length / sampleCount)

	const waveform: number[] = []
	for (let i = 0; i < sampleCount; i++) {
		let sum = 0
		for (let j = 0; j < blockSize; j++) {
			const sample = rawData[i * blockSize + j]
			sum += Math.abs(sample)
		}
		waveform.push(Math.min(1, sum / blockSize))
	}

	audioContext.close().catch(() => undefined)

	return {
		duration: audioBuffer.duration,
		waveform: waveform.length > 0 ? waveform : [0.1],
	}
}

function formatDuration(seconds: number) {
	const totalSeconds = Math.max(0, Math.round(seconds))
	const mins = Math.floor(totalSeconds / 60)
	const secs = totalSeconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MessageInput({
	chatType,
	otherUserId,
	taskId,
	teamId,
	onMessageSent,
	replyTo,
	onCancelReply,
	showTemplatesButton = true,
}: MessageInputProps) {
	const { token } = useUser()
	const [message, setMessage] = useState('')
	const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
	const [sending, setSending] = useState(false)
	const [isTyping, setIsTyping] = useState(false)
	const [showEmojiPicker, setShowEmojiPicker] = useState(false)
	const [showTemplatesModal, setShowTemplatesModal] = useState(false)
	const [isChatDisabled, setIsChatDisabled] = useState(false)
	const [disputeMessage, setDisputeMessage] = useState<string | null>(null)
	const [voiceMetadata, setVoiceMetadata] = useState<VoiceMetadata | null>(null)
	const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const [voiceCurrentTime, setVoiceCurrentTime] = useState(0)
	const [isVoicePlaying, setIsVoicePlaying] = useState(false)
	const [voiceDuration, setVoiceDuration] = useState(0)
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
	const [selectedMicrophoneId, setSelectedMicrophoneId] =
		useState<string>('default')
	const [showSendMenu, setShowSendMenu] = useState(false)
	const [preferSendMode, setPreferSendMode] = useState(true)
	const [previewModalAttachment, setPreviewModalAttachment] = useState<ComposerAttachment | null>(null)
	const [previewModalAttachments, setPreviewModalAttachments] = useState<ComposerAttachment[]>([])
	const [previewModalCurrentIndex, setPreviewModalCurrentIndex] = useState(0)
	const [previewModalCaption, setPreviewModalCaption] = useState('')
	const [previewModalCompress, setPreviewModalCompress] = useState(true)
	const [previewModalShowEmojiPicker, setPreviewModalShowEmojiPicker] = useState(false)
	const pasteDebounceRef = useRef<NodeJS.Timeout | null>(null)
	const pastedFilesRef = useRef<Set<string>>(new Set())
	const handleFileChangeRef = useRef<((input: React.ChangeEvent<HTMLInputElement> | File | null, options?: { voice?: VoiceMetadata | null; previewUrl?: string | null }) => Promise<void>) | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const emojiPickerRef = useRef<HTMLDivElement>(null)
	const emojiButtonRef = useRef<HTMLButtonElement>(null)
	const videoPreviewRef = useRef<HTMLVideoElement>(null)
	const attachmentUploadsRef = useRef<Map<string, XMLHttpRequest>>(new Map())
	const attachmentsRef = useRef<ComposerAttachment[]>([])
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const sendMenuRef = useRef<HTMLDivElement | null>(null)
	const sendMenuButtonRef = useRef<HTMLButtonElement | null>(null)

	const typingContext = useMemo<TypingContext | null>(() => {
		if (chatType === 'team') {
			if (!teamId) return null
			return {
				recipientId: '', // Для командных чатов не нужен recipientId
				chatType,
				chatId: `team_${teamId}`,
				teamId,
			}
		}

		if (!otherUserId) return null

		if (chatType === 'task') {
			if (!taskId) return null
			return {
				recipientId: otherUserId,
				chatType,
				chatId: `task_${taskId}`,
				taskId,
			}
		}

		return {
			recipientId: otherUserId,
			chatType,
			chatId: `private_${otherUserId}`,
		}
	}, [chatType, otherUserId, taskId, teamId])

	const previousTypingContextRef = useRef<TypingContext | null>(null)

	const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640
	const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 360

	const clearVoiceState = useCallback(() => {
		setVoiceMetadata(null)
		setIsVoicePlaying(false)
		setRecordingTime(0)
		setVoiceCurrentTime(0)
		setVoiceDuration(0)
		setAudioPreviewUrl(prev => {
			if (prev) {
				URL.revokeObjectURL(prev)
			}
			return null
		})
		if (audioRef.current) {
			audioRef.current.pause()
			audioRef.current = null
		}
	}, [])

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
			textarea.addEventListener(event, removeOutline, true)
		})

		// MutationObserver для отслеживания изменений стилей
		const observer = new MutationObserver(() => {
			removeOutline()
		})
		observer.observe(textarea, {
			attributes: true,
			attributeFilter: ['style', 'class'],
		})

		return () => {
			events.forEach(event => {
				textarea.removeEventListener(event, removeOutline, true)
			})
			observer.disconnect()
		}
	}, [])

	// Функция для отправки события набора
	const sendTypingEvent = useCallback(
		async (typing: boolean, contextOverride?: TypingContext | null) => {
			if (!token) return

			const context = contextOverride ?? typingContext
			if (!context) return

			try {
				await fetch('/api/typing', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						recipientId: context.recipientId,
						chatType: context.chatType,
						chatId: context.chatId,
						taskId: context.taskId,
						isTyping: typing,
					}),
					keepalive: true,
				})
			} catch (error) {
				// Игнорируем ошибки отправки события набора (не критично)
			}
		},
		[token, typingContext]
	)

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
		// Если пользователь начал вводить текст, показываем кнопку отправки
		if (value.trim().length > 0) {
			setPreferSendMode(true)
		}

		if (!typingContext) {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = null
			}
			return
		}

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

	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleOpenTemplates = () => {
			setShowTemplatesModal(true)
		}

		window.addEventListener('openMessageTemplates', handleOpenTemplates)
		return () => {
			window.removeEventListener('openMessageTemplates', handleOpenTemplates)
		}
	}, [])

	useEffect(() => {
		const previousContext = previousTypingContextRef.current

		if (
			previousContext &&
			(!typingContext ||
				previousContext.chatId !== typingContext.chatId ||
				previousContext.recipientId !== typingContext.recipientId)
		) {
			if (isTyping) {
				sendTypingEvent(false, previousContext)
				setIsTyping(false)
			}
		}

		previousTypingContextRef.current = typingContext
	}, [typingContext, isTyping, sendTypingEvent])

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}

			const previousContext = previousTypingContextRef.current
			if (previousContext && isTyping) {
				sendTypingEvent(false, previousContext)
			}
		}
	}, [isTyping, sendTypingEvent])

	useEffect(() => {
		const handleBeforeUnload = () => {
			const previousContext = previousTypingContextRef.current
			if (previousContext && isTyping) {
				sendTypingEvent(false, previousContext)
			}
		}

		const handleVisibilityChange = () => {
			if (document.hidden) {
				const previousContext = previousTypingContextRef.current
				if (previousContext && isTyping) {
					sendTypingEvent(false, previousContext)
					setIsTyping(false)
				}
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [isTyping, sendTypingEvent])

	const refreshMicrophones = useCallback(async () => {
		if (!navigator.mediaDevices?.enumerateDevices) {
			setAudioDevices([])
			return
		}

		try {
			let devices = await navigator.mediaDevices.enumerateDevices()
			let audioInputs = devices.filter(device => device.kind === 'audioinput')

			if (audioInputs.length === 0) {
				try {
					const tempStream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					})
					const refreshed = await navigator.mediaDevices.enumerateDevices()
					audioInputs = refreshed.filter(device => device.kind === 'audioinput')
					tempStream.getTracks().forEach(track => track.stop())
				} catch (error) {
					console.error('Не удалось получить доступ к микрофону:', error)
				}
			}

			setAudioDevices(audioInputs)
			if (
				audioInputs.length > 0 &&
				selectedMicrophoneId !== 'default' &&
				!audioInputs.some(device => device.deviceId === selectedMicrophoneId)
			) {
				setSelectedMicrophoneId(audioInputs[0].deviceId || 'default')
			}
		} catch (error) {
			console.error('Ошибка получения списка микрофонов:', error)
			setAudioDevices([])
		}
	}, [selectedMicrophoneId])

	// Проверяем статус задачи и наличие решенного спора
	useEffect(() => {
		if (chatType !== 'task' || !taskId || !token) {
			setIsChatDisabled(false)
			setDisputeMessage(null)
			return
		}

		const checkTaskStatus = async () => {
			try {
				// Получаем информацию о задаче и споре
				const [taskRes, disputeRes] = await Promise.all([
					fetch(`/api/tasks/${taskId}`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`/api/disputes?taskId=${taskId}`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				])

				if (taskRes.ok) {
					const taskData = await taskRes.json()
					const task = taskData?.task

					// Проверяем статус задачи
					if (task?.status === 'completed') {
						// Проверяем, есть ли решенный спор
						if (disputeRes.ok) {
							const disputeData = await disputeRes.json()
							const dispute = disputeData?.dispute
							
							if (dispute?.status === 'resolved') {
								setIsChatDisabled(true)
								if (dispute.adminDecision === 'executor') {
									setDisputeMessage('Спор решен в пользу исполнителя. Чат закрыт.')
								} else if (dispute.adminDecision === 'customer') {
									setDisputeMessage('Спор решен в пользу заказчика. Чат закрыт.')
								} else {
									setDisputeMessage('Спор решен. Чат закрыт.')
								}
							} else {
								// Задача завершена без спора
								setIsChatDisabled(true)
								setDisputeMessage('Задача завершена. Чат закрыт.')
							}
						} else {
							// Задача завершена, спора нет
							setIsChatDisabled(true)
							setDisputeMessage('Задача завершена. Чат закрыт.')
						}
					} else {
						// Проверяем только спор, если задача не завершена
						if (disputeRes.ok) {
							const disputeData = await disputeRes.json()
							const dispute = disputeData?.dispute
							if (dispute?.status === 'resolved') {
								setIsChatDisabled(true)
								if (dispute.adminDecision === 'executor') {
									setDisputeMessage('Спор решен в пользу исполнителя. Чат закрыт.')
								} else if (dispute.adminDecision === 'customer') {
									setDisputeMessage('Спор решен в пользу заказчика. Чат закрыт.')
								} else {
									setDisputeMessage('Спор решен. Чат закрыт.')
								}
							} else {
								setIsChatDisabled(false)
								setDisputeMessage(null)
							}
						} else {
							setIsChatDisabled(false)
							setDisputeMessage(null)
						}
					}
				}
			} catch (err) {
				console.error('Ошибка проверки статуса задачи:', err)
			}
		}

		checkTaskStatus()
	}, [chatType, taskId, token])

	useEffect(() => {
		refreshMicrophones()
	}, [refreshMicrophones])

	// Закрытие модального окна предпросмотра по Escape
	useEffect(() => {
		if (!previewModalAttachment) return

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setPreviewModalAttachment(null)
			}
		}

		const handleDocumentPaste = (e: ClipboardEvent) => {
			// Обрабатываем paste даже когда модальное окно открыто
			const items = e.clipboardData?.items
			if (!items || !token) return
			
			// Проверяем, есть ли изображения
			const hasImages = Array.from(items).some(item => 
				item.kind === 'file' && item.type.startsWith('image/')
			)
			
			if (hasImages) {
				e.preventDefault()
				e.stopPropagation()
				
				// Вызываем handlePaste напрямую с данными из события
				const imageFiles: File[] = []
				const baseTimestamp = Date.now()

				// Собираем все изображения из буфера обмена
				for (let i = 0; i < items.length; i++) {
					const item = items[i]
					if (item.kind === 'file' && item.type.startsWith('image/')) {
						const originalFile = item.getAsFile()
						if (!originalFile) continue

						const uniqueTimestamp = baseTimestamp + i
						const fileId = `${originalFile.size}-${originalFile.name || 'screenshot'}-${uniqueTimestamp}-${i}`
						
						if (pastedFilesRef.current.has(fileId)) {
							continue
						}
						pastedFilesRef.current.add(fileId)

						const fileName =
							originalFile.name && originalFile.name.trim().length > 0
								? originalFile.name
								: `screenshot-${uniqueTimestamp}-${imageFiles.length + 1}.png`

						const normalizedFile = new File([originalFile], fileName, {
							type: originalFile.type,
						})

						imageFiles.push(normalizedFile)
					}
				}

				if (imageFiles.length > 0) {
					// Добавляем все файлы через ref
					imageFiles.forEach((file, index) => {
						setTimeout(() => {
							if (handleFileChangeRef.current) {
								handleFileChangeRef.current(file)
							}
						}, index * 50)
					})
				}
			}
		}

		window.addEventListener('keydown', handleEscape)
		document.addEventListener('paste', handleDocumentPaste, true)
		
		return () => {
			window.removeEventListener('keydown', handleEscape)
			document.removeEventListener('paste', handleDocumentPaste, true)
		}
	}, [previewModalAttachment, token])

	// Закрытие меню выбора при клике вне его
	useEffect(() => {
		if (!showSendMenu) return

		const handleClickOutside = (event: MouseEvent | TouchEvent) => {
			if (
				sendMenuRef.current &&
				sendMenuButtonRef.current &&
				!sendMenuRef.current.contains(event.target as Node) &&
				!sendMenuButtonRef.current.contains(event.target as Node)
			) {
				setShowSendMenu(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('touchstart', handleClickOutside)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('touchstart', handleClickOutside)
		}
	}, [showSendMenu])

	useEffect(() => {
		if (!audioPreviewUrl) {
			setIsVoicePlaying(false)
			setVoiceCurrentTime(0)
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current = null
			}
			return
		}

		const audioElement = new Audio(audioPreviewUrl)
		audioRef.current = audioElement

		const handleLoaded = () => {
			const duration = audioElement.duration || voiceMetadata?.duration || 0
			if (duration) {
				setVoiceDuration(duration)
			}
		}

		const handleTimeUpdate = () => {
			setVoiceCurrentTime(audioElement.currentTime)
		}

		const handleEnded = () => {
			setIsVoicePlaying(false)
			setVoiceCurrentTime(audioElement.duration || 0)
			audioElement.currentTime = 0
		}

		audioElement.addEventListener('loadedmetadata', handleLoaded)
		audioElement.addEventListener('timeupdate', handleTimeUpdate)
		audioElement.addEventListener('ended', handleEnded)

		return () => {
			audioElement.pause()
			audioElement.removeEventListener('loadedmetadata', handleLoaded)
			audioElement.removeEventListener('timeupdate', handleTimeUpdate)
			audioElement.removeEventListener('ended', handleEnded)
			audioRef.current = null
		}
	}, [audioPreviewUrl, voiceMetadata])

	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		if (isVoicePlaying) {
			const playPromise = audioElement.play()
			if (playPromise && typeof playPromise.then === 'function') {
				playPromise.catch(() => {
					setIsVoicePlaying(false)
				})
			}
		} else {
			audioElement.pause()
		}
	}, [isVoicePlaying])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (isChatDisabled) {
			alert(disputeMessage || 'Чат закрыт. Отправка сообщений недоступна.')
			return
		}

		const trimmedContent = message.trim()
		const readyAttachments = attachments.filter(att => att.status === 'ready')
		const pendingAttachments = attachments.filter(
			att => att.status === 'uploading'
		)
		const erroredAttachments = attachments.filter(att => att.status === 'error')

		if (pendingAttachments.length > 0) {
			alert('Дождитесь завершения загрузки вложений перед отправкой сообщения')
			return
		}

		if (erroredAttachments.length > 0) {
			alert('Удалите или перезагрузите вложения с ошибкой перед отправкой')
			return
		}

		if (readyAttachments.length === 0 && trimmedContent.length === 0) {
			return
		}

		if (isTyping) {
			setIsTyping(false)
			sendTypingEvent(false)
		}

		setSending(true)

		const url =
			chatType === 'private'
				? `/api/messages/send`
				: chatType === 'team' && teamId
					? `/api/teams/${teamId}/chat`
					: `/api/tasks/${taskId}/messages`
		const baseHeaders: HeadersInit = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		}

		let replyIncluded = false

		const sendRequest = async (body: any) => {
			const res = await fetch(url, {
				method: 'POST',
				headers: baseHeaders,
				body: JSON.stringify(body),
			})

			const text = await res.text()
			if (!text || text.trim() === '') {
				throw new Error('Пустой ответ сервера')
			}

			let data: any
			try {
				data = JSON.parse(text)
			} catch (parseError) {
				throw new Error('Неверный формат ответа от сервера')
			}

			if (!res.ok) {
				const errorText =
					data?.error ||
					data?.details ||
					data?.message ||
					res.statusText ||
					'Неизвестная ошибка'
				throw new Error(
					typeof errorText === 'string' ? errorText : JSON.stringify(errorText)
				)
			}

			const newMessage = chatType === 'private' 
				? data 
				: chatType === 'team'
					? data.message || data
					: data.message || data
			onMessageSent(newMessage)
		}

		try {
			const queue: Array<{ attachment?: ComposerAttachment; content: string }> =
				[]

			if (readyAttachments.length > 0) {
				readyAttachments.forEach((attachment, index) => {
					// Используем подпись из attachment, если есть, иначе текст сообщения для первого вложения
					const content = attachment.caption || (index === 0 ? trimmedContent : '')
					queue.push({ attachment, content })
				})
			} else if (trimmedContent.length > 0) {
				queue.push({ content: trimmedContent })
			}

			for (const item of queue) {
				const body: any = {}

				if (chatType === 'private') {
					body.recipientId = otherUserId
				}

				if (!replyIncluded && replyTo?.id) {
					body.replyToId = replyTo.id
					replyIncluded = true
				}

				if (item.attachment) {
					const attachment = item.attachment
					if (!attachment.uploadedFileId) {
						throw new Error('Вложение не загружено. Повторите попытку.')
					}

					body.fileId = attachment.uploadedFileId

					if (attachment.kind === 'voice') {
						const meta = attachment.voiceMetadata || {
							duration: 0,
							waveform: [],
						}
						body.content = JSON.stringify({
							type: 'voice',
							duration: meta.duration || 0,
							waveform: meta.waveform || [],
							text:
								item.content.trim().length > 0
									? item.content.trim()
									: undefined,
						})
					} else {
						body.content = item.content.trim()
					}
				} else {
					if (item.content.trim().length === 0) {
						continue
					}
					body.content = item.content.trim()
				}

				await sendRequest(body)
			}

			// Очистка состояния после успешной отправки всех сообщений
			setMessage('')
			setAttachments([])
			setShowEmojiPicker(false)
			setShowTemplatesModal(false)
			setPreferSendMode(true)
			clearVoiceState()
			attachmentUploadsRef.current.clear()

			if (onCancelReply) {
				onCancelReply()
			}

			if (textareaRef.current) {
				textareaRef.current.style.height = '44px'
			}

			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			if (textareaRef.current) {
				if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
					window.requestAnimationFrame(() => textareaRef.current?.focus())
				} else {
					textareaRef.current.focus()
				}
			}
		} catch (error: any) {
			console.error('Ошибка отправки сообщения:', error)
			alert(
				`Ошибка отправки сообщения: ${
					error?.message || error || 'Неизвестная ошибка'
				}`
			)
		} finally {
			setSending(false)
		}
	}

	// Вспомогательные функции для работы с вложениями
	const createAttachmentId = () =>
		`att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

	const detectAttachmentKind = (file: File): AttachmentKind => {
		const type = file.type
		if (type.startsWith('image/')) return 'image'
		if (type.startsWith('video/')) return 'video'
		if (type.startsWith('audio/')) return 'audio'
		return 'document'
	}

	const uploadAttachment = useCallback(
		(file: File, attachmentId: string) => {
			if (!token) {
				setAttachments(prev =>
					prev.map(att =>
						att.id === attachmentId
							? { ...att, status: 'error', uploadProgress: 0 }
							: att
					)
				)
				return
			}

			const formData = new FormData()
			formData.append('file', file)

			try {
				const xhr = new XMLHttpRequest()
				attachmentUploadsRef.current.set(attachmentId, xhr)

				xhr.open('POST', '/api/upload/chat-file')
				xhr.setRequestHeader('Authorization', `Bearer ${token}`)
				
				// Увеличиваем таймаут для больших файлов и множественных загрузок
				xhr.timeout = 300000 // 5 минут вместо стандартных 0 (без таймаута)

				xhr.upload.onprogress = event => {
					if (!event.lengthComputable) return
					const progress = Math.round((event.loaded / event.total) * 100)
					setAttachments(prev => {
						const exists = prev.some(att => att.id === attachmentId)
						if (!exists) return prev // Вложение уже удалено

						return prev.map(att =>
							att.id === attachmentId
								? { ...att, uploadProgress: progress }
								: att
						)
					})
				}

				const handleError = (errorMessage?: string, isAborted = false) => {
					// Если загрузка была отменена пользователем, просто удаляем из ref и выходим
					if (isAborted || xhr.readyState === XMLHttpRequest.UNSENT || xhr.status === 0) {
						attachmentUploadsRef.current.delete(attachmentId)
						return
					}

					// Проверяем, что вложение еще существует перед обновлением
					setAttachments(prev => {
						const exists = prev.some(att => att.id === attachmentId)
						if (!exists) {
							// Вложение уже удалено - просто очищаем ref
							attachmentUploadsRef.current.delete(attachmentId)
							return prev
						}

						// Логируем ошибку только если вложение еще существует и это не отмена
						const errorMsg = errorMessage || xhr.statusText || 'Неизвестная ошибка'
						console.error('Ошибка загрузки вложения:', errorMsg)

						return prev.map(att =>
							att.id === attachmentId
								? { ...att, status: 'error', uploadProgress: 0 }
								: att
						)
					})
					attachmentUploadsRef.current.delete(attachmentId)
				}

				xhr.onreadystatechange = () => {
					if (xhr.readyState !== XMLHttpRequest.DONE) return
					
					// Проверяем, не была ли загрузка отменена (status 0 обычно означает отмену)
					if (xhr.status === 0) {
						attachmentUploadsRef.current.delete(attachmentId)
						return
					}

					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const responseText = xhr.responseText || '{}'
							const data = JSON.parse(responseText)
							const uploadedId = data?.id ?? data?.fileId ?? null

							if (!uploadedId) {
								handleError('Сервер не вернул идентификатор файла')
								return
							}

							// Проверяем, что вложение еще существует перед обновлением
							setAttachments(prev => {
								const exists = prev.some(att => att.id === attachmentId)
								if (!exists) return prev // Вложение уже удалено

								return prev.map(att =>
									att.id === attachmentId
										? {
												...att,
												uploadedFileId: uploadedId,
												uploadProgress: 100,
												status: 'ready',
										  }
										: att
								)
							})
						} catch (parseError) {
							handleError(`Ошибка разбора ответа: ${String(parseError)}`)
							return
						} finally {
							attachmentUploadsRef.current.delete(attachmentId)
						}
					} else {
						let errorMessage: string | undefined
						try {
							const errorResponse = JSON.parse(xhr.responseText || '{}')
							errorMessage =
								errorResponse?.error || errorResponse?.message || xhr.statusText
						} catch {
							errorMessage = xhr.statusText
						}
						handleError(errorMessage)
					}
				}

				xhr.onerror = () => {
					// Проверяем, не была ли это ошибка rate limit (429)
					if (xhr.status === 429) {
						handleError('Слишком много загрузок. Подождите немного.')
					} else {
						handleError('Ошибка сети при загрузке файла')
					}
				}
				
				xhr.ontimeout = () => {
					handleError('Превышено время ожидания загрузки файла')
				}

				xhr.onabort = () => {
					// Не показываем ошибку, если загрузка была отменена пользователем
					// Просто очищаем ref
					attachmentUploadsRef.current.delete(attachmentId)
				}

				xhr.send(formData)
			} catch (error) {
				console.error('Непредвиденная ошибка загрузки вложения:', error)
				setAttachments(prev => {
					const exists = prev.some(att => att.id === attachmentId)
					if (!exists) return prev // Вложение уже удалено

					return prev.map(att =>
						att.id === attachmentId
							? { ...att, status: 'error', uploadProgress: 0 }
							: att
					)
				})
				attachmentUploadsRef.current.delete(attachmentId)
			}
		},
		[token]
	)

	const handleFileChange = useCallback(
		async (
			input: React.ChangeEvent<HTMLInputElement> | File | null,
			options: { voice?: VoiceMetadata | null; previewUrl?: string | null } = {}
		) => {
			if (!token) {
				console.warn('handleFileChange: нет токена')
				return
			}

			const collectedFiles: File[] = []

			if (input instanceof File) {
				collectedFiles.push(input)
			} else if (input && 'target' in input) {
				const targetFiles = Array.from(input.target.files ?? [])
				if (targetFiles.length > 0) {
					collectedFiles.push(...targetFiles)
				}

				// Allow selecting the same file again later
				if (input.target) {
					input.target.value = ''
				}
			}

			if (collectedFiles.length === 0) {
				console.warn('handleFileChange: нет файлов для обработки')
				return
			}

			console.log('handleFileChange: обрабатываем', collectedFiles.length, 'файлов')

			collectedFiles.forEach(fileToAttach => {
				const attachmentId = createAttachmentId()
				const kind: AttachmentKind = options.voice
					? 'voice'
					: detectAttachmentKind(fileToAttach)

				const initialAttachment: ComposerAttachment = {
					id: attachmentId,
					file: fileToAttach,
					name: fileToAttach.name,
					size: fileToAttach.size,
					kind,
					previewUrl: options.previewUrl ?? null,
					uploadedFileId: null,
					uploadProgress: 0,
					status: 'uploading',
					rotation: kind === 'image' ? 0 : undefined,
					voiceMetadata: options.voice ?? null,
					audioPreviewUrl: options.previewUrl ?? null,
					waveform: options.voice?.waveform,
				}

				setAttachments(prev => [...prev, initialAttachment])

				if (!options.voice && (kind === 'image' || kind === 'video')) {
					const reader = new FileReader()
					reader.onloadend = () => {
						const result =
							typeof reader.result === 'string' ? reader.result : null
						if (result) {
							setAttachments(prev => {
								const updated = prev.map(att =>
									att.id === attachmentId ? { ...att, previewUrl: result } : att
								)
								// Открываем модальное окно для предпросмотра медиа файлов
								const updatedAttachment = updated.find(att => att.id === attachmentId)
								if (updatedAttachment && (kind === 'image' || kind === 'video')) {
									setTimeout(() => {
										// Фильтруем все медиа файлы (изображения И видео)
										const currentMedia = updated.filter(
											att => (att.kind === 'image' || att.kind === 'video') && att.previewUrl
										)
										
										// Всегда обновляем список вложений в модальном окне
										setPreviewModalAttachments(currentMedia)
										
										// Если модальное окно уже открыто
										if (previewModalAttachment) {
											// Проверяем, является ли добавленное медиа новым (не текущим)
											const isNewMedia = updatedAttachment.id !== previewModalAttachment.id
											
											if (isNewMedia) {
												// Это новое медиа - переходим на него
												const newIndex = currentMedia.findIndex(att => att.id === updatedAttachment.id)
												if (newIndex >= 0) {
													setPreviewModalCurrentIndex(newIndex)
													setPreviewModalAttachment(currentMedia[newIndex])
													setPreviewModalCaption(currentMedia[newIndex].caption || '')
												}
											} else {
												// Это обновление текущего медиа - остаемся на нем, но обновляем данные
												const currentIndex = currentMedia.findIndex(att => att.id === previewModalAttachment.id)
												if (currentIndex >= 0) {
													setPreviewModalCurrentIndex(currentIndex)
													setPreviewModalAttachment(currentMedia[currentIndex])
												}
											}
										} else {
											// Если модальное окно не открыто, открываем его
											if (currentMedia.length === 1) {
												// Первое медиа (изображение или видео)
												setPreviewModalCurrentIndex(0)
												setPreviewModalAttachment(updatedAttachment)
												setPreviewModalCaption(updatedAttachment.caption || '')
												setPreviewModalCompress(updatedAttachment.compress !== false)
											} else {
												// Несколько медиа - открываем с последним добавленным
												const lastIndex = currentMedia.length - 1
												setPreviewModalCurrentIndex(lastIndex)
												setPreviewModalAttachment(currentMedia[lastIndex])
												setPreviewModalCaption(currentMedia[lastIndex].caption || '')
											}
										}
									}, 100)
								}
								return updated
							})
						}
					}
					reader.readAsDataURL(fileToAttach)
				}

				void uploadAttachment(fileToAttach, attachmentId)
			})
		},
		[token, uploadAttachment]
	)
	
	// Обновляем ref при изменении handleFileChange
	useEffect(() => {
		handleFileChangeRef.current = handleFileChange
	}, [handleFileChange])

	const handlePaste = useCallback(
		(event: React.ClipboardEvent<HTMLTextAreaElement>) => {
			const items = event.clipboardData?.items
			if (!items || !token) return

			// Сначала проверяем, есть ли изображения в буфере обмена
			const imageFiles: File[] = []
			const baseTimestamp = Date.now()

			// Собираем все изображения из буфера обмена
			for (let i = 0; i < items.length; i++) {
				const item = items[i]
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const originalFile = item.getAsFile()
					if (!originalFile) continue

					// Создаем уникальный идентификатор для каждого файла
					// Используем индекс в массиве items для уникальности
					const uniqueTimestamp = baseTimestamp + i
					
					// Создаем более уникальный идентификатор, включая первые байты файла для проверки дубликатов
					// Но не блокируем файлы из одного события paste - они все должны быть добавлены
					const fileId = `${originalFile.size}-${originalFile.name || 'screenshot'}-${uniqueTimestamp}-${i}`
					
					// Проверяем на дубликаты только для файлов из предыдущих событий paste
					// Файлы из текущего события paste всегда добавляем
					if (pastedFilesRef.current.has(fileId)) {
						console.log('Пропускаем дубликат:', fileId)
						continue
					}
					
					// Добавляем в список обработанных файлов
					pastedFilesRef.current.add(fileId)

					const fileName =
						originalFile.name && originalFile.name.trim().length > 0
							? originalFile.name
							: `screenshot-${uniqueTimestamp}-${imageFiles.length + 1}.png`

					const normalizedFile = new File([originalFile], fileName, {
						type: originalFile.type,
					})

					imageFiles.push(normalizedFile)
				}
			}

			// Если есть изображения, предотвращаем стандартное поведение
			if (imageFiles.length > 0) {
				event.preventDefault()
				event.stopPropagation()

				console.log('Найдено изображений в буфере обмена:', imageFiles.length)

				// Очищаем предыдущий debounce
				if (pasteDebounceRef.current) {
					clearTimeout(pasteDebounceRef.current)
				}

				// Debounce для защиты от быстрых вставок (но обрабатываем сразу)
				pasteDebounceRef.current = setTimeout(() => {
					// Добавляем все файлы последовательно с небольшой задержкой между ними
					// чтобы каждое изображение успело обработаться
					imageFiles.forEach((file, index) => {
						console.log(`Добавляем файл ${index + 1}/${imageFiles.length}:`, file.name, file.size, file.type)
						setTimeout(() => {
							handleFileChange(file)
						}, index * 50) // Небольшая задержка между файлами
					})
					
					// Ждем, пока все файлы будут обработаны и добавлены в attachments
					// Используем несколько попыток, так как attachmentsRef может обновляться асинхронно
					let attempts = 0
					const maxAttempts = 10
					const checkAndUpdate = () => {
						attempts++
						// Получаем все изображения из текущих вложений через ref
						const currentImages = attachmentsRef.current.filter(
							att => att.kind === 'image' && att.previewUrl
						)
						
						// Проверяем, что все файлы обработаны (по количеству)
						const expectedCount = imageFiles.length
						const hasAllImages = currentImages.length >= expectedCount || 
							(previewModalAttachment && currentImages.length > (previewModalAttachments.length || 0))
						
						if (hasAllImages || attempts >= maxAttempts) {
							// Всегда обновляем список вложений в модальном окне
							if (currentImages.length > 0) {
								setPreviewModalAttachments(currentImages)
								
								// Если модальное окно уже открыто, обновляем его
								if (previewModalAttachment) {
									// Находим последнее добавленное изображение (по timestamp в имени)
									const newImage = currentImages.find(att => 
										att.name.includes(`screenshot-${baseTimestamp}`) ||
										imageFiles.some(f => f.size === att.size && (f.name === att.name || att.name.includes('screenshot-')))
									)
									
									if (newImage) {
										// Переключаемся на новое изображение
										const newIndex = currentImages.findIndex(att => att.id === newImage.id)
										if (newIndex >= 0) {
											setPreviewModalCurrentIndex(newIndex)
											setPreviewModalAttachment(newImage)
											setPreviewModalCaption(newImage.caption || '')
										}
									} else {
										// Если не нашли новое изображение по критериям, проверяем, увеличилось ли количество
										if (currentImages.length > (previewModalAttachments.length || 0)) {
											// Количество изображений увеличилось - берем последнее (новое)
											const lastIndex = currentImages.length - 1
											setPreviewModalCurrentIndex(lastIndex)
											setPreviewModalAttachment(currentImages[lastIndex])
											setPreviewModalCaption(currentImages[lastIndex].caption || '')
										} else {
											// Просто обновляем список и остаемся на текущем изображении
											const currentIndex = currentImages.findIndex(att => att.id === previewModalAttachment.id)
											if (currentIndex >= 0) {
												setPreviewModalCurrentIndex(currentIndex)
												setPreviewModalAttachment(currentImages[currentIndex])
											} else if (currentImages.length > 0) {
												// Текущее изображение удалено, переходим на последнее
												const lastIndex = currentImages.length - 1
												setPreviewModalCurrentIndex(lastIndex)
												setPreviewModalAttachment(currentImages[lastIndex])
												setPreviewModalCaption(currentImages[lastIndex].caption || '')
											}
										}
									}
								} else {
									// Если модальное окно не открыто, открываем его
									if (currentImages.length === 1) {
										// Одно изображение
										setPreviewModalAttachments([currentImages[0]])
										setPreviewModalCurrentIndex(0)
										setPreviewModalAttachment(currentImages[0])
										setPreviewModalCaption(currentImages[0].caption || '')
									} else {
										// Несколько изображений - открываем с последним
										const lastIndex = currentImages.length - 1
										setPreviewModalAttachments(currentImages)
										setPreviewModalCurrentIndex(lastIndex)
										setPreviewModalAttachment(currentImages[lastIndex])
										setPreviewModalCaption(currentImages[lastIndex].caption || '')
									}
								}
							}
						} else if (attempts < maxAttempts) {
							// Еще не все файлы обработаны, пробуем еще раз
							setTimeout(checkAndUpdate, 100)
							return
						}
					}
					
					// Первая попытка через 200ms
					setTimeout(checkAndUpdate, 200)
				}, 50) // Уменьшил задержку для более быстрой обработки
			}

			// Очищаем старые идентификаторы через 5 секунд
			setTimeout(() => {
				pastedFilesRef.current.clear()
			}, 5000)
		},
		[handleFileChange, token]
	)

	const stopRecording = useCallback(
		async (send: boolean) => {
			if (recordingTimerRef.current) {
				clearInterval(recordingTimerRef.current)
				recordingTimerRef.current = null
			}
			setIsRecording(false)

			const recorder = mediaRecorderRef.current
			if (!recorder) return

			const finalize = async () => {
				recorder.stream.getTracks().forEach(track => track.stop())
				mediaRecorderRef.current = null
				if (!send) {
					audioChunksRef.current = []
					setRecordingTime(0)
					return
				}

				try {
					const blob = new Blob(audioChunksRef.current, {
						type: recorder.mimeType || 'audio/webm',
					})
					audioChunksRef.current = []

					if (blob.size === 0) {
						alert('Не удалось записать голосовое сообщение')
						return
					}

					const metadata = await extractWaveform(blob)
					const fileName = `voice-${Date.now()}.webm`
					const voiceFile = new File([blob], fileName, { type: 'audio/webm' })
					const previewUrl = URL.createObjectURL(blob)

					await handleFileChange(voiceFile, {
						voice: metadata,
						previewUrl,
					})

				} catch (error) {
					console.error('Ошибка обработки голосового сообщения:', error)
					alert('Не удалось сохранить голосовое сообщение')
				}
			}

			try {
				recorder.ondataavailable = event => {
					if (event.data.size > 0) {
						audioChunksRef.current.push(event.data)
					}
				}
				recorder.onstop = () => {
					finalize().catch(err =>
						console.error('Ошибка завершения записи голосового сообщения:', err)
					)
				}
				recorder.stop()
			} catch (error) {
				console.error('Ошибка остановки записи:', error)
				await finalize()
			}
		},
		[handleFileChange, recordingTimerRef, mediaRecorderRef]
	)

	const startRecording = useCallback(async () => {
		if (isRecording) return

		if (!navigator.mediaDevices?.getUserMedia) {
			alert('Ваш браузер не поддерживает запись голосовых сообщений')
			return
		}

		try {
			// отменяем текущие загрузки и вложения
			attachmentUploadsRef.current.forEach(xhr => xhr.abort())
			attachmentUploadsRef.current.clear()
			setAttachments([])
			attachmentsRef.current = []
			clearVoiceState()

			const audioConstraints: MediaTrackConstraints =
				selectedMicrophoneId && selectedMicrophoneId !== 'default'
					? { deviceId: { exact: selectedMicrophoneId } }
					: {}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: audioConstraints,
			})

			const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
				? 'audio/webm;codecs=opus'
				: 'audio/webm'

			const recorder = new MediaRecorder(stream, { mimeType })
			mediaRecorderRef.current = recorder
			audioChunksRef.current = []
			setRecordingTime(0)
			setVoiceCurrentTime(0)
			setIsRecording(true)

			recorder.ondataavailable = event => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			recorder.start(200)
			recordingTimerRef.current = setInterval(() => {
				setRecordingTime(prev => prev + 1)
			}, 1000)
		} catch (error) {
			console.error('Ошибка доступа к микрофону:', error)
			alert(
				'Не удалось получить доступ к микрофону. Проверьте настройки браузера.'
			)
		}
	}, [clearVoiceState, isRecording, selectedMicrophoneId])

	const cancelRecording = useCallback(async () => {
		await stopRecording(false)
		clearVoiceState()
		setRecordingTime(0)
	}, [clearVoiceState, stopRecording])

	const toggleVoicePlayback = useCallback(() => {
		if (!audioRef.current) return
		setIsVoicePlaying(prev => !prev)
	}, [])

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
	const handleEmojiClick = (emoji: string, isCaption: boolean = false) => {
		if (emoji) {
			if (isCaption) {
				// Вставляем emoji в подпись
				setMessage(prev => prev + emoji)
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
						textarea.setSelectionRange(
							start + emoji.length,
							start + emoji.length
						)
					}, 0)
				} else {
					setMessage(prev => prev + emoji)
				}
			}
		} else {
			console.warn('Не удалось добавить эмодзи: пустое значение')
		}

		setShowEmojiPicker(false)
	}

	// Закрытие emoji picker при нажатии Escape
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (showEmojiPicker) {
					setShowEmojiPicker(false)
				}
			}
		}

		if (showEmojiPicker) {
			document.addEventListener('keydown', handleEscape)
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
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

	const trimmedMessage = message.trim()
	const hasReadyAttachment = attachments.some(att => att.status === 'ready')
	const hasPendingAttachment = attachments.some(
		att => att.status === 'uploading'
	)
	const hasAttachmentErrors = attachments.some(att => att.status === 'error')
	const sendDisabled =
		sending ||
		isRecording ||
		hasPendingAttachment ||
		hasAttachmentErrors ||
		(!hasReadyAttachment && trimmedMessage.length === 0)

	const sendButtonTitle = hasPendingAttachment
		? 'Дождитесь загрузки вложений'
		: hasAttachmentErrors
		? 'Удалите или перезагрузите вложения с ошибкой'
		: isRecording
		? 'Остановите запись, чтобы отправить сообщение'
		: sending
		? 'Отправка...'
		: !hasReadyAttachment && trimmedMessage.length === 0
		? 'Напишите сообщение или добавьте вложение'
		: 'Отправить'

	useEffect(() => {
		attachmentsRef.current = attachments
	}, [attachments])

	useEffect(() => {
		const voiceAttachment = attachments.find(att => att.kind === 'voice')

		if (!voiceAttachment) {
			if (voiceMetadata) {
				setVoiceMetadata(null)
				setVoiceDuration(0)
				setVoiceCurrentTime(0)
				setIsVoicePlaying(false)
			}
			setAudioPreviewUrl(prev => {
				if (prev) {
					URL.revokeObjectURL(prev)
				}
				return null
			})
			return
		}

		const nextMetadata = voiceAttachment.voiceMetadata ?? null
		if (
			nextMetadata &&
			(voiceMetadata?.duration !== nextMetadata.duration ||
				voiceMetadata?.waveform !== nextMetadata.waveform)
		) {
			setVoiceMetadata(nextMetadata)
			setVoiceDuration(nextMetadata.duration)
			setVoiceCurrentTime(0)
			setIsVoicePlaying(false)
		}

		if (
			voiceAttachment.audioPreviewUrl &&
			audioPreviewUrl !== voiceAttachment.audioPreviewUrl
		) {
			setAudioPreviewUrl(prev => {
				if (prev && prev !== voiceAttachment.audioPreviewUrl) {
					URL.revokeObjectURL(prev)
				}
				return voiceAttachment.audioPreviewUrl ?? null
			})
		}
	}, [attachments, audioPreviewUrl, voiceMetadata])

	const removeAttachment = useCallback(
		(attachmentId: string) => {
			const existing = attachmentsRef.current.find(
				att => att.id === attachmentId
			)

			// Отменяем загрузку, если она идет
			const xhr = attachmentUploadsRef.current.get(attachmentId)
			if (xhr) {
				try {
					// Отменяем загрузку (это вызовет onabort, который обработается с isAborted=true)
					xhr.abort()
				} catch (error) {
					// Игнорируем ошибки при отмене загрузки
					console.warn('Ошибка при отмене загрузки:', error)
				}
				attachmentUploadsRef.current.delete(attachmentId)
			}

			// Освобождаем ресурсы
			if (existing?.audioPreviewUrl) {
				URL.revokeObjectURL(existing.audioPreviewUrl)
			}
			
			if (existing?.previewUrl && existing.kind !== 'voice') {
				URL.revokeObjectURL(existing.previewUrl)
			}

			if (existing?.kind === 'voice') {
				clearVoiceState()
			}

			// Удаляем вложение из состояния
			setAttachments(prev => prev.filter(att => att.id !== attachmentId))
		},
		[clearVoiceState]
	)

	const retryAttachment = useCallback(
		(attachmentId: string) => {
			const existing = attachmentsRef.current.find(
				att => att.id === attachmentId
			)
			if (!existing) return

			setAttachments(prev =>
				prev.map(att =>
					att.id === attachmentId
						? {
								...att,
								uploadedFileId: null,
								uploadProgress: 0,
								status: 'uploading',
						  }
						: att
				)
			)

			void uploadAttachment(existing.file, attachmentId)
		},
		[uploadAttachment]
	)

	const handleVoiceSeek = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!audioRef.current || !voiceDuration) return

			const rect = event.currentTarget.getBoundingClientRect()
			const ratio = Math.min(
				Math.max((event.clientX - rect.left) / rect.width, 0),
				1
			)
			const newTime = voiceDuration * ratio
			audioRef.current.currentTime = newTime
			setVoiceCurrentTime(newTime)
		},
		[voiceDuration]
	)

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className='px-1.5 sm:px-2.5 md:px-3 py-1.5 sm:py-2.5 md:py-3'
				style={{
					position: 'relative',
					zIndex: 10,
					touchAction: 'manipulation',
					WebkitTapHighlightColor: 'transparent',
					WebkitTouchCallout: 'none',
				} as React.CSSProperties}
			>
				{/* Сообщение о закрытом чате */}
				{isChatDisabled && disputeMessage && (
					<div className='mb-3 px-4 py-2.5 bg-yellow-900/30 backdrop-blur-sm border border-yellow-500/50 rounded-xl text-xs sm:text-sm text-yellow-300 flex items-center gap-2'>
						<span>⚠️</span>
						<span>{disputeMessage}</span>
					</div>
				)}
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
								<svg
									className='w-4 h-4'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M6 18L18 6M6 6l12 12'
									/>
								</svg>
							</button>
						)}
					</div>
				)}

				{/* Индикатор записи */}
				{isRecording && (
					<div className='mb-3 px-4 py-2.5 bg-red-500/20 backdrop-blur-sm border border-red-400/40 rounded-xl flex items-center justify-between text-sm transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2 shadow-lg'>
						<div className='flex items-center gap-2'>
							<span className='inline-flex w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse'></span>
							<span className='text-red-200 font-medium'>Идёт запись...</span>
						</div>
						<div className='flex items-center gap-3'>
							<span className='text-red-300 font-mono text-sm'>
								{formatDuration(recordingTime)}
							</span>
							<button
								type='button'
								onClick={() =>
									cancelRecording().catch(err =>
										console.error('Ошибка отмены записи:', err)
									)
								}
								className='text-xs text-red-300 hover:text-red-200 transition px-2 py-1 rounded-md hover:bg-red-500/20'
							>
								Отменить
							</button>
						</div>
					</div>
				)}

				{/* Вложения */}
				{attachments.length > 0 && (
					<div className='mb-3 space-y-3'>
						{attachments.map(attachment => {
							const isUploading = attachment.status === 'uploading'
							const isError = attachment.status === 'error'
							const progress = Math.round(attachment.uploadProgress)
							const isVoice = attachment.kind === 'voice'
							const isActiveVoice =
								isVoice && attachment.audioPreviewUrl === audioPreviewUrl

							if (
								isVoice &&
								attachment.audioPreviewUrl &&
								attachment.voiceMetadata
							) {
								return (
									<div
										key={attachment.id}
										className='rounded-lg border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm px-2 py-1.5 shadow-sm max-w-fit'
									>
										<VoicePlayer
											audioUrl={attachment.audioPreviewUrl}
											waveform={attachment.voiceMetadata.waveform || []}
											duration={attachment.voiceMetadata.duration || 0}
										/>
										{isUploading && (
											<div className='mt-1.5 w-full bg-emerald-500/10 rounded-full h-0.5 overflow-hidden'>
												<div
													className='h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-200'
													style={{ width: `${progress}%` }}
												/>
											</div>
										)}
										{isError && (
											<div className='mt-1.5 flex items-center gap-2'>
												<button
													type='button'
													onClick={() => retryAttachment(attachment.id)}
													className='px-2 py-0.5 text-[10px] rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors'
												>
													Повторить
												</button>
											</div>
										)}
										<div className='mt-1.5 flex items-center justify-between'>
											<div className='text-[10px] text-gray-400 truncate'>
												{getTruncatedFileName(attachment.name)}
											</div>
											<button
												type='button'
												onClick={() => removeAttachment(attachment.id)}
												className='w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/20 text-red-300 transition-colors flex-shrink-0'
												aria-label='Удалить вложение'
											>
												<svg
													className='w-3 h-3'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M6 18L18 6M6 6l12 12'
													/>
												</svg>
											</button>
										</div>
									</div>
								)
							}

							const renderPreview = () => {
								if (attachment.kind === 'image' && attachment.previewUrl) {
									return (
										<img
											src={attachment.previewUrl}
											alt={attachment.name}
											className='w-16 h-16 rounded-xl object-cover border border-slate-700/60 cursor-pointer hover:opacity-80 transition-opacity'
											onClick={() => {
												setPreviewModalAttachment(attachment)
												setPreviewModalCaption(attachment.caption || '')
												setPreviewModalCompress(attachment.compress !== false)
											}}
										/>
									)
								}

								if (attachment.kind === 'video') {
									return (
										<div 
											className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300 cursor-pointer hover:opacity-80 transition-opacity'
											onClick={() => setPreviewModalAttachment(attachment)}
										>
											<svg
												className='w-6 h-6'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z'
												/>
											</svg>
										</div>
									)
								}

								if (attachment.kind === 'audio') {
									return (
										<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
											<svg
												className='w-6 h-6'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M9 19V6l12-2v13M5 11v8m-2-8h4'
												/>
											</svg>
										</div>
									)
								}

								return (
									<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
										<FileText className='w-5 h-5' />
									</div>
								)
							}

							return (
								<div
									key={attachment.id}
									className={`rounded-2xl border ${
										isError
											? 'border-red-400/60 bg-red-500/5'
											: 'border-slate-700/60 bg-slate-800/60'
									} backdrop-blur-sm px-4 py-3 shadow-lg`}
								>
									<div className='flex items-center gap-3'>
										{renderPreview()}
										<div className='flex-1 min-w-0'>
											<div className='flex items-center justify-between gap-3'>
												<div className='min-w-0'>
													<div className='text-sm font-semibold text-slate-100 truncate'>
														{getTruncatedFileName(attachment.name)}
													</div>
													<div className='text-xs text-gray-400 flex items-center gap-1'>
														<span>{formatFileSize(attachment.size)}</span>
														{isUploading && <span>· {progress}%</span>}
													</div>
												</div>
												<div className='flex items-center gap-1'>
													{isError && (
														<button
															type='button'
															onClick={() => retryAttachment(attachment.id)}
															className='px-2 py-1 text-[11px] rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors'
														>
															Повторить
														</button>
													)}
													<button
														type='button'
														onClick={() => removeAttachment(attachment.id)}
														className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-300 transition-colors'
														aria-label='Удалить вложение'
													>
														<svg
															className='w-4 h-4'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M6 18L18 6M6 6l12 12'
															/>
														</svg>
													</button>
												</div>
											</div>
											{isUploading && (
												<div className='mt-2 w-full bg-slate-700/40 rounded-full h-1 overflow-hidden'>
													<div
														className='h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-200'
														style={{ width: `${progress}%` }}
													/>
												</div>
											)}
											{isError && (
												<div className='mt-2 text-xs text-amber-200 flex items-center gap-1'>
													<svg
														className='w-3 h-3'
														fill='none'
														stroke='currentColor'
														viewBox='0 0 24 24'
													>
														<path
															strokeLinecap='round'
															strokeLinejoin='round'
															strokeWidth={2}
															d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
														/>
													</svg>
													<span>Не удалось загрузить</span>
												</div>
											)}
										</div>
									</div>
								</div>
							)
						})}
					</div>
				)}

				{/* Поле ввода сообщения */}
				<div className='flex items-center gap-2'>
					<label
						className='group cursor-pointer flex-shrink-0 w-11 h-11 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-700/80 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button touch-manipulation transition-all duration-200 active:scale-95'
						style={{
							position: 'relative',
							zIndex: 20,
							touchAction: 'manipulation',
							WebkitTapHighlightColor: 'transparent',
						}}
						aria-label='Прикрепить файл'
					>
						<input
							ref={fileInputRef}
							type='file'
							multiple
							onChange={handleFileChange}
							className='hidden'
							accept='.mp4,.webm,.mov,.avi,.mkv,.wmv,.m4v,.flv,.ogg,.mp3,.wav,.m4a,audio/*,image/*,.pdf,.doc,.docx,.txt'
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

					<div
						className='flex-1 relative'
						style={{ position: 'relative', zIndex: 10 }}
					>
						<textarea
							ref={textareaRef}
							value={message}
							onChange={handleMessageChange}
							onKeyDown={e => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									if (!sendDisabled) {
										handleSubmit(e as any)
									}
								}
							}}
							onTouchStart={e => {
								e.stopPropagation()
							}}
							onTouchEnd={e => {
								e.stopPropagation()
								if (textareaRef.current) {
									textareaRef.current.focus()
								}
							}}
							onClick={e => {
								e.stopPropagation()
							}}
							onPaste={handlePaste}
							placeholder='Напишите сообщение...'
							rows={1}
							className='w-full px-3 py-2.5 bg-slate-700/55 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white text-sm sm:text-base placeholder-gray-500 focus:border-emerald-400/60 focus:outline-none focus:bg-slate-700/75 focus-visible:outline-none focus-visible:ring-0 resize-none shadow-md hover:border-slate-500/70 transition-all duration-200 ease-out'
							disabled={sending || isChatDisabled}
							style={
								{
									height: '44px',
									minHeight: '44px',
									maxHeight: '140px',
									lineHeight: '1.5',
									overflow: 'auto',
									scrollbarWidth: 'none',
									msOverflowStyle: 'none',
									transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
									outline: 'none',
									outlineOffset: '0',
									boxShadow:
										'0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
									WebkitAppearance: 'none',
									appearance: 'none',
									fontFamily:
										"'Inter', 'Poppins', system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif",
									position: 'relative',
									zIndex: 10,
									touchAction: 'manipulation',
									WebkitTapHighlightColor: 'transparent',
									pointerEvents: 'auto',
								} as React.CSSProperties
							}
						/>
					</div>

					{/* Кнопка эмоджи */}
					<div
						className='relative'
						ref={emojiPickerRef}
						style={{ position: 'relative', zIndex: 20 }}
					>
						<button
							ref={emojiButtonRef}
							type='button'
							onClick={e => {
								e.stopPropagation()
								setShowEmojiPicker(prev => !prev)
							}}
							onTouchStart={e => {
								e.stopPropagation()
							}}
							className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border ${
								showEmojiPicker
									? 'border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
									: 'border-slate-600/50'
							} hover:border-emerald-400/50 hover:bg-slate-700/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button text-2xl touch-manipulation transition-all duration-200 active:scale-95`}
							style={{
								touchAction: 'manipulation',
								WebkitTapHighlightColor: 'transparent',
								pointerEvents: 'auto',
							}}
							aria-label='Эмодзи'
						>
							😊
						</button>
						{showEmojiPicker &&
							typeof window !== 'undefined' &&
							createPortal(
								<>
									<div
										className='fixed inset-0 z-[9998] bg-transparent'
										onClick={() => setShowEmojiPicker(false)}
									/>
									<div
										className='fixed z-[9999]'
										style={{
											bottom: isMobileView ? 140 : 80,
											right: isMobileView ? 12 : 24,
											left: isMobileView ? 12 : 'auto',
											width: isMobileView
												? Math.min(280, viewportWidth - 24)
												: 260,
										}}
										onClick={e => e.stopPropagation()}
									>
										<div className='bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-3 animate-scaleFadeIn'>
											<div className='grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar'>
												{emojiList.map(emoji => (
													<button
														key={emoji}
														onClick={() => handleEmojiClick(emoji)}
														className='w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-700/80 flex items-center justify-center text-xl sm:text-2xl transition-all hover:scale-110 active:scale-95 touch-manipulation'
														aria-label={`Эмодзи ${emoji}`}
													>
														{emoji}
													</button>
												))}
											</div>
										</div>
									</div>
								</>,
								document.body
							)}
					</div>

					{/* Кнопка шаблонов */}
					{showTemplatesButton && (
						<button
							type='button'
							onClick={e => {
								e.stopPropagation()
								setShowTemplatesModal(true)
							}}
							onTouchStart={e => {
								e.stopPropagation()
							}}
							className='flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:border-emerald-400/50 hover:bg-slate-700/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button touch-manipulation transition-all duration-200 active:scale-95'
							style={{
								touchAction: 'manipulation',
								WebkitTapHighlightColor: 'transparent',
								pointerEvents: 'auto',
							}}
							title='Шаблоны сообщений'
							aria-label='Шаблоны сообщений'
						>
							<FileText className='w-5 h-5 text-emerald-400' />
						</button>
					)}

					{/* Кнопка отправки или микрофона */}
					{isRecording ? (
						// Кнопка остановки записи
						<button
							type='button'
							onClick={() => {
								stopRecording(true).catch(err =>
									console.error('Ошибка остановки записи:', err)
								)
							}}
							onTouchStart={e => {
								e.stopPropagation()
							}}
							className='flex-shrink-0 w-11 h-11 bg-gradient-to-br from-red-500/90 to-red-600/90 hover:from-red-400 hover:to-red-500 text-white rounded-xl active:scale-95 ios-button shadow-md hover:shadow-lg hover:shadow-red-500/20 flex items-center justify-center touch-manipulation border border-red-400/30 transition-all duration-200'
							style={{
								position: 'relative',
								zIndex: 20,
								touchAction: 'manipulation',
								WebkitTapHighlightColor: 'transparent',
								pointerEvents: 'auto',
							}}
						>
							<div className='relative'>
								<Mic className='w-5 h-5' />
								<span className='absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white animate-pulse'></span>
							</div>
						</button>
					) : !trimmedMessage && !hasReadyAttachment && !preferSendMode ? (
						// Группа: кнопка микрофона + меню выбора
						<div className='relative flex items-center gap-1'>
							<button
								type='button'
								onClick={() => {
									startRecording().catch(err =>
										console.error('Ошибка запуска записи:', err)
									)
								}}
								onTouchStart={e => {
									e.stopPropagation()
								}}
								className='flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl active:scale-95 ios-button shadow-md hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center touch-manipulation border border-emerald-400/30 transition-all duration-200'
								style={{
									position: 'relative',
									zIndex: 20,
									touchAction: 'manipulation',
									WebkitTapHighlightColor: 'transparent',
									pointerEvents: 'auto',
								}}
							>
								<Mic className='w-5 h-5' />
							</button>
							<div className='relative'>
							<button
								ref={sendMenuButtonRef}
								type='button'
								onClick={e => {
									e.stopPropagation()
									setShowSendMenu(prev => !prev)
								}}
								onTouchStart={e => {
									e.stopPropagation()
								}}
								className='w-8 h-11 flex items-center justify-center rounded-xl border border-emerald-400/30 bg-slate-700/50 hover:bg-slate-700/70 text-emerald-300 transition-all duration-200 active:scale-95'
								style={{
									touchAction: 'manipulation',
									WebkitTapHighlightColor: 'transparent',
									position: 'relative',
									zIndex: 21,
								}}
							>
								<ChevronDown
									className={`w-4 h-4 transition-transform duration-200 ${
										showSendMenu ? 'rotate-180' : ''
									}`}
								/>
							</button>
									{showSendMenu && (
										<div
											ref={sendMenuRef}
										className='absolute bottom-[calc(100%+0.5rem)] right-0 w-11 bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl flex flex-col gap-0.5 animate-fadeIn z-50 overflow-hidden'
										style={{ padding: '2px' }}
											onClick={e => e.stopPropagation()}
										>
											<button
												type='button'
												onClick={() => {
													startRecording().catch(err =>
														console.error('Ошибка запуска записи:', err)
													)
													setShowSendMenu(false)
												}}
											className='w-full h-11 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700/80 transition-colors'
											style={{ margin: 0, padding: 0, width: '100%', boxSizing: 'border-box' }}
											>
												<Mic className='w-5 h-5 text-emerald-400' />
											</button>
											<button
												type='button'
												onClick={() => {
													setPreferSendMode(true)
													setShowSendMenu(false)
													if (textareaRef.current) {
														textareaRef.current.focus()
													}
												}}
											className='w-full h-11 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700/80 transition-colors'
											style={{ margin: 0, padding: 0, width: '100%', boxSizing: 'border-box' }}
											>
												<Send className='w-5 h-5 text-emerald-400' />
											</button>
										</div>
									)}
							</div>
						</div>
					) : (
						// Кнопка отправки (с меню, если preferSendMode и поле пустое)
						<div className='relative flex items-center gap-1'>
							<button
								type='submit'
								disabled={sendDisabled}
								onTouchStart={e => {
									e.stopPropagation()
								}}
								onClick={e => {
									e.stopPropagation()
								}}
								className='flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ios-button shadow-md hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center touch-manipulation border border-emerald-400/30 transition-all duration-200'
								style={{
									position: 'relative',
									zIndex: 20,
									touchAction: 'manipulation',
									WebkitTapHighlightColor: 'transparent',
									pointerEvents: 'auto',
								}}
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
										d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938л3-2.647z'
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
							{preferSendMode && !trimmedMessage && !hasReadyAttachment && (
								<div className='relative'>
									<button
										ref={sendMenuButtonRef}
										type='button'
										onClick={e => {
											e.stopPropagation()
											setShowSendMenu(prev => !prev)
										}}
										onTouchStart={e => {
											e.stopPropagation()
										}}
										className='w-8 h-11 flex items-center justify-center rounded-xl border border-emerald-400/30 bg-slate-700/50 hover:bg-slate-700/70 text-emerald-300 transition-all duration-200 active:scale-95'
										style={{
											touchAction: 'manipulation',
											WebkitTapHighlightColor: 'transparent',
											position: 'relative',
											zIndex: 21,
										}}
									>
										<ChevronDown
											className={`w-4 h-4 transition-transform duration-200 ${
												showSendMenu ? 'rotate-180' : ''
											}`}
										/>
									</button>
									{showSendMenu && (
										<div
											ref={sendMenuRef}
											className='absolute bottom-[calc(100%+0.5rem)] right-0 w-11 bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl flex flex-col gap-0.5 animate-fadeIn z-50 overflow-hidden'
											style={{ padding: '2px' }}
											onClick={e => e.stopPropagation()}
										>
											<button
												type='button'
												onClick={() => {
													setPreferSendMode(false)
													setShowSendMenu(false)
												}}
												className='w-full h-11 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700/80 transition-colors'
												style={{ margin: 0, padding: 0, width: '100%', boxSizing: 'border-box' }}
											>
												<Mic className='w-5 h-5 text-emerald-400' />
											</button>
											<button
												type='button'
												onClick={() => {
													setShowSendMenu(false)
													if (textareaRef.current) {
														textareaRef.current.focus()
													}
												}}
												className='w-full h-11 flex items-center justify-center rounded-lg bg-slate-800/70 hover:bg-slate-700/80 transition-colors'
												style={{ margin: 0, padding: 0, width: '100%', boxSizing: 'border-box' }}
											>
												<Send className='w-5 h-5 text-emerald-400' />
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</form>

			{/* Модальное окно шаблонов */}
			<MessageTemplatesModal
				isOpen={showTemplatesModal}
				onClose={() => setShowTemplatesModal(false)}
				onSelectTemplate={content => {
					setMessage(content)
					// Фокусируем textarea после вставки шаблона
					setTimeout(() => {
						if (textareaRef.current) {
							textareaRef.current.focus()
							// Устанавливаем курсор в конец
							const length = content.length
							textareaRef.current.setSelectionRange(length, length)
						}
					}, 100)
				}}
			/>

			{/* Модальное окно предпросмотра медиа файлов (как в Telegram) */}
			{previewModalAttachment &&
				typeof window !== 'undefined' &&
				(previewModalAttachment.kind === 'image' || previewModalAttachment.kind === 'video') &&
				createPortal(
					<div
						className={`fixed inset-0 flex ${isMobileView ? 'items-end' : 'items-center justify-center'} bg-black/70 backdrop-blur-sm z-[99999]`}
						onClick={() => {
							// Закрываем модальное окно без удаления вложений
							setPreviewModalAttachment(null)
							setPreviewModalAttachments([])
							setPreviewModalCurrentIndex(0)
							setPreviewModalCaption('')
							setPreviewModalCompress(true)
						}}
					>
						{/* Модальное окно */}
						<div
							className={`relative w-full ${isMobileView ? 'max-w-full h-[90vh] rounded-t-3xl' : 'max-w-lg rounded-3xl'} bg-gradient-to-br from-[#0a140f] via-[#05150a] to-[#0a140f] border border-emerald-500/30 shadow-2xl flex flex-col ${isMobileView ? 'max-h-[90vh]' : 'max-h-[90vh]'} overflow-hidden backdrop-blur-xl`}
							onClick={e => e.stopPropagation()}
							style={{
								boxShadow: isMobileView 
									? '0 -10px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.1)'
									: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 30px rgba(16, 185, 129, 0.15)',
							}}
						>
							{/* Заголовок */}
							<div className={`flex items-center justify-between ${isMobileView ? 'px-4 py-3' : 'px-6 py-5'} border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-transparent`}>
								<div className='flex items-center gap-3'>
									<h2 className={`${isMobileView ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent`}>
										{previewModalAttachment.kind === 'image' ? 'Отправить изображение' : 'Отправить видео'}
									</h2>
									{previewModalAttachments.length > 1 && (
										<span className={`${isMobileView ? 'text-sm' : 'text-base'} text-emerald-300/70 font-medium whitespace-nowrap`}>
											{previewModalCurrentIndex + 1} из {previewModalAttachments.length}
										</span>
									)}
								</div>
								<div className='flex items-center gap-2'>
									{/* Навигация между изображениями (если их несколько) */}
									{previewModalAttachments.length > 1 && (
										<>
											<button
												onClick={(e) => {
													e.stopPropagation()
													const newIndex = previewModalCurrentIndex > 0 
														? previewModalCurrentIndex - 1 
														: previewModalAttachments.length - 1
													setPreviewModalCurrentIndex(newIndex)
													setPreviewModalAttachment(previewModalAttachments[newIndex])
													setPreviewModalCaption(previewModalAttachments[newIndex].caption || '')
												}}
												className={`${isMobileView ? 'w-9 h-9' : 'w-8 h-8'} flex items-center justify-center rounded-lg bg-emerald-900/40 hover:bg-emerald-500/20 border border-emerald-700/40 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation`}
												title='Предыдущее'
											>
												<ChevronDown className={`${isMobileView ? 'w-5 h-5' : 'w-4 h-4'} rotate-90`} />
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation()
													const newIndex = previewModalCurrentIndex < previewModalAttachments.length - 1
														? previewModalCurrentIndex + 1
														: 0
													setPreviewModalCurrentIndex(newIndex)
													setPreviewModalAttachment(previewModalAttachments[newIndex])
													setPreviewModalCaption(previewModalAttachments[newIndex].caption || '')
												}}
												className={`${isMobileView ? 'w-9 h-9' : 'w-8 h-8'} flex items-center justify-center rounded-lg bg-emerald-900/40 hover:bg-emerald-500/20 border border-emerald-700/40 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation`}
												title='Следующее'
											>
												<ChevronDown className={`${isMobileView ? 'w-5 h-5' : 'w-4 h-4'} -rotate-90`} />
											</button>
										</>
									)}
									{previewModalAttachment.kind === 'image' && (
										<button
											onClick={(e) => {
												e.stopPropagation()
												setAttachments(prev =>
													prev.map(att =>
														att.id === previewModalAttachment.id
															? { ...att, rotation: ((att.rotation || 0) + 90) % 360 }
															: att
													)
												)
												setPreviewModalAttachment(prev =>
													prev
														? { ...prev, rotation: ((prev.rotation || 0) + 90) % 360 }
														: null
												)
											}}
											className={`${isMobileView ? 'w-9 h-9' : 'w-8 h-8'} flex items-center justify-center rounded-lg bg-emerald-900/40 hover:bg-emerald-500/20 border border-emerald-700/40 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation`}
											title='Повернуть'
										>
											<RotateCw className={`${isMobileView ? 'w-5 h-5' : 'w-4 h-4'}`} />
										</button>
									)}
									<button
										onClick={(e) => {
											e.stopPropagation()
											const currentId = previewModalAttachment.id
											removeAttachment(currentId)
											
											// Обновляем список вложений
											const updated = previewModalAttachments.filter(att => att.id !== currentId)
											setPreviewModalAttachments(updated)
											
											if (updated.length === 0) {
												// Если больше нет изображений, закрываем модальное окно
												setPreviewModalAttachment(null)
												setPreviewModalCurrentIndex(0)
												setPreviewModalCaption('')
											} else {
												// Переходим к следующему или предыдущему изображению
												const newIndex = Math.min(previewModalCurrentIndex, updated.length - 1)
												setPreviewModalCurrentIndex(newIndex)
												setPreviewModalAttachment(updated[newIndex])
												setPreviewModalCaption(updated[newIndex].caption || '')
											}
										}}
										className={`${isMobileView ? 'w-9 h-9' : 'w-8 h-8'} flex items-center justify-center rounded-lg bg-emerald-900/40 hover:bg-red-500/20 border border-emerald-700/40 hover:border-red-500/50 text-emerald-300 hover:text-red-400 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation`}
										title='Удалить'
									>
										<Trash2 className={`${isMobileView ? 'w-5 h-5' : 'w-4 h-4'}`} />
									</button>
								</div>
							</div>

							{/* Область предпросмотра */}
							<div 
								className={`relative bg-gradient-to-b from-[#01150d]/60 to-[#000000]/80 flex-1 ${isMobileView ? 'min-h-[200px] max-h-[40vh]' : 'min-h-[320px] max-h-[55vh]'} flex items-center justify-center overflow-hidden`}
								onTouchStart={(e) => {
									if (previewModalAttachments.length > 1) {
										const touch = e.touches[0]
										if (touch) {
											(e.currentTarget as any).touchStartX = touch.clientX
										}
									}
								}}
								onTouchEnd={(e) => {
									if (previewModalAttachments.length > 1) {
										const touch = e.changedTouches[0]
										const startX = (e.currentTarget as any).touchStartX
										if (touch && startX) {
											const diff = touch.clientX - startX
											if (Math.abs(diff) > 50) { // Минимальное расстояние для свайпа
												if (diff > 0) {
													// Свайп вправо - предыдущее изображение
													const newIndex = previewModalCurrentIndex > 0 
														? previewModalCurrentIndex - 1 
														: previewModalAttachments.length - 1
													setPreviewModalCurrentIndex(newIndex)
													setPreviewModalAttachment(previewModalAttachments[newIndex])
													setPreviewModalCaption(previewModalAttachments[newIndex].caption || '')
												} else {
													// Свайп влево - следующее изображение
													const newIndex = previewModalCurrentIndex < previewModalAttachments.length - 1
														? previewModalCurrentIndex + 1
														: 0
													setPreviewModalCurrentIndex(newIndex)
													setPreviewModalAttachment(previewModalAttachments[newIndex])
													setPreviewModalCaption(previewModalAttachments[newIndex].caption || '')
												}
											}
										}
									}
								}}
							>
								{previewModalAttachment.kind === 'image' && previewModalAttachment.previewUrl ? (
									<div className={`relative w-full h-full flex items-center justify-center ${isMobileView ? 'p-3' : 'p-6'}`}>
										<img
											src={previewModalAttachment.previewUrl}
											alt={previewModalAttachment.name}
											className={`max-w-full max-h-full object-contain ${isMobileView ? 'rounded-xl' : 'rounded-2xl'} shadow-2xl`}
											style={{
												transform: `rotate(${previewModalAttachment.rotation || 0}deg)`,
												transition: 'transform 0.3s ease',
											}}
										/>
									</div>
								) : previewModalAttachment.kind === 'video' && previewModalAttachment.previewUrl ? (
									<div className={`relative w-full h-full flex items-center justify-center ${isMobileView ? 'p-3' : 'p-6'}`}>
										<VideoPlayer
											src={previewModalAttachment.previewUrl}
											className={`max-w-full max-h-full ${isMobileView ? 'rounded-xl' : 'rounded-2xl'} shadow-2xl`}
										/>
									</div>
								) : null}
							</div>

							{/* Опция сжатия убрана - файлы не сжимаются */}

							{/* Поле подписи */}
							<div className={`${isMobileView ? 'px-4 py-4' : 'px-6 py-5'} border-b border-emerald-500/20`}>
								<label className={`block ${isMobileView ? 'text-base' : 'text-sm'} font-semibold text-emerald-200 ${isMobileView ? 'mb-2.5' : 'mb-3'}`}>Подпись</label>
								<div className='relative flex items-center'>
									<input
										type='text'
										value={previewModalCaption}
										onChange={e => setPreviewModalCaption(e.target.value)}
										placeholder='Добавьте подпись...'
										className={`flex-1 w-full ${isMobileView ? 'px-3 py-3 text-base' : 'px-4 py-3.5 text-sm'} bg-emerald-950/40 backdrop-blur-sm border-2 border-emerald-800/40 rounded-xl text-white placeholder:text-emerald-400/50 focus:outline-none focus:border-emerald-500/60 focus:bg-emerald-950/60 focus:ring-2 focus:ring-emerald-500/20 pr-12 transition-all duration-200 shadow-inner hover:border-emerald-700/60`}
									/>
									<button
										type='button'
										onClick={() => setPreviewModalShowEmojiPicker(!previewModalShowEmojiPicker)}
										className={`absolute ${isMobileView ? 'right-2' : 'right-3'} p-2 text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation`}
									>
										<Smile className={`${isMobileView ? 'w-6 h-6' : 'w-5 h-5'}`} />
									</button>
								</div>
								{/* Эмодзи пикер */}
								{previewModalShowEmojiPicker && (
									<div className={`mt-3 ${isMobileView ? 'p-3' : 'p-4'} bg-emerald-950/60 backdrop-blur-sm rounded-xl border border-emerald-700/40 ${isMobileView ? 'max-h-48' : 'max-h-40'} overflow-y-auto shadow-lg`}>
										<div className={`grid ${isMobileView ? 'grid-cols-10 gap-1.5' : 'grid-cols-8 gap-2'}`}>
											{emojiList.map(emoji => (
												<button
													key={emoji}
													type='button'
													onClick={() => {
														setPreviewModalCaption(prev => prev + emoji)
													}}
													className={`${isMobileView ? 'text-2xl p-2' : 'text-xl p-1.5'} hover:bg-emerald-500/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation`}
												>
													{emoji}
												</button>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Кнопки действий */}
							<div className={`flex ${isMobileView ? 'flex-col' : 'flex-row'} items-stretch ${isMobileView ? 'gap-2' : 'gap-3'} ${isMobileView ? 'px-4 py-4' : 'px-6 py-5'} bg-gradient-to-r from-emerald-950/20 to-transparent safe-area-inset-bottom`}>
								{!isMobileView && (
									<button
										type='button'
										onClick={() => {
											// Обновляем подпись текущего изображения
											setAttachments(prev =>
												prev.map(att =>
													att.id === previewModalAttachment.id
														? {
																...att,
																caption: previewModalCaption,
																compress: false, // Сжатие отключено
															}
														: att
												)
											)
											
											// Обновляем подпись в списке модального окна
											setPreviewModalAttachments(prev =>
												prev.map(att =>
													att.id === previewModalAttachment.id
														? { ...att, caption: previewModalCaption }
														: att
												)
											)
											
											// Открываем выбор файла для добавления еще одного
											setTimeout(() => {
												if (fileInputRef.current) {
													fileInputRef.current.click()
												}
											}, 100)
										}}
										className='flex-1 px-5 py-3 rounded-xl bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-700/50 hover:border-emerald-600/70 text-emerald-200 hover:text-white font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm'
									>
										Добавить
									</button>
								)}
								<button
									type='button'
									onClick={() => {
										// Удаляем attachment при отмене
										removeAttachment(previewModalAttachment.id)
										setPreviewModalAttachment(null)
										setPreviewModalCaption('')
										setPreviewModalCompress(true)
									}}
									className={`${isMobileView ? 'w-full' : 'flex-1'} ${isMobileView ? 'px-4 py-3.5' : 'px-5 py-3'} rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/50 hover:border-emerald-700/70 text-emerald-300 hover:text-white ${isMobileView ? 'text-base font-semibold' : 'font-semibold'} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm touch-manipulation`}
								>
									Отмена
								</button>
								<button
									type='button'
									onClick={async () => {
										// Обновляем подпись для текущего изображения
										setAttachments(prev =>
											prev.map(att =>
												att.id === previewModalAttachment.id
													? {
															...att,
															caption: previewModalCaption,
															compress: false, // Сжатие отключено
														}
													: att
											)
										)
										
										// Если есть другие изображения, переходим к следующему
										if (previewModalAttachments.length > 1) {
											const currentIndex = previewModalAttachments.findIndex(att => att.id === previewModalAttachment.id)
											if (currentIndex < previewModalAttachments.length - 1) {
												// Переходим к следующему изображению
												const nextIndex = currentIndex + 1
												setPreviewModalCurrentIndex(nextIndex)
												setPreviewModalAttachment(previewModalAttachments[nextIndex])
												setPreviewModalCaption(previewModalAttachments[nextIndex].caption || '')
											} else {
												// Это последнее изображение - закрываем модальное окно и отправляем
												setPreviewModalAttachment(null)
												setPreviewModalAttachments([])
												setPreviewModalCurrentIndex(0)
												setPreviewModalCaption('')
												
												// Отправляем сообщение
												setTimeout(() => {
													const form = document.querySelector('form') as HTMLFormElement
													if (form) {
														const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
														form.dispatchEvent(submitEvent)
													}
												}, 100)
											}
										} else {
											// Одно изображение - закрываем и отправляем
											const captionToAdd = previewModalCaption.trim()
											setPreviewModalAttachment(null)
											setPreviewModalAttachments([])
											setPreviewModalCurrentIndex(0)
											setPreviewModalCaption('')
											
											// Если есть подпись, добавляем её в сообщение
											if (captionToAdd) {
												setMessage(prev => (prev ? prev + '\n' + captionToAdd : captionToAdd))
											}
											
											// Отправляем сообщение
											setTimeout(() => {
												const form = document.querySelector('form') as HTMLFormElement
												if (form) {
													const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
													form.dispatchEvent(submitEvent)
												}
											}, 100)
										}
									}}
									className={`${isMobileView ? 'w-full' : 'flex-1'} ${isMobileView ? 'px-4 py-4' : 'px-5 py-3'} rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white ${isMobileView ? 'text-lg' : ''} font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30 touch-manipulation`}
								>
									{previewModalAttachments.length > 1 && previewModalCurrentIndex < previewModalAttachments.length - 1 ? 'Далее' : 'Отправить'}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}
		</>
	)
}
