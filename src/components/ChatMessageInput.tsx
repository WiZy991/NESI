'use client'

import { useUser } from '@/context/UserContext'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MessageTemplatesModal from './MessageTemplatesModal'
import { FileText, ChevronDown, Mic, Play, Pause } from 'lucide-react'

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
	showTemplatesButton?: boolean
}

type TypingContext = {
	recipientId: string
	chatType: 'private' | 'task'
	chatId: string
	taskId?: string
}

const emojiList = [
	'👍','❤️','😂','😮','😢','🔥','👏','🎉','🤔','👎','😊','😍','🤣','😱','😭','🤗','🙏','💪','🎊','✅','❌','⭐','💯','💕','🤝','🙌','👌','🤯','🥳','😎','🤩','😇','🎯','🚀','👀','✨','🥰','😏','😴','🤤','🤬','🤡','🫡','🤖','💩','🧠','🫶','🤌','👏','👆','👇','👉','👈','✌️','🤞','🤟','🖖','🤙','👌'
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
	const [voiceMetadata, setVoiceMetadata] = useState<VoiceMetadata | null>(null)
	const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const [voiceCurrentTime, setVoiceCurrentTime] = useState(0)
	const [isVoicePlaying, setIsVoicePlaying] = useState(false)
	const [voiceDuration, setVoiceDuration] = useState(0)
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
	const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('default')
	const [microphoneMenuOpen, setMicrophoneMenuOpen] = useState(false)
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
	const microphoneMenuRef = useRef<HTMLDivElement | null>(null)
	const microphoneButtonRef = useRef<HTMLButtonElement | null>(null)

	const typingContext = useMemo<TypingContext | null>(() => {
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
	}, [chatType, otherUserId, taskId])

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
			console.error('Ошибка отправки события набора:', error)
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
					const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

	useEffect(() => {
		refreshMicrophones()
	}, [refreshMicrophones])

	useEffect(() => {
		if (!microphoneMenuOpen) return
		refreshMicrophones()
	}, [microphoneMenuOpen, refreshMicrophones])

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

	const trimmedContent = message.trim()
	const readyAttachments = attachments.filter(att => att.status === 'ready')
	const pendingAttachments = attachments.filter(att => att.status === 'uploading')
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

	const url = chatType === 'private' ? `/api/messages/send` : `/api/tasks/${taskId}/messages`
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
			const errorText = data?.error || data?.details || data?.message || res.statusText || 'Неизвестная ошибка'
			throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText))
		}

				const newMessage = chatType === 'private' ? data : data.message || data
				onMessageSent(newMessage)
	}

	try {
		const queue: Array<{ attachment?: ComposerAttachment; content: string }> = []

		if (readyAttachments.length > 0) {
			readyAttachments.forEach((attachment, index) => {
				queue.push({ attachment, content: index === 0 ? trimmedContent : '' })
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
					const meta = attachment.voiceMetadata || { duration: 0, waveform: [] }
					body.content = JSON.stringify({
						type: 'voice',
						duration: meta.duration || 0,
						waveform: meta.waveform || [],
						text: item.content.trim().length > 0 ? item.content.trim() : undefined,
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
		} catch (error: any) {
			console.error('Ошибка отправки сообщения:', error)
		alert(`Ошибка отправки сообщения: ${error?.message || error || 'Неизвестная ошибка'}`)
	} finally {
			setSending(false)
		}
	}

const handleFileChange = useCallback(
		async (
			input: React.ChangeEvent<HTMLInputElement> | File | null,
			options: { voice?: VoiceMetadata | null; previewUrl?: string | null } = {}
		) => {
			if (!token) return

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

			if (collectedFiles.length === 0) return

			collectedFiles.forEach(fileToAttach => {
				const attachmentId = createAttachmentId()
				const kind: AttachmentKind = options.voice ? 'voice' : detectAttachmentKind(fileToAttach)

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
						const result = typeof reader.result === 'string' ? reader.result : null
						if (result) {
							setAttachments(prev =>
								prev.map(att =>
									att.id === attachmentId ? { ...att, previewUrl: result } : att
								)
							)
						}
					}
					reader.readAsDataURL(fileToAttach)
				}

				void uploadAttachment(fileToAttach, attachmentId)
			})
		},
		[token, uploadAttachment]
	)

	const handlePaste = useCallback(
		(event: React.ClipboardEvent<HTMLTextAreaElement>) => {
			const items = event.clipboardData?.items
			if (!items || !token) return

			let handled = false

			for (const item of items) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const originalFile = item.getAsFile()
					if (!originalFile) continue

					const fileName =
						originalFile.name && originalFile.name.trim().length > 0
							? originalFile.name
							: `screenshot-${Date.now()}.png`

					const normalizedFile = new File([originalFile], fileName, {
						type: originalFile.type,
					})

					handled = true
					handleFileChange(normalizedFile)
				}
			}

			if (handled) {
				event.preventDefault()
				event.stopPropagation()
			}
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

					setMicrophoneMenuOpen(false)
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
			alert('Не удалось получить доступ к микрофону. Проверьте настройки браузера.')
		}
	}, [clearVoiceState, isRecording, selectedMicrophoneId])

	const cancelRecording = useCallback(async () => {
		await stopRecording(false)
		clearVoiceState()
		setRecordingTime(0)
		setMicrophoneMenuOpen(false)
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
						textarea.setSelectionRange(start + emoji.length, start + emoji.length)
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
const hasPendingAttachment = attachments.some(att => att.status === 'uploading')
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


	const createAttachmentId = () =>
		`att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

	const detectAttachmentKind = (file: File): AttachmentKind => {
		const type = file.type
		if (type.startsWith('image/')) return 'image'
		if (type.startsWith('video/')) return 'video'
		if (type.startsWith('audio/')) return 'audio'
		return 'document'
	}

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

		if (voiceAttachment.audioPreviewUrl && audioPreviewUrl !== voiceAttachment.audioPreviewUrl) {
			setAudioPreviewUrl(prev => {
				if (prev && prev !== voiceAttachment.audioPreviewUrl) {
					URL.revokeObjectURL(prev)
				}
				return voiceAttachment.audioPreviewUrl ?? null
			})
		}
	}, [attachments, audioPreviewUrl, voiceMetadata])

	const removeAttachment = useCallback((attachmentId: string) => {
		const existing = attachmentsRef.current.find(att => att.id === attachmentId)

		const xhr = attachmentUploadsRef.current.get(attachmentId)
		if (xhr) {
			xhr.abort()
			attachmentUploadsRef.current.delete(attachmentId)
		}

		if (existing?.audioPreviewUrl) {
			URL.revokeObjectURL(existing.audioPreviewUrl)
		}

		if (existing?.kind === 'voice') {
			clearVoiceState()
		}

		setAttachments(prev => prev.filter(att => att.id !== attachmentId))
	}, [clearVoiceState])

	const retryAttachment = useCallback(
		(attachmentId: string) => {
			const existing = attachmentsRef.current.find(att => att.id === attachmentId)
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
			const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
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
			}}
		>
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

			{/* Вложения */}
			{attachments.length > 0 && (
				<div className='mb-3 space-y-3'>
					{attachments.map(attachment => {
						const isUploading = attachment.status === 'uploading'
						const isError = attachment.status === 'error'
						const progress = Math.round(attachment.uploadProgress)
						const isVoice = attachment.kind === 'voice'
						const isActiveVoice = isVoice && attachment.audioPreviewUrl === audioPreviewUrl

						if (isVoice) {
							const waveform = attachment.voiceMetadata?.waveform ?? []
							const totalDuration = attachment.voiceMetadata?.duration ?? voiceDuration
							const currentTime = isActiveVoice ? voiceCurrentTime : 0
							const progressRatio = totalDuration ? Math.min(currentTime / totalDuration, 1) : 0
							const activeBars = Math.floor(progressRatio * waveform.length)

							return (
								<div
									key={attachment.id}
									className='rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm px-4 py-3 shadow-lg'
								>
									<div className='flex items-center gap-3'>
								<button
									type='button'
									onClick={() => {
												if (audioRef.current) {
													if (!isActiveVoice && attachment.audioPreviewUrl) {
														if (audioPreviewUrl && audioPreviewUrl !== attachment.audioPreviewUrl) {
															URL.revokeObjectURL(audioPreviewUrl)
														}
														audioRef.current.src = attachment.audioPreviewUrl
													}
												}
												if (!audioRef.current && attachment.audioPreviewUrl) {
													const element = new Audio(attachment.audioPreviewUrl)
													audioRef.current = element
												}
												if (audioRef.current) {
													toggleVoicePlayback()
												}
											}}
											className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors duration-200 ${
												isActiveVoice && isVoicePlaying
													? 'border-red-400 text-red-200 bg-red-500/20'
													: 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
											}`}
											disabled={isUploading || sending || !attachment.audioPreviewUrl}
											aria-label={isActiveVoice && isVoicePlaying ? 'Пауза' : 'Воспроизвести голосовое сообщение'}
										>
											{isActiveVoice && isVoicePlaying ? <Pause className='w-5 h-5' /> : <Play className='w-5 h-5' />}
								</button>
										<div className='flex-1 min-w-0'>
											<div className='flex items-center justify-between text-[11px] uppercase tracking-wide text-emerald-200/80'>
												<span>{formatDuration(currentTime)}</span>
												<span>{formatDuration(totalDuration || 0)}</span>
							</div>
											<div
												className='mt-2 relative flex items-end h-16 cursor-pointer select-none'
												onClick={handleVoiceSeek}
											>
												<div className='absolute inset-0 bg-emerald-500/10 rounded-lg' />
												<div
													className='absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-emerald-500/40 rounded-lg pointer-events-none'
													style={{ width: `${progressRatio * 100}%` }}
												/>
												<div className='relative flex items-end gap-[2px] h-full w-full'>
													{waveform.length > 0 ? (
														waveform.map((value, index) => (
															<div
																key={index}
																className={`flex-1 rounded-full transition-colors duration-150 ${
																	index <= activeBars ? 'bg-emerald-400' : 'bg-emerald-500/25'
																}`}
																style={{ height: `${Math.max(12, value * 56)}px` }}
															/>
														))
													) : (
														<div className='h-3 w-full rounded-full bg-emerald-500/30' />
													)}
												</div>
											</div>
											{isUploading && (
												<div className='mt-2 w-full bg-emerald-500/10 rounded-full h-1 overflow-hidden'>
													<div
														className='h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-200'
														style={{ width: `${progress}%` }}
													/>
												</div>
											)}
											<div className='mt-2 text-xs text-gray-400 truncate'>{getTruncatedFileName(attachment.name)}</div>
											</div>
										<div className='flex flex-col justify-between items-end gap-2'>
											<div className='flex items-center gap-2 text-xs text-gray-400'>
												<span>{formatFileSize(attachment.size)}</span>
												{isUploading && <span>· {progress}%</span>}
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
													<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
														<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
											</svg>
										</button>
									</div>
							</div>
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
										className='w-16 h-16 rounded-xl object-cover border border-slate-700/60'
									/>
								)
							}

							if (attachment.kind === 'video') {
								return (
									<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
										<svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z' />
										</svg>
									</div>
								)
							}

							if (attachment.kind === 'audio') {
								return (
									<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
										<svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19V6l12-2v13M5 11v8m-2-8h4' />
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
								className={`rounded-2xl border ${isError ? 'border-red-400/60 bg-red-500/5' : 'border-slate-700/60 bg-slate-800/60'} backdrop-blur-sm px-4 py-3 shadow-lg`}
							>
								<div className='flex items-center gap-3'>
									{renderPreview()}
									<div className='flex-1 min-w-0'>
										<div className='flex items-center justify-between gap-3'>
											<div className='min-w-0'>
												<div className='text-sm font-semibold text-slate-100 truncate'>{getTruncatedFileName(attachment.name)}</div>
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
													<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
														<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
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
												<svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
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
			<div className='flex items-end gap-2'>
				<label 
					className='group cursor-pointer flex-shrink-0 w-11 h-11 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-700/80 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button touch-manipulation transition-all duration-200 active:scale-95'
					style={{ position: 'relative', zIndex: 20, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
						<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13' />
					</svg>
				</label>

				<div className='flex-1 relative' style={{ position: 'relative', zIndex: 10 }}>
					<textarea
						ref={textareaRef}
						value={message}
						onChange={handleMessageChange}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								if (!sendDisabled) {
								handleSubmit(e as any)
								}
							}
						}}
						onTouchStart={(e) => {
							e.stopPropagation()
						}}
						onTouchEnd={(e) => {
							e.stopPropagation()
							if (textareaRef.current) {
								textareaRef.current.focus()
							}
						}}
						onClick={(e) => {
							e.stopPropagation()
						}}
						onPaste={handlePaste}
						placeholder='Напишите сообщение...'
						rows={1}
						className='w-full px-3 py-2.5 bg-slate-700/55 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white text-sm sm:text-base placeholder-gray-500 focus:border-emerald-400/60 focus:outline-none focus:bg-slate-700/75 focus-visible:outline-none focus-visible:ring-0 resize-none custom-scrollbar shadow-md hover:border-slate-500/70 transition-all duration-200 ease-out'
						disabled={sending}
						style={{ 
							height: '40px',
							minHeight: '40px', 
							maxHeight: '140px',
							lineHeight: '1.5',
							overflow: 'auto',
							transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
							outline: 'none',
							outlineOffset: '0',
							boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
							WebkitAppearance: 'none',
							appearance: 'none',
							fontFamily: "'Inter', 'Poppins', system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif",
							position: 'relative',
							zIndex: 10,
							touchAction: 'manipulation',
							WebkitTapHighlightColor: 'transparent',
							pointerEvents: 'auto',
						} as React.CSSProperties}
					/>
				</div>

				{/* Кнопка эмоджи */}
				<div className='relative' ref={emojiPickerRef} style={{ position: 'relative', zIndex: 20 }}>
					<button
						ref={emojiButtonRef}
						type='button'
						onClick={(e) => {
							e.stopPropagation()
							setShowEmojiPicker(prev => !prev)
						}}
						onTouchStart={(e) => {
							e.stopPropagation()
						}}
						className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border ${
							showEmojiPicker ? 'border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'border-slate-600/50'
						} hover:border-emerald-400/50 hover:bg-slate-700/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button text-2xl touch-manipulation transition-all duration-200 active:scale-95`}
						style={{ 
							minHeight: '44px', 
							minWidth: '44px',
							touchAction: 'manipulation',
							WebkitTapHighlightColor: 'transparent',
							pointerEvents: 'auto',
						}}
						aria-label="Эмодзи"
					>
						😊
					</button>
					{showEmojiPicker && typeof window !== 'undefined' &&
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
										width: isMobileView ? Math.min(280, viewportWidth - 24) : 260,
									}}
									onClick={(e) => e.stopPropagation()}
								>
									<div className='bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-3 animate-scaleFadeIn'>
										<div className='grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar'>
											{emojiList.map((emoji) => (
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
						)
					}
				</div>

				{/* Кнопка шаблонов */}
				{showTemplatesButton && (
				<button
					type='button'
					onClick={(e) => {
						e.stopPropagation()
						setShowTemplatesModal(true)
					}}
					onTouchStart={(e) => {
						e.stopPropagation()
					}}
					className='flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:border-emerald-400/50 hover:bg-slate-700/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] ios-button touch-manipulation transition-all duration-200 active:scale-95'
					style={{ 
						minHeight: '44px', 
						minWidth: '44px',
						touchAction: 'manipulation',
						WebkitTapHighlightColor: 'transparent',
						pointerEvents: 'auto',
					}}
					title="Шаблоны сообщений"
					aria-label="Шаблоны сообщений"
				>
					<FileText className='w-5 h-5 text-emerald-400' />
				</button>
				)}

				{/* Кнопка отправки и меню микрофона */}
				<div className='relative flex flex-col items-center gap-1'>
					<div className='flex items-center gap-1'>
				<button
					type='submit'
							disabled={sendDisabled}
					onTouchStart={(e) => {
						e.stopPropagation()
					}}
					onClick={(e) => {
						e.stopPropagation()
					}}
					className='flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ios-button shadow-md hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center touch-manipulation border border-emerald-400/30 transition-all duration-200'
					style={{ 
						minHeight: '44px', 
						minWidth: '44px',
						position: 'relative',
						zIndex: 20,
						touchAction: 'manipulation',
						WebkitTapHighlightColor: 'transparent',
						pointerEvents: 'auto',
					}}
							title={sendButtonTitle}
				>
					{sending ? (
								<svg className='animate-spin w-5 h-5' fill='none' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938л3-2.647z'></path>
						</svg>
					) : (
								<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
							<path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
						</svg>
					)}
				</button>

						<button
							type='button'
							ref={microphoneButtonRef}
							onClick={() => {
								setMicrophoneMenuOpen(prev => !prev)
							}}
							onTouchStart={(e) => {
								e.stopPropagation()
							}}
							className='w-8 h-11 flex items-center justify-center rounded-xl border border-emerald-400/30 bg-slate-700/50 hover:bg-slate-700/70 text-emerald-300 transition-all duration-200 active:scale-95'
							style={{
								minHeight: '44px',
								touchAction: 'manipulation',
								WebkitTapHighlightColor: 'transparent',
							}}
							title='Настройки голосового сообщения'
							aria-label='Настройки голосового сообщения'
						>
							<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${microphoneMenuOpen ? 'rotate-180' : ''}`} />
						</button>
					</div>

					{microphoneMenuOpen && (
						<div
							ref={microphoneMenuRef}
							className='absolute bottom-[calc(100%+0.5rem)] right-0 w-64 sm:w-72 bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-4 space-y-3 animate-fadeIn'
						>
							<div className='flex items-center gap-2 text-sm font-semibold text-emerald-200'>
								<Mic className='w-4 h-4' />
								<span>Голосовые сообщения</span>
							</div>
							<div className='space-y-2 text-xs text-gray-300'>
								<label className='block text-[11px] uppercase tracking-wider text-gray-400'>
									Микрофон
								</label>
								{audioDevices.length > 0 ? (
									<select
										value={selectedMicrophoneId}
										onChange={e => setSelectedMicrophoneId(e.target.value)}
										className='w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-sm text-gray-200 focus:outline-none focus:border-emerald-400/60 transition'
									>
										<option value='default'>Системный (по умолчанию)</option>
										{audioDevices.map((device, index) => (
											<option key={device.deviceId || `${index}-device`} value={device.deviceId || 'default'}>
												{device.label || `Микрофон ${index + 1}`}
											</option>
										))}
									</select>
								) : (
									<div className='px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-gray-400'>
										Микрофоны не найдены. Убедитесь, что предоставили доступ в браузере.
									</div>
								)}
							</div>
							<div className='space-y-2'>
								<button
									type='button'
									onClick={() => {
										if (isRecording) {
											stopRecording(true).catch((err) => console.error('Ошибка остановки записи:', err))
										} else {
											startRecording().catch((err) => console.error('Ошибка запуска записи:', err))
										}
									}}
									className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
										isRecording
											? 'bg-red-500/20 text-red-200 border border-red-400/40 hover:bg-red-500/30'
											: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/25'
									}`}
								>
									{isRecording ? (
										<>
											<span className='inline-flex w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse'></span>
											<span>Остановить и сохранить</span>
										</>
									) : (
										<>
											<Mic className='w-4 h-4' />
											<span>Записать голосовое</span>
										</>
									)}
								</button>
								{isRecording && (
									<>
										<div className='text-[11px] text-emerald-200 text-right'>
											{formatDuration(recordingTime)}
										</div>
										<button
											type='button'
											onClick={() => cancelRecording().catch((err) => console.error('Ошибка отмены записи:', err))}
											className='w-full text-xs text-gray-400 hover:text-gray-200 transition'
										>
											Отменить запись
										</button>
									</>
								)}
								{voiceMetadata && !isRecording && (
									<div className='text-[11px] text-emerald-200'>
										Голосовое сообщение готово к отправке
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</form>

		{/* Модальное окно шаблонов */}
		<MessageTemplatesModal
			isOpen={showTemplatesModal}
			onClose={() => setShowTemplatesModal(false)}
			onSelectTemplate={(content) => {
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
	</>
	)
}
