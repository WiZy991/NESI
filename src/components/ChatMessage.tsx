'use client'

import { useUser } from '@/context/UserContext'
import { copyToClipboard } from '@/lib/copyToClipboard'
import {
	Archive,
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	Download,
	Edit,
	File,
	FileAudio,
	FileImage,
	FileText,
	FileVideo,
	Link as LinkIcon,
	Reply,
	Smile,
	Trash2,
	X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import VideoPlayer from './VideoPlayer'
import VoicePlayer from './VoicePlayer'

type Props = {
	message: {
		id: string
		content: string
		createdAt: string
		editedAt?: string | null // Дата редактирования
		fileId?: string
		fileUrl?: string // URL файла (может быть готовым или построенным из fileId)
		fileName?: string
		fileMimetype?: string
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
	chatType: 'private' | 'task'
	showSenderName?: boolean // Показывать ли имя отправителя
	isFirstInGroup?: boolean // Первое ли сообщение в группе
	isLastInGroup?: boolean // Последнее ли сообщение в группе
	onMessageUpdate?: (updatedMessage: any) => void
	onMessageDelete?: (messageId: string) => void
	onReply?: (messageId: string) => void // Callback для ответа на сообщение
}

type VoiceMessagePayload = {
	type: 'voice'
	duration: number
	waveform: number[]
}

export default function ChatMessage({
	message,
	chatType,
	showSenderName = true,
	isFirstInGroup = true,
	isLastInGroup = true,
	onMessageUpdate,
	onMessageDelete,
	onReply,
}: Props) {
	const { user, token } = useUser()
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(message.content)
	const [showMenu, setShowMenu] = useState(false)
	const [showReactionPicker, setShowReactionPicker] = useState(false)
	const [showExtendedReactions, setShowExtendedReactions] = useState(false)
	const [expandReactionsUpward, setExpandReactionsUpward] = useState(false)
	const [reactions, setReactions] = useState(message.reactions || [])
	const [showImageModal, setShowImageModal] = useState(false)
	const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
	const [reactionPickerPosition, setReactionPickerPosition] = useState({
		x: 0,
		y: 0,
	})
	const menuRef = useRef<HTMLDivElement>(null)
	const reactionPickerRef = useRef<HTMLDivElement>(null)
	const reactionButtonRef = useRef<HTMLButtonElement>(null)
	const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
	const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
	const messageRef = useRef<HTMLDivElement>(null)
	const reactionsContainerRef = useRef<HTMLDivElement>(null)
	const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640

	// Обновляем реакции при изменении сообщения
	useEffect(() => {
		setReactions(message.reactions || [])
	}, [message.reactions])

	// ЕДИНАЯ ФУНКЦИЯ ПРОВЕРКИ: является ли сообщение голосовым
	const checkIsVoiceMessage = useCallback(
		(content: string | undefined): boolean => {
			if (!content || typeof content !== 'string') return false
			try {
				// Сначала пробуем распарсить как есть
				let parsed
				try {
					parsed = JSON.parse(content)
				} catch {
					// Если не получилось, пробуем заменить экранированные кавычки
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
		},
		[]
	)

	// Используем fileUrl напрямую, если он есть, иначе строим из fileId
	// НО для голосовых сообщений fileUrl нужен только для воспроизведения
	const fileUrl =
		message.fileUrl || (message.fileId ? `/api/files/${message.fileId}` : null)

	const voiceMeta = useMemo<VoiceMessagePayload | null>(() => {
		if (!message.content) return null
		if (typeof message.content !== 'string') return null
		try {
			// Сначала пробуем распарсить как есть
			let parsed
			try {
				parsed = JSON.parse(message.content)
			} catch {
				// Если не получилось, пробуем заменить экранированные кавычки
				const unescaped = message.content.replace(/&quot;/g, '"')
				parsed = JSON.parse(unescaped)
			}

			if (
				parsed &&
				parsed.type === 'voice' &&
				typeof parsed.duration === 'number' &&
				Array.isArray(parsed.waveform)
			) {
				const sanitizedWaveform = parsed.waveform
					.map((value: any) =>
						Number.isFinite(Number(value))
							? Math.min(1, Math.max(0, Number(value)))
							: 0
					)
					.slice(0, 128)
				return {
					type: 'voice',
					duration: Math.max(0, Number(parsed.duration)),
					waveform: sanitizedWaveform.length > 0 ? sanitizedWaveform : [0.1],
				}
			}
		} catch (error) {
			// not a voice message
			console.log(
				'❌ voiceMeta parse error:',
				error,
				message.content?.substring(0, 100)
			)
		}
		return null
	}, [message.content])

	const replyVoiceMeta = useMemo(() => {
		if (!message.replyTo?.content) return null
		try {
			const parsed = JSON.parse(message.replyTo.content)
			if (parsed?.type === 'voice') return parsed
		} catch (error) {
			return null
		}
		return null
	}, [message.replyTo?.content])

	// Проверяем, является ли сообщение голосовым - более надежная проверка
	const isVoiceMessageContent = useMemo(() => {
		return checkIsVoiceMessage(message.content)
	}, [message.content, checkIsVoiceMessage])

	const isVoiceMessage = useMemo(() => {
		// Если есть voiceMeta или content содержит голосовое сообщение, это голосовое сообщение
		if (voiceMeta) return true
		if (isVoiceMessageContent) return true
		return false
	}, [voiceMeta, isVoiceMessageContent])

	// ГЛАВНАЯ ПРОВЕРКА: является ли это голосовым сообщением (используется везде)
	// УПРОЩЕННАЯ ЛОГИКА: проверяем напрямую все возможные признаки голосового сообщения
	const isVoice = useMemo(() => {
		// 1. Проверяем voiceMeta (уже распарсенные метаданные)
		if (voiceMeta) {
			console.log('🎙️ isVoice = true (voiceMeta)', message.id, voiceMeta)
			return true
		}

		// 0.5. Если voiceMeta еще не распарсен, но content содержит признаки голосового сообщения, пробуем распарсить
		if (message.content && typeof message.content === 'string') {
			const hasVoiceType =
				message.content.includes('"type":"voice"') ||
				message.content.includes('"type": "voice"') ||
				message.content.includes('&quot;type&quot;:&quot;voice&quot;') ||
				message.content.includes('&quot;type&quot;: &quot;voice&quot;')
			const hasWaveform =
				message.content.includes('"waveform"') ||
				message.content.includes('&quot;waveform&quot;')

			if (hasVoiceType && hasWaveform) {
				// Пробуем распарсить напрямую
				try {
					let parsed
					try {
						parsed = JSON.parse(message.content)
					} catch {
						const unescaped = message.content.replace(/&quot;/g, '"')
						parsed = JSON.parse(unescaped)
					}

					if (
						parsed &&
						parsed.type === 'voice' &&
						Array.isArray(parsed.waveform)
					) {
						console.log('🎙️ isVoice = true (direct parse)', message.id)
						return true
					}
				} catch {}
			}
		}

		// 2. Проверяем content - если это JSON с type: 'voice' и waveform
		if (message.content && typeof message.content === 'string') {
			// Быстрая проверка по строке (учитываем экранированные кавычки)
			const hasVoiceType =
				message.content.includes('"type":"voice"') ||
				message.content.includes('"type": "voice"') ||
				message.content.includes('&quot;type&quot;:&quot;voice&quot;') ||
				message.content.includes('&quot;type&quot;: &quot;voice&quot;')
			const hasWaveform =
				message.content.includes('"waveform"') ||
				message.content.includes('&quot;waveform&quot;')

			if (hasVoiceType && hasWaveform) {
				// Полная проверка через функцию (с парсингом JSON)
				if (checkIsVoiceMessage(message.content)) {
					console.log('🎙️ isVoice = true (content check)', message.id)
					return true
				}
			}
		}

		// 3. Проверяем fileMimetype - если это аудио файл И content содержит voice метаданные
		const isAudioFile = message.fileMimetype?.startsWith('audio/') || false
		if (isAudioFile && message.content && typeof message.content === 'string') {
			const hasVoiceType =
				message.content.includes('"type":"voice"') ||
				message.content.includes('"type": "voice"') ||
				message.content.includes('&quot;type&quot;:&quot;voice&quot;') ||
				message.content.includes('&quot;type&quot;: &quot;voice&quot;')
			const hasWaveform =
				message.content.includes('"waveform"') ||
				message.content.includes('&quot;waveform&quot;')

			if (hasVoiceType && hasWaveform) {
				if (checkIsVoiceMessage(message.content)) {
					console.log(
						'🎙️ isVoice = true (audio file + voice content)',
						message.id
					)
					return true
				}
			}
		}

		console.log('🎙️ isVoice = false', message.id, {
			hasVoiceMeta: !!voiceMeta,
			hasContent: !!message.content,
			contentType: typeof message.content,
			hasVoiceType: message.content?.includes('"type":"voice"'),
			hasWaveform: message.content?.includes('"waveform"'),
			fileMimetype: message.fileMimetype,
			isAudioFile: message.fileMimetype?.startsWith('audio/'),
		})
		return false
	}, [
		voiceMeta,
		message.content,
		message.fileMimetype,
		message.id,
		checkIsVoiceMessage,
	])

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [isVoicePlaying, setIsVoicePlaying] = useState(false)
	const [voiceCurrentTime, setVoiceCurrentTime] = useState(0)
	const [voiceDuration, setVoiceDuration] = useState<number>(
		voiceMeta?.duration || 0
	)

	// Определяем тип файла по MIME-типу или по расширению
	const getFileType = useMemo(() => {
		// Голосовые сообщения обрабатываются отдельно, не как обычные файлы
		if (isVoice) return 'voice'
		if (message.fileMimetype) {
			if (message.fileMimetype.startsWith('image/')) return 'image'
			if (message.fileMimetype.startsWith('video/')) return 'video'
			if (message.fileMimetype.startsWith('audio/')) return 'audio'
		}
		// Если MIME-тип не определен, проверяем по расширению
		if (message.fileName) {
			const ext = message.fileName.split('.').pop()?.toLowerCase()
			if (
				['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')
			)
				return 'image'
			if (
				['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'm4v', 'flv'].includes(
					ext || ''
				)
			)
				return 'video'
			if (['ogg', 'mp3', 'wav', 'm4a'].includes(ext || '')) return 'audio'
		}
		return 'file'
	}, [isVoice, message.fileMimetype, message.fileName])

	const fileType = getFileType
	const isImage = fileType === 'image'
	const isVideo = fileType === 'video'
	const isAudio = fileType === 'audio'
	// Голосовые сообщения не должны отображаться как файлы
	const isVoiceFile = fileType === 'voice'
	const isOwnMessage = user?.id === message.sender.id
	const isDeleted = message.content === '[Сообщение удалено]'
	const isEdited = message.editedAt && message.editedAt !== message.createdAt
	const canEditMessage = isOwnMessage && !isDeleted && !isVoiceMessage

	// Закрытие модального окна по Escape
	useEffect(() => {
		if (!showImageModal) return

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setShowImageModal(false)
			}
		}

		window.addEventListener('keydown', handleEscape)
		return () => window.removeEventListener('keydown', handleEscape)
	}, [showImageModal])

	// Логирование для отладки файлов
	useEffect(() => {
		if (fileUrl || message.fileId) {
			console.log('📎 Данные файла в сообщении:', {
				messageId: message.id,
				fileId: message.fileId,
				fileUrl: message.fileUrl,
				builtFileUrl: fileUrl,
				fileName: message.fileName,
				fileMimetype: message.fileMimetype,
				fileType: fileType,
				isImage,
				isVideo,
			})
		}
	}, [
		message.id,
		fileUrl,
		message.fileId,
		message.fileUrl,
		message.fileName,
		message.fileMimetype,
		fileType,
		isImage,
		isVideo,
	])

	// Проверка, состоит ли сообщение только из эмодзи
	const isOnlyEmoji = (text: string): boolean => {
		if (!text || !text.trim()) return false
		const trimmed = text.trim()

		// Убираем все пробелы для проверки
		const withoutSpaces = trimmed.replace(/\s/g, '')
		if (withoutSpaces.length === 0) return false

		// ИСКЛЮЧАЕМ: если есть цифры, буквы или другие не-эмодзи символы - это НЕ только эмодзи
		// Проверяем наличие обычных символов (цифры, буквы, знаки препинания)
		const hasRegularChars =
			/[0-9a-zA-Zа-яА-ЯёЁ.,!?;:()\-_=+*&%$#@<>[\]{}|\\\/"'`~]/u.test(
				withoutSpaces
			)
		if (hasRegularChars) {
			return false
		}

		// Если текст очень короткий (1-10 символов), проверяем что это эмодзи
		if (withoutSpaces.length <= 10) {
			try {
				// Проверка через Unicode property escapes - самый надежный способ
				// Используем более строгий паттерн, который проверяет что ВСЕ символы - эмодзи
				const emojiRegex = /\p{Emoji}/gu
				const allChars = [...withoutSpaces]
				const emojiMatches = allChars.filter(char => {
					// Проверяем каждый символ отдельно
					return /\p{Emoji}/u.test(char)
				})

				// ВСЕ символы должны быть эмодзи, без исключений
				if (
					emojiMatches.length === allChars.length &&
					allChars.length > 0 &&
					allChars.length <= 10
				) {
					return true
				}
			} catch (e) {
				// Fallback для браузеров без поддержки Unicode property escapes
			}

			// Альтернативная проверка через кодпоинты
			// ИСКЛЮЧАЕМ обычные символы (цифры, буквы)
			const codePoints = [...withoutSpaces].map(c => c.codePointAt(0) || 0)

			// Проверяем что НЕТ обычных символов
			const hasRegularCodePoints = codePoints.some(
				cp =>
					(cp >= 0x30 && cp <= 0x39) || // Цифры 0-9
					(cp >= 0x41 && cp <= 0x5a) || // Латинские заглавные A-Z
					(cp >= 0x61 && cp <= 0x7a) || // Латинские строчные a-z
					(cp >= 0x410 && cp <= 0x44f) || // Кириллица
					(cp >= 0x400 && cp <= 0x4ff) // Доп. кириллица
			)

			if (hasRegularCodePoints) {
				return false
			}

			// Проверяем что ВСЕ символы - эмодзи
			const emojiCodePoints = codePoints.filter(
				cp =>
					(cp >= 0x1f300 && cp <= 0x1f9ff) || // Emoticons & Symbols
					(cp >= 0x2600 && cp <= 0x26ff) || // Miscellaneous Symbols
					(cp >= 0x2700 && cp <= 0x27bf) || // Dingbats
					(cp >= 0x1f600 && cp <= 0x1f64f) || // Emoticons (faces)
					(cp >= 0x1f900 && cp <= 0x1f9ff) || // Supplemental Symbols and Pictographs
					cp === 0xfe0f || // Variation Selector-16
					(cp >= 0x1f1e6 && cp <= 0x1f1ff) // Regional Indicator Symbols (флаги)
			)

			// ВСЕ символы должны быть эмодзи
			return (
				emojiCodePoints.length === codePoints.length &&
				codePoints.length > 0 &&
				codePoints.length <= 10
			)
		}

		return false
	}

	const containsOnlyEmoji = Boolean(
		message.content &&
			!fileUrl &&
			!message.replyTo &&
			!isDeleted &&
			!isVoiceMessage &&
			isOnlyEmoji(message.content)
	)

	// Функция для форматирования размера файла
	const formatFileSize = (bytes?: number) => {
		if (!bytes) return ''
		if (bytes < 1024) return `${bytes} Б`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
		return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
	}

	const formatVoiceTime = useCallback((seconds: number) => {
		const total = Math.max(0, Math.floor(seconds))
		const mins = Math.floor(total / 60)
		const secs = total % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}, [])

	useEffect(() => {
		if (!isVoiceMessage || !fileUrl) {
			return
		}

		const audioElement = document.createElement('audio')
		audioElement.src = fileUrl
		audioElement.preload = 'metadata'
		audioRef.current = audioElement

		const handleLoadedMetadata = () => {
			setVoiceDuration(audioElement.duration || voiceMeta?.duration || 0)
		}

		const handleTimeUpdate = () => {
			setVoiceCurrentTime(audioElement.currentTime)
		}

		const handleEnded = () => {
			setIsVoicePlaying(false)
			setVoiceCurrentTime(audioElement.duration || 0)
		}

		audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
		audioElement.addEventListener('timeupdate', handleTimeUpdate)
		audioElement.addEventListener('ended', handleEnded)

		return () => {
			audioElement.pause()
			audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audioElement.removeEventListener('timeupdate', handleTimeUpdate)
			audioElement.removeEventListener('ended', handleEnded)
			audioRef.current = null
		}
	}, [fileUrl, isVoiceMessage, voiceMeta])

	const toggleVoicePlayback = useCallback(() => {
		if (!audioRef.current) return

		const audio = audioRef.current
		if (audio.paused) {
			const playPromise = audio.play()
			if (playPromise && typeof playPromise.then === 'function') {
				playPromise
					.then(() => {
						setIsVoicePlaying(true)
					})
					.catch(() => {
						toast.error('Не удалось воспроизвести голосовое сообщение')
					})
			} else {
				setIsVoicePlaying(true)
			}
		} else {
			audio.pause()
			setIsVoicePlaying(false)
		}
	}, [])

	useEffect(() => {
		if (!isVoicePlaying && audioRef.current) {
			audioRef.current.pause()
		}
	}, [isVoicePlaying])

	// Функция для определения типа файла и получения иконки
	const getFileIcon = (mimetype?: string, fileName?: string) => {
		if (!mimetype && !fileName) return File

		const extension = fileName?.split('.').pop()?.toLowerCase() || ''

		if (mimetype?.startsWith('image/')) return FileImage
		if (mimetype?.startsWith('video/')) return FileVideo
		if (mimetype?.startsWith('audio/')) return FileAudio
		if (mimetype === 'application/pdf' || extension === 'pdf') return FileText
		if (
			mimetype?.includes('zip') ||
			mimetype?.includes('rar') ||
			mimetype?.includes('7z') ||
			['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)
		)
			return Archive
		if (
			mimetype?.includes('word') ||
			mimetype?.includes('document') ||
			['doc', 'docx', 'odt'].includes(extension)
		)
			return FileText
		if (
			mimetype?.includes('excel') ||
			mimetype?.includes('spreadsheet') ||
			['xls', 'xlsx', 'ods'].includes(extension)
		)
			return FileText

		return File
	}

	// Функция для декодирования HTML entities
	const decodeHtmlEntities = (text: string): string => {
		if (!text) return text
		
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
		return decoded
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
	}

	// Функция для парсинга ссылок в тексте
	const parseLinks = (text: string) => {
		if (!text) return []

		// Декодируем HTML entities перед обработкой
		const decodedText = decodeHtmlEntities(text)

		// Регулярное выражение для поиска URL (с протоколом и без)
		const urlRegex =
			/(https?:\/\/[^\s<>"']+)|(www\.[^\s<>"']+)|([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}[^\s<>"']*/g
		const parts: Array<{ type: 'text' | 'link'; content: string }> = []
		let lastIndex = 0
		let match

		while ((match = urlRegex.exec(decodedText)) !== null) {
			// Добавляем текст до ссылки
			if (match.index > lastIndex) {
				parts.push({
					type: 'text',
					content: decodedText.substring(lastIndex, match.index),
				})
			}

			// Формируем полный URL
			let url = match[0]
			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				url = 'https://' + url
			}

			// Добавляем ссылку
			parts.push({
				type: 'link',
				content: url,
			})

			lastIndex = match.index + match[0].length
		}

		// Добавляем оставшийся текст
		if (lastIndex < decodedText.length) {
			parts.push({
				type: 'text',
				content: decodedText.substring(lastIndex),
			})
		}

		return parts.length > 0 ? parts : [{ type: 'text', content: decodedText }]
	}

	// Рендер текста с ссылками
	const renderTextWithLinks = (text: string) => {
		const parts = parseLinks(text)

		return parts.map((part, index) => {
			if (part.type === 'link') {
				// Показываем оригинальный текст ссылки без протокола для красоты
				const displayText = part.content
					.replace(/^https?:\/\//, '')
					.replace(/\/$/, '')
				return (
					<a
						key={index}
						href={part.content}
						target='_blank'
						rel='noopener noreferrer'
						className={`underline break-all hover:opacity-80 transition-opacity ${
							isOwnMessage ? 'text-blue-200' : 'text-blue-400'
						}`}
						onClick={e => e.stopPropagation()}
						style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
					>
						{displayText}
					</a>
				)
			}
			return <span key={index}>{part.content}</span>
		})
	}

	// Логирование для отладки ответов
	useEffect(() => {
		if (message.replyTo) {
			console.log('📎 Сообщение с ответом:', {
				messageId: message.id,
				replyTo: message.replyTo,
				hasContent: !!message.replyTo.content,
				hasSender: !!message.replyTo.sender,
			})
		}
	}, [message.replyTo, message.id])

	// Обработчик контекстного меню (ПКМ)
	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight
		const menuWidth = 200
		const menuHeight = 220
		const offset = 8

		let finalX = e.clientX
		let finalY = e.clientY

		if (finalX + menuWidth > viewportWidth - offset) {
			finalX = viewportWidth - menuWidth - offset
		}
		if (finalX < offset) {
			finalX = offset
		}

		if (finalY + menuHeight > viewportHeight - offset) {
			finalY = viewportHeight - menuHeight - offset
		}
		if (finalY < offset) {
			finalY = offset
		}

		setMenuPosition({ x: finalX, y: finalY })
		setShowMenu(true)
	}

	// Обработчик долгого нажатия на мобильных
	const handleTouchStart = (e: React.TouchEvent) => {
		const touch = e.touches[0]
		if (!touch) return

		touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }

		touchTimerRef.current = setTimeout(() => {
			const activeTouch = e.touches[0] || e.changedTouches[0]
			if (!activeTouch) return

			const dx = Math.abs(
				activeTouch.clientX -
					(touchStartPosRef.current?.x ?? activeTouch.clientX)
			)
			const dy = Math.abs(
				activeTouch.clientY -
					(touchStartPosRef.current?.y ?? activeTouch.clientY)
			)
			if (dx > 15 || dy > 15) {
				touchStartPosRef.current = null
				return
			}

			e.preventDefault()

			const viewportWidth = window.innerWidth
			const viewportHeight = window.innerHeight
			const menuWidth = 200
			const menuHeight = 220
			const offset = 8

			let finalX = activeTouch.clientX
			let finalY = activeTouch.clientY

			if (finalX + menuWidth > viewportWidth - offset) {
				finalX = viewportWidth - menuWidth - offset
			}
			if (finalX < offset) {
				finalX = offset
			}

			if (finalY + menuHeight > viewportHeight - offset) {
				finalY = viewportHeight - menuHeight - offset
			}
			if (finalY < offset) {
				finalY = offset
			}

			setMenuPosition({ x: finalX, y: finalY })
			setShowMenu(true)
			touchStartPosRef.current = null
		}, 450)
	}

	const handleTouchEnd = () => {
		if (touchTimerRef.current) {
			clearTimeout(touchTimerRef.current)
			touchTimerRef.current = null
		}
		touchStartPosRef.current = null
	}

	const handleTouchMove = () => {
		if (touchTimerRef.current) {
			clearTimeout(touchTimerRef.current)
			touchTimerRef.current = null
		}
		touchStartPosRef.current = null
	}

	// Закрытие меню и пикера реакций при клике вне их
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent | TouchEvent) => {
			const target = event.target as Node

			// Проверяем, был ли клик внутри пикера реакций
			const clickedOnReactionPicker =
				reactionPickerRef.current && reactionPickerRef.current.contains(target)
			// Проверяем, был ли клик внутри меню (включая кнопку "Реакция")
			const clickedOnMenu = menuRef.current && menuRef.current.contains(target)

			// Если открыт пикер реакций
			if (showReactionPicker) {
				// Если клик был вне пикера реакций и вне меню, закрываем только пикер (меню остается открытым)
				if (!clickedOnReactionPicker && !clickedOnMenu) {
					setShowReactionPicker(false)
					setShowExtendedReactions(false)
					setExpandReactionsUpward(false)
					// Меню НЕ закрываем - оно должно остаться открытым
				}
				// Если клик был внутри пикера или меню, ничего не делаем
			} else {
				// Если пикер закрыт и меню открыто, и клик был вне меню - закрываем меню
				if (showMenu && !clickedOnMenu && !clickedOnReactionPicker) {
					setShowMenu(false)
				}
			}
		}

		if (showMenu || showReactionPicker) {
			document.addEventListener('mousedown', handleClickOutside)
			document.addEventListener('touchstart', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('touchstart', handleClickOutside)
			if (touchTimerRef.current) {
				clearTimeout(touchTimerRef.current)
			}
		}
	}, [showMenu, showReactionPicker])

	useEffect(() => {
		if (showReactionPicker) {
			recalcReactionPickerPosition(showExtendedReactions)
		}
	}, [showExtendedReactions, showReactionPicker])

	// Обработчик реакции
	const handleReaction = async (emoji: string, e?: React.MouseEvent) => {
		if (!token) return

		// Предотвращаем всплытие события, чтобы реакция не добавлялась дважды
		e?.stopPropagation()

		try {
			const res = await fetch('/api/messages/reactions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					messageId: message.id,
					emoji,
					chatType,
				}),
			})

			const data = await res.json()
			if (res.ok) {
				// Обновляем реакции локально - это достаточно для UI
				// Родительский компонент получит обновления при следующей загрузке с сервера
				if (data.action === 'added') {
					setReactions(prev => {
						// Проверяем, нет ли уже такой реакции от этого пользователя
						const exists = prev.some(
							r => r.emoji === emoji && r.userId === user!.id
						)
						if (!exists) {
							return [...prev, { emoji, userId: user!.id }]
						}
						return prev
					})
				} else {
					setReactions(prev => {
						// Удаляем реакцию
						return prev.filter(
							r => !(r.emoji === emoji && r.userId === user!.id)
						)
					})
				}
			}
			setShowReactionPicker(false)
			setShowExtendedReactions(false)
			setShowMenu(false)
		} catch (error) {
			console.error('Ошибка при добавлении реакции:', error)
			toast.error('Ошибка при добавлении реакции')
		}
	}

	// Группируем реакции по emoji
	const groupedReactions = reactions.reduce((acc, reaction) => {
		const existing = acc.find(r => r.emoji === reaction.emoji)
		if (existing) {
			existing.count++
			if (reaction.userId === user?.id) {
				existing.hasUser = true
			}
		} else {
			acc.push({
				emoji: reaction.emoji,
				count: 1,
				hasUser: reaction.userId === user?.id,
			})
		}
		return acc
	}, [] as Array<{ emoji: string; count: number; hasUser: boolean }>)

	// Основные эмодзи (показываются первыми)
	const primaryEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥']

	// Дополнительные эмодзи (раскрываются по клику)
	const extendedEmojis = [
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
		'💖',
		'💕',
		'🤝',
		'🙌',
		'👌',
		'👍🏻',
		'❤️‍🔥',
		'🤯',
		'🥳',
		'😎',
		'🤩',
		'😇',
		'🎯',
		'🚀',
	]

	// Все эмодзи вместе
	const allEmojis = [...primaryEmojis, ...extendedEmojis]

	const recalcReactionPickerPosition = (isExpanded: boolean) => {
		if (!reactionButtonRef.current || !menuRef.current) return

		const buttonRect = reactionButtonRef.current.getBoundingClientRect()
		const menuRect = menuRef.current.getBoundingClientRect()
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight
		const gap = 10
		const pickerWidth = 248
		const pickerHeight = isExpanded ? 300 : 150

		let left = isOwnMessage
			? menuRect.left - pickerWidth - gap
			: menuRect.right + gap

		if (left < gap) left = gap
		if (left + pickerWidth > viewportWidth - gap) {
			left = Math.max(gap, viewportWidth - pickerWidth - gap)
		}

		let openUp = false
		let top = buttonRect.bottom + gap
		if (top + pickerHeight > viewportHeight - gap) {
			openUp = true
			top = buttonRect.top - pickerHeight - gap
			if (top < gap) {
				openUp = false
				top = Math.max(gap, viewportHeight - pickerHeight - gap)
			}
		}

		setExpandReactionsUpward(openUp)
		setReactionPickerPosition({ x: left, y: top })
	}

	const handleEdit = async () => {
		if (!editedContent.trim() || editedContent === message.content) {
			setIsEditing(false)
			return
		}

		try {
			const endpoint =
				chatType === 'private'
					? `/api/private-messages/edit/${message.id}`
					: `/api/messages/edit/${message.id}`

			const res = await fetch(endpoint, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ content: editedContent }),
			})

			const data = await res.json()
			if (res.ok) {
				toast.success('Сообщение отредактировано')
				if (onMessageUpdate) onMessageUpdate(data.message)
				setIsEditing(false)
			} else {
				toast.error(data.error || 'Ошибка редактирования')
			}
		} catch (error) {
			toast.error('Ошибка редактирования сообщения')
		}
	}

	const handleDelete = async () => {
		if (!confirm('Удалить это сообщение?')) return

		try {
			const endpoint =
				chatType === 'private'
					? `/api/private-messages/delete/${message.id}`
					: `/api/messages/delete/${message.id}`

			const res = await fetch(endpoint, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await res.json()
			if (res.ok) {
				toast.success('Сообщение удалено')
				if (onMessageDelete) onMessageDelete(message.id)
			} else {
				toast.error(data.error || 'Ошибка удаления')
			}
		} catch (error) {
			toast.error('Ошибка удаления сообщения')
		}
	}

	const handleCopyText = async () => {
		if (!message.content) return

		try {
			await navigator.clipboard.writeText(message.content)
			toast.success('Текст скопирован')
			setShowMenu(false)
		} catch (error) {
			toast.error('Ошибка копирования')
		}
	}

	// Определяем отступ снизу: между группами больше, внутри группы меньше
	const marginBottom = isLastInGroup ? 'mb-3' : 'mb-1'

	// Определяем скругление углов как в Telegram
	const getBorderRadius = () => {
		if (isDeleted) return 'rounded-2xl' // Удаленные всегда полностью скруглены

		if (isOwnMessage) {
			// Свои сообщения (справа) - зеленые
			if (isFirstInGroup && isLastInGroup) {
				// Одиночное: полное скругление везде, кроме правого нижнего угла (хвостик)
				return 'rounded-[18px] rounded-br-[4px]'
			}
			if (isFirstInGroup) {
				// Первое в группе: скругление сверху
				return 'rounded-t-[18px] rounded-bl-[18px] rounded-br-[4px]'
			}
			if (isLastInGroup) {
				// Последнее в группе: скругление снизу с хвостиком
				return 'rounded-b-[18px] rounded-tl-[18px] rounded-tr-[4px] rounded-br-[4px]'
			}
			// Среднее в группе: только левые углы скруглены
			return 'rounded-l-[18px] rounded-tr-[4px] rounded-br-[4px]'
		} else {
			// Чужие сообщения (слева) - серые
			if (isFirstInGroup && isLastInGroup) {
				// Одиночное: полное скругление везде, кроме левого нижнего угла (хвостик)
				return 'rounded-[18px] rounded-bl-[4px]'
			}
			if (isFirstInGroup) {
				// Первое в группе: скругление сверху
				return 'rounded-t-[18px] rounded-br-[18px] rounded-bl-[4px]'
			}
			if (isLastInGroup) {
				// Последнее в группе: скругление снизу с хвостиком
				return 'rounded-b-[18px] rounded-tr-[18px] rounded-tl-[4px] rounded-bl-[4px]'
			}
			// Среднее в группе: только правые углы скруглены
			return 'rounded-r-[18px] rounded-tl-[4px] rounded-bl-[4px]'
		}
	}

	const handleVoiceSeek = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!audioRef.current) return
			const total = voiceDuration || voiceMeta?.duration || 0
			if (!total) return

			const rect = event.currentTarget.getBoundingClientRect()
			const ratio = Math.min(
				Math.max((event.clientX - rect.left) / rect.width, 0),
				1
			)
			const newTime = total * ratio
			audioRef.current.currentTime = newTime
			setVoiceCurrentTime(newTime)
		},
		[voiceDuration, voiceMeta]
	)

	return (
		<div
			className={`flex flex-col ${
				isOwnMessage ? 'items-end' : 'items-start'
			} ${marginBottom}`}
			style={{ overflow: 'visible' }}
		>
			<div
				ref={messageRef}
				className={`relative max-w-[85%] sm:max-w-[75%] min-w-[80px] group`}
				style={{ overflow: 'visible' }}
				onContextMenu={handleContextMenu}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				onTouchMove={handleTouchMove}
			>
				{/* Имя отправителя (только для чужих сообщений и если showSenderName=true) */}
				{!isOwnMessage && showSenderName && (
					<div className='text-xs font-medium mb-1 px-2'>
						<Link
							href={`/users/${message.sender.id}`}
							className='text-emerald-400 hover:text-emerald-300 hover:underline transition-colors'
							onClick={e => e.stopPropagation()}
						>
							{message.sender.fullName || message.sender.email}
						</Link>
					</div>
				)}

				<div
					className={
						containsOnlyEmoji
							? 'relative'
							: `relative px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2 ${getBorderRadius()} shadow-lg backdrop-blur-sm ${
									isDeleted
										? 'bg-gray-800/50 border border-gray-700/30'
										: isOwnMessage
										? 'bg-gradient-to-br from-emerald-800/75 via-teal-800/75 to-emerald-900/75 text-white border border-emerald-700/20'
										: 'bg-slate-700/85 text-white border border-slate-600/25'
							  }`
					}
					style={
						containsOnlyEmoji
							? {
									padding: 0,
									margin: 0,
									background: 'transparent',
									border: 'none',
									boxShadow: 'none',
									borderRadius: 0,
							  }
							: {}
					}
				>
					{/* Контекстное меню (открывается по ПКМ или долгому нажатию) - рендерим через Portal */}
					{!isDeleted && showMenu && typeof window !== 'undefined'
						? createPortal(
								<div
									ref={node => {
										if (node && menuRef.current !== node) {
											menuRef.current = node
											// После рендеринга проверяем, не выходит ли меню за границы экрана
											requestAnimationFrame(() => {
												if (menuRef.current) {
													const rect = menuRef.current.getBoundingClientRect()
													const viewportWidth = window.innerWidth
													const viewportHeight = window.innerHeight

													let newX = menuPosition.x
													let newY = menuPosition.y

													// Проверка по вертикали
													if (rect.bottom > viewportHeight - 10) {
														// Меню выходит снизу, перемещаем выше
														newY = menuPosition.y - rect.height
														// Если и выше не помещается, прижимаем к верхнему краю
														if (newY < 10) {
															newY = 10
														}
													}

													// Проверка по горизонтали
													if (rect.right > viewportWidth - 10) {
														newX = viewportWidth - rect.width - 10
													}
													if (rect.left < 10) {
														newX = 10
													}

													// Обновляем позицию только если нужно
													if (
														newX !== menuPosition.x ||
														newY !== menuPosition.y
													) {
														setMenuPosition({ x: newX, y: newY })
													}
												}
											})
										}
									}}
									className='fixed bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-[100] min-w-[160px] sm:min-w-[180px] overflow-hidden animate-fadeIn'
									style={{
										left: `${menuPosition.x}px`,
										top: `${menuPosition.y}px`,
										maxWidth: 'calc(100vw - 20px)',
										maxHeight: '90vh',
										animation:
											'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
									}}
									onClick={e => e.stopPropagation()}
									onContextMenu={e => e.preventDefault()}
								>
									{/* Опции для всех сообщений */}
									<button
										onClick={e => {
											e.stopPropagation()
											setShowMenu(false)
											if (onReply) {
												onReply(message.id)
											}
										}}
										className='flex items-center gap-2.5 sm:gap-2 w-full text-left px-4 py-3 sm:py-2.5 hover:bg-gray-800/80 active:bg-gray-800/90 text-sm sm:text-sm text-gray-300 hover:text-white transition-all duration-150 ease-out group touch-manipulation'
									>
										<Reply className='w-4 h-4 group-hover:scale-110 transition-transform' />
										<span>Ответить</span>
									</button>
									<div className='relative'>
										<button
											ref={reactionButtonRef}
											onClick={e => {
												e.stopPropagation()
												e.preventDefault()
												if (!reactionButtonRef.current || !menuRef.current)
													return

												if (showReactionPicker) {
													// Если пикер уже открыт, закрываем его, но меню оставляем открытым
													setShowReactionPicker(false)
													setShowExtendedReactions(false)
													setExpandReactionsUpward(false)
													return
												}

												// Открываем пикер реакций, но меню НЕ закрываем
												setShowExtendedReactions(false)
												recalcReactionPickerPosition(false)
												setShowReactionPicker(true)
												// Меню остается открытым - не вызываем setShowMenu(false)
											}}
											className='flex items-center gap-2.5 sm:gap-2 w-full text-left px-4 py-3 sm:py-2.5 hover:bg-gray-800/80 active:bg-gray-800/90 text-sm sm:text-sm text-gray-300 hover:text-white transition-all duration-150 ease-out group touch-manipulation'
										>
											<Smile className='w-4 h-4 group-hover:scale-110 transition-transform' />
											<span>Реакция</span>
										</button>
									</div>
									{message.content && !isVoiceMessage && (
										<button
											onClick={e => {
												e.stopPropagation()
												handleCopyText()
											}}
											className='flex items-center gap-2.5 sm:gap-2 w-full text-left px-4 py-3 sm:py-2.5 hover:bg-gray-800/80 active:bg-gray-800/90 text-sm sm:text-sm text-gray-300 hover:text-white transition-all duration-150 ease-out group touch-manipulation'
										>
											<Copy className='w-4 h-4 group-hover:scale-110 transition-transform' />
											<span>Копировать текст</span>
										</button>
									)}
									{/* Кнопка копирования ссылки на сообщение */}
									<button
										onClick={async e => {
											e.stopPropagation()
											// Формируем URL в зависимости от типа чата
											let url = ''
											if (chatType === 'private') {
												// Для приватных сообщений нужен otherUserId, но у нас есть только sender
												// Используем текущий URL и добавляем якорь
												url = `${window.location.origin}/messages/${message.sender.id}#message-${message.id}`
											} else {
												// Для задач используем taskId из пропсов (нужно будет передать)
												// Пока используем текущий URL
												const currentPath = window.location.pathname
												url = `${window.location.origin}${currentPath}#message-${message.id}`
											}
											const success = await copyToClipboard(url)
											if (success) {
												toast.success('Ссылка на сообщение скопирована')
												setShowMenu(false)
											} else {
												toast.error('Не удалось скопировать ссылку')
											}
										}}
										className='flex items-center gap-2.5 sm:gap-2 w-full text-left px-4 py-3 sm:py-2.5 hover:bg-gray-800/80 active:bg-gray-800/90 text-sm sm:text-sm text-gray-300 hover:text-white transition-all duration-150 ease-out group touch-manipulation'
									>
										<LinkIcon className='w-4 h-4 group-hover:scale-110 transition-transform' />
										<span>Копировать ссылку</span>
									</button>

									{/* Опции только для своих сообщений */}
									{isOwnMessage && (
										<>
											<div className='border-t border-gray-700/50 my-1'></div>
											{canEditMessage && (
												<button
													onClick={e => {
														e.stopPropagation()
														setIsEditing(true)
														setShowMenu(false)
													}}
													className='flex items-center gap-2.5 sm:gap-2 w-full text-left px-4 py-3 sm:py-2.5 hover:bg-gray-800/80 active:bg-gray-800/90 text-sm sm:text-sm text-gray-300 hover:text-white transition-all duration-150 ease-out group touch-manipulation'
												>
													<Edit className='w-4 h-4 group-hover:scale-110 transition-transform' />
													<span>Изменить</span>
												</button>
											)}
											<div className='border-t border-gray-700/50 my-1'></div>
											<button
												onClick={e => {
													e.stopPropagation()
													setShowMenu(false)
													handleDelete()
												}}
												className='flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-gray-800/80 text-sm text-red-400 hover:text-red-300 transition-all duration-150 ease-out group'
											>
												<Trash2 className='w-4 h-4 group-hover:scale-110 transition-transform' />
												<span>Удалить</span>
											</button>
										</>
									)}
								</div>,
								document.body
						  )
						: null}

					{/* Пикер реакций - рендерим через Portal */}
					{showReactionPicker && typeof window !== 'undefined'
						? createPortal(
								<div
									ref={reactionPickerRef}
									className={`fixed bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-[101] ${
										isMobileView
											? 'p-3 bottom-20 left-1/2 -translate-x-1/2'
											: 'p-3'
									}`}
									style={
										isMobileView
											? {
													animation:
														'scaleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
													maxWidth: 'calc(100vw - 32px)',
													width: 'auto',
													minWidth: '240px',
											  }
											: {
													left: `${reactionPickerPosition.x}px`,
													top: `${reactionPickerPosition.y}px`,
													width: 248,
													animation:
														'scaleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
											  }
									}
									onClick={e => e.stopPropagation()}
								>
									<div
										className={`flex flex-col ${
											expandReactionsUpward ? 'flex-col-reverse' : ''
										} gap-2`}
									>
										<div
											className={`flex gap-2 sm:gap-1.5 flex-wrap ${
												isMobileView
													? 'max-w-full justify-center'
													: 'max-w-[248px]'
											}`}
										>
											{primaryEmojis.map(emoji => (
												<button
													key={emoji}
													onClick={e => {
														e.stopPropagation()
														handleReaction(emoji, e)
														// handleReaction уже закрывает пикер и меню
													}}
													className={`${
														isMobileView
															? 'w-11 h-11 text-2xl'
															: 'w-9 h-9 text-xl'
													} rounded-full bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-700/80 flex items-center justify-center transition-all hover:scale-125 active:scale-95 touch-manipulation`}
												>
													{emoji}
												</button>
											))}
											<button
												onClick={e => {
													e.stopPropagation()
													setShowExtendedReactions(prev => !prev)
												}}
												className={`${
													isMobileView ? 'w-11 h-11' : 'w-9 h-9'
												} rounded-full bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-700/80 flex items-center justify-center text-lg transition-all hover:scale-125 active:scale-95 touch-manipulation ${
													showExtendedReactions ? 'bg-slate-700/70' : ''
												}`}
												aria-label='Показать больше реакций'
											>
												{expandReactionsUpward ? (
													<ChevronUp
														className={`${
															isMobileView ? 'w-5 h-5' : 'w-4 h-4'
														} text-gray-300`}
													/>
												) : (
													<ChevronDown
														className={`${
															isMobileView ? 'w-5 h-5' : 'w-4 h-4'
														} text-gray-300 transition-transform duration-200 ${
															showExtendedReactions ? 'rotate-180' : ''
														}`}
													/>
												)}
											</button>
										</div>
										<div
											className={`overflow-hidden transition-all duration-300 ease-out ${
												showExtendedReactions
													? 'max-h-64 opacity-100'
													: 'max-h-0 opacity-0'
											} ${expandReactionsUpward ? 'mb-1' : 'mt-1'}`}
										>
											<div
												className={`flex gap-2 sm:gap-1 flex-wrap ${
													isMobileView
														? 'max-w-full justify-center'
														: 'max-w-[248px]'
												} pt-2 border-t border-gray-700/60`}
											>
												{extendedEmojis.map((emoji, index) => (
													<button
														key={emoji}
														onClick={e => {
															e.stopPropagation()
															handleReaction(emoji, e)
															// handleReaction уже закрывает пикер и меню
															setShowExtendedReactions(false)
														}}
														className={`${
															isMobileView
																? 'w-11 h-11 text-2xl'
																: 'w-9 h-9 text-xl'
														} rounded-full bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-700/80 flex items-center justify-center transition-all hover:scale-125 active:scale-95 touch-manipulation ${
															showExtendedReactions ? 'animate-fadeIn' : ''
														}`}
														style={
															showExtendedReactions
																? {
																		animationDelay: `${index * 0.01}s`,
																		animationFillMode: 'forwards',
																  }
																: undefined
														}
													>
														{emoji}
													</button>
												))}
											</div>
										</div>
									</div>
								</div>,
								document.body
						  )
						: null}

					{/* Редактор */}
					{isEditing ? (
						<div className='space-y-2 animate-fadeIn'>
							<textarea
								value={editedContent}
								onChange={e => setEditedContent(e.target.value)}
								className='w-full bg-gray-900/50 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-emerald-400/50 focus:border-emerald-400 focus:outline-none text-sm resize-none transition-all duration-200'
								autoFocus
								rows={2}
								style={{ minHeight: '60px', maxHeight: '120px' }}
								onKeyDown={e => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault()
										handleEdit()
									}
									if (e.key === 'Escape') {
										setIsEditing(false)
										setEditedContent(message.content)
									}
								}}
							/>
							<div className='flex gap-2'>
								<button
									onClick={handleEdit}
									className='flex items-center gap-1.5 flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm sm:text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95'
								>
									<Check className='w-4 h-4' />
									<span>Сохранить</span>
								</button>
								<button
									onClick={() => {
										setIsEditing(false)
										setEditedContent(message.content)
									}}
									className='flex items-center gap-1.5 flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 bg-black/20 hover:bg-black/30 text-white rounded-lg text-sm sm:text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95'
								>
									<X className='w-4 h-4' />
									<span>Отмена</span>
								</button>
							</div>
						</div>
					) : (
						<>
							{/* Ответ на сообщение - как в Telegram */}
							{message.replyTo && (
								<div
									className={`mb-2 px-3 py-2 rounded-lg border-l-[3px] cursor-pointer transition-all duration-300 ease-out hover:opacity-90 hover:scale-[1.01] animate-fadeIn ${
										isOwnMessage
											? 'bg-white/15 border-white/40 hover:bg-white/20 hover:border-white/50 shadow-sm'
											: 'bg-slate-600/40 border-slate-400/60 hover:bg-slate-600/50 hover:border-slate-400/70 shadow-sm'
									}`}
									onClick={e => {
										e.stopPropagation()
										// Прокрутка к исходному сообщению
										const originalMessage = document.querySelector(
											`[data-message-id="${message.replyTo?.id}"]`
										)
										if (originalMessage) {
											originalMessage.scrollIntoView({
												behavior: 'smooth',
												block: 'center',
											})
											// Визуальное выделение на 2 секунды
											originalMessage.classList.add(
												'ring-2',
												'ring-emerald-500',
												'animate-pulse'
											)
											setTimeout(() => {
												originalMessage.classList.remove(
													'ring-2',
													'ring-emerald-500',
													'animate-pulse'
												)
											}, 2000)
										}
									}}
								>
									<div
										className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${
											isOwnMessage ? 'text-white/90' : 'text-gray-200'
										}`}
									>
										<span
											className={`text-[10px] ${
												isOwnMessage ? 'text-white/60' : 'text-gray-400'
											}`}
										>
											↩️
										</span>
										<Link
											href={`/users/${message.replyTo.sender.id}`}
											className='hover:underline transition-colors'
											onClick={e => e.stopPropagation()}
										>
											{message.replyTo.sender.fullName ||
												message.replyTo.sender.email}
										</Link>
									</div>
									<div
										className={`text-xs line-clamp-2 break-words pl-4 ${
											isOwnMessage ? 'text-white/70' : 'text-gray-300'
										}`}
									>
										{replyVoiceMeta ? (
											<span className='italic text-emerald-200/80'>
												🎙️ Голосовое сообщение
											</span>
										) : message.replyTo.content ? (
											message.replyTo.content.length > 100 ? (
												message.replyTo.content.substring(0, 100) + '...'
											) : (
												message.replyTo.content
											)
										) : (
											<span className='italic'>📎 Файл</span>
										)}
									</div>
								</div>
							)}

							{/* Голосовое сообщение - отображается первым, если есть */}
							{/* ВАЖНО: голосовые сообщения обрабатываются ДО файлов */}
							{isVoice &&
								!isDeleted &&
								(() => {
									// Парсим voiceMeta, если его еще нет
									let meta = voiceMeta
									if (!meta && message.content) {
										try {
											// Сначала пробуем распарсить как есть
											let parsed
											try {
												parsed = JSON.parse(message.content)
											} catch {
												// Если не получилось, пробуем заменить экранированные кавычки
												const unescaped = message.content.replace(
													/&quot;/g,
													'"'
												)
												parsed = JSON.parse(unescaped)
											}

											if (parsed && parsed.type === 'voice') {
												const sanitizedWaveform = (parsed.waveform || [])
													.map((value: any) =>
														Number.isFinite(Number(value))
															? Math.min(1, Math.max(0, Number(value)))
															: 0
													)
													.slice(0, 128)
												meta = {
													type: 'voice' as const,
													duration: Math.max(0, Number(parsed.duration || 0)),
													waveform:
														sanitizedWaveform.length > 0
															? sanitizedWaveform
															: [0.1],
												}
												console.log(
													'✅ meta parsed in render block',
													message.id,
													meta
												)
											}
										} catch (error) {
											console.log(
												'❌ meta parse error in render block:',
												error,
												message.content?.substring(0, 100)
											)
										}
									}

									return (
										<div className='py-2' onClick={e => e.stopPropagation()}>
											{meta && fileUrl ? (
												<VoicePlayer
													audioUrl={fileUrl}
													waveform={meta.waveform || []}
													duration={meta.duration || 0}
														fileSize={message.fileSize ? Number(message.fileSize) : undefined}
													fileName={message.fileName}
												/>
											) : (
												<div className='py-2 px-3 text-sm text-gray-400'>
													Загрузка голосового сообщения...
												</div>
											)}
										</div>
									)
								})()}

							{/* Файл - отображается ТОЛЬКО если это НЕ голосовое сообщение */}
							{/* СТРОГАЯ ПРОВЕРКА: если это голосовое сообщение, файл НЕ отображается */}
							{!isVoice &&
								fileUrl &&
								!isDeleted &&
								!isVoiceFile &&
								(() => {
									// Еще раз проверяем content напрямую, на всякий случай (учитываем экранированные кавычки)
									const hasVoiceInContent =
										message.content &&
										typeof message.content === 'string' &&
										(message.content.includes('"type":"voice"') ||
											message.content.includes('"type": "voice"') ||
											message.content.includes(
												'&quot;type&quot;:&quot;voice&quot;'
											) ||
											message.content.includes(
												'&quot;type&quot;: &quot;voice&quot;'
											)) &&
										(message.content.includes('"waveform"') ||
											message.content.includes('&quot;waveform&quot;'))

									// Проверяем, является ли это аудио файлом с voice метаданными
									const isAudioWithVoice =
										message.fileMimetype?.startsWith('audio/') &&
										hasVoiceInContent

									// Если в content есть голосовое сообщение ИЛИ это аудио файл с voice метаданными, НЕ показываем файл
									if (hasVoiceInContent || isAudioWithVoice) {
										console.log(
											'🚫 Блок файлов: НЕ показываем файл (это голосовое сообщение)',
											message.id
										)
										return null
									}

									// Показываем файл только если это точно НЕ голосовое сообщение
									return (
										<div className={message.content ? 'mb-2' : ''}>
											{isImage ? (
												<>
													<div
														className='relative block rounded-lg overflow-hidden group cursor-pointer'
														onClick={e => {
															e.stopPropagation()
															setShowImageModal(true)
														}}
													>
														<img
															src={fileUrl}
															alt={message.fileName || 'Изображение'}
															className='max-w-full max-h-64 sm:max-h-80 rounded-lg object-contain transition-transform duration-200 group-hover:scale-[1.02]'
															onError={e => {
																// Если изображение не загружается, показываем как файл
																console.error(
																	'Ошибка загрузки изображения:',
																	fileUrl
																)
															}}
														/>
														{/* Кнопка скачивания - появляется при наведении */}
														<a
															href={`${fileUrl}?download=true`}
															download={message.fileName}
															className='absolute top-3 right-3 p-2.5 bg-black/70 hover:bg-black/90 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-30 backdrop-blur-sm'
															onClick={e => e.stopPropagation()}
															title='Скачать изображение'
														>
															<Download className='w-4 h-4 text-white' />
														</a>
													</div>
													{/* Модальное окно для просмотра изображения */}
													{showImageModal &&
														typeof window !== 'undefined' &&
														createPortal(
															<div
																className='fixed inset-0 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm'
																style={{
																	position: 'fixed',
																	top: 0,
																	left: 0,
																	right: 0,
																	bottom: 0,
																	zIndex: 99999, // z-index выше хедера (10002) для отображения поверх него
																}}
																onClick={() => setShowImageModal(false)}
															>
																{/* Кнопка закрытия */}
																<button
																	onClick={() => setShowImageModal(false)}
																	className='absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors'
																	aria-label='Закрыть'
																>
																	<X className='w-6 h-6' />
																</button>
																{/* Кнопка скачивания в модальном окне */}
																<a
																	href={`${fileUrl}?download=true`}
																	download={message.fileName}
																	className='absolute top-4 right-16 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors'
																	title='Скачать изображение'
																	onClick={e => e.stopPropagation()}
																>
																	<Download className='w-5 h-5' />
																</a>
																{/* Изображение */}
																<div
																	className='relative max-w-[90vw] max-h-[90vh] flex items-center justify-center'
																	onClick={e => e.stopPropagation()}
																>
																	<img
																		src={fileUrl}
																		alt={message.fileName || 'Изображение'}
																		className='max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl'
																	/>
																</div>
																{/* Название файла внизу */}
																{message.fileName && (
																	<div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg'>
																		<p className='text-sm text-white/90 font-medium'>
																			{message.fileName}
																		</p>
																	</div>
																)}
															</div>,
															document.body
														)}
												</>
											) : isVideo ? (
												<div
													className='max-w-full rounded-lg overflow-hidden relative group bg-black/20'
													style={{ maxHeight: '320px', aspectRatio: '16/9' }}
													onClick={e => e.stopPropagation()}
												>
													<VideoPlayer
														src={fileUrl}
														className='w-full h-full rounded-lg shadow-lg object-contain'
													/>
													{/* Кнопка скачивания видео - появляется при наведении */}
													<a
														href={fileUrl}
														download={message.fileName}
														className='absolute top-3 right-3 p-2.5 bg-black/70 hover:bg-black/90 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-30 backdrop-blur-sm'
														onClick={e => e.stopPropagation()}
														title='Скачать видео'
													>
														<Download className='w-4 h-4 text-white' />
													</a>
													{/* Название файла - показываем всегда внизу */}
													{message.fileName && (
														<div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-3 py-2 z-20 pointer-events-none'>
															<p className='text-xs text-white/90 truncate font-medium'>
																{message.fileName}
															</p>
														</div>
													)}
												</div>
											) : (
												<a
													href={fileUrl}
													download={message.fileName}
													className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] group ${
														isOwnMessage
															? 'bg-white/15 hover:bg-white/20 border border-white/30 shadow-sm'
															: 'bg-slate-600/40 hover:bg-slate-600/50 border border-slate-500/40 shadow-sm'
													}`}
													target='_blank'
													rel='noopener noreferrer'
													onClick={e => e.stopPropagation()}
												>
													{/* Иконка файла */}
													<div
														className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
															isOwnMessage
																? 'bg-white/25 group-hover:bg-white/30 shadow-sm'
																: 'bg-slate-500/40 group-hover:bg-slate-500/50 shadow-sm'
														} transition-colors`}
													>
														{(() => {
															const FileIcon = getFileIcon(
																message.fileMimetype,
																message.fileName
															)
															return (
																<FileIcon
																	className={`w-6 h-6 ${
																		isOwnMessage
																			? 'text-white'
																			: 'text-gray-200'
																	}`}
																/>
															)
														})()}
													</div>

													{/* Информация о файле */}
													<div className='flex-1 min-w-0'>
														<div
															className={`text-sm font-medium truncate ${
																isOwnMessage ? 'text-white' : 'text-gray-100'
															}`}
														>
															{message.fileName || 'Файл'}
														</div>
														<div
															className={`text-xs mt-0.5 ${
																isOwnMessage ? 'text-white/70' : 'text-gray-400'
															}`}
														>
															{message.fileMimetype
																?.split('/')[1]
																?.toUpperCase() || 'ФАЙЛ'}
															{/* Размер файла можно будет добавить, когда API будет возвращать size */}
														</div>
													</div>

													{/* Иконка скачивания */}
													<div className='flex-shrink-0'>
														<Download
															className={`w-5 h-5 ${
																isOwnMessage ? 'text-white/70' : 'text-gray-400'
															} group-hover:scale-110 transition-transform`}
														/>
													</div>
												</a>
											)}
										</div>
									)
								})()}

							{/* Текст сообщения - НЕ показываем для голосовых сообщений */}
							{message.content &&
								!isVoice &&
								(() => {
									// Дополнительная проверка: если content содержит JSON с voice метаданными, не показываем (учитываем экранированные кавычки)
									if (message.content && typeof message.content === 'string') {
										const trimmed = message.content.trim()
										// Проверяем, является ли это JSON (начинается с {)
										const isJson = trimmed.startsWith('{')
										if (isJson) {
											const hasVoiceType =
												message.content.includes('"type":"voice"') ||
												message.content.includes('"type": "voice"') ||
												message.content.includes(
													'&quot;type&quot;:&quot;voice&quot;'
												) ||
												message.content.includes(
													'&quot;type&quot;: &quot;voice&quot;'
												)
											const hasWaveform =
												message.content.includes('"waveform"') ||
												message.content.includes('&quot;waveform&quot;')

											if (hasVoiceType && hasWaveform) {
												console.log(
													'🚫 Блок текста: НЕ показываем текст (это голосовое сообщение)',
													message.id
												)
												return null
											}
										}
									}
									return true
								})() && (
									<div
										className={
											containsOnlyEmoji
												? 'text-center block'
												: `whitespace-pre-wrap ${
														isDeleted ? 'italic text-gray-500 text-center' : ''
												  }`
										}
										style={{
											...(containsOnlyEmoji
												? {
														fontSize: '3.5rem', // 56px - большой размер для эмодзи
														lineHeight: '1',
														fontFamily:
															"'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', system-ui, sans-serif",
														display: 'block',
														wordBreak: 'normal',
														overflowWrap: 'normal',
												  }
												: {
														fontSize: '0.875rem',
														lineHeight: '1.5',
														wordBreak: 'break-word',
														overflowWrap: 'break-word',
														wordWrap: 'break-word',
														fontFamily:
															"'Inter', 'Poppins', system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif",
												  }),
										}}
									>
										{containsOnlyEmoji
											? message.content.trim()
											: renderTextWithLinks(message.content)}
									</div>
								)}

							{/* Время и статус редактирования */}
							{!containsOnlyEmoji && (
								<div
									className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
										isOwnMessage ? 'text-white/70' : 'text-gray-400'
									}`}
								>
									{isEdited && <span className='italic'>изменено</span>}
									<span>
										{new Date(message.createdAt).toLocaleTimeString('ru-RU', {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
							)}
							{/* Время для эмодзи сообщений - показываем под эмодзи, но меньше */}
							{containsOnlyEmoji && (
								<div
									className={`flex items-center justify-center gap-1 mt-1 text-[9px] opacity-60 ${
										isOwnMessage ? 'text-white/50' : 'text-gray-500'
									}`}
								>
									{isEdited && <span className='italic'>изменено</span>}
									<span>
										{new Date(message.createdAt).toLocaleTimeString('ru-RU', {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
							)}
						</>
					)}
				</div>

				{/* Реакции - под сообщением для всех типов сообщений */}
				{groupedReactions.length > 0 && (
					<div
						ref={reactionsContainerRef}
						className={`flex gap-1 items-center mt-1 animate-fadeIn flex-wrap ${
							isOwnMessage ? 'justify-end' : 'justify-start'
						}`}
						style={{ overflow: 'visible' }}
					>
						{groupedReactions.map((reaction, idx) => (
							<button
								key={idx}
								onClick={e => handleReaction(reaction.emoji, e)}
								className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all duration-150 flex-shrink-0 relative z-10 ${
									reaction.hasUser
										? 'bg-emerald-500/30 border border-emerald-400/50'
										: 'bg-gray-600/30 border border-gray-500/30'
								} hover:scale-110 active:scale-95 shadow-sm`}
								style={{
									overflow: 'visible',
									transformOrigin: 'center',
								}}
							>
								<span>{reaction.emoji}</span>
								{reaction.count > 1 && (
									<span className='text-[10px] font-medium'>
										{reaction.count}
									</span>
								)}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
