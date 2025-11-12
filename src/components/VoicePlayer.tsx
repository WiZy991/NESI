'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface VoicePlayerProps {
	audioUrl: string
	waveform: number[]
	duration: number
	className?: string
	fileSize?: number
	fileName?: string
}

export default function VoicePlayer({
	audioUrl,
	waveform,
	duration,
	className = '',
	fileSize,
	fileName,
}: VoicePlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	// Используем переданный duration как fallback, если audioElement.duration не загрузится
	const [audioDuration, setAudioDuration] = useState(() => {
		// Проверяем, что duration валидный
		if (duration && isFinite(duration) && duration > 0) return duration
		return 0
	})
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const waveformRef = useRef<HTMLDivElement | null>(null)
	const idRef = useRef<string>(
		`voice-${Math.random().toString(36).slice(2, 10)}`
	)
	const [isMetadataReady, setIsMetadataReady] = useState(false)

	// Инициализация аудио элемента
	useEffect(() => {
		if (!audioUrl) return

		setIsMetadataReady(false)

		const audioElement = new Audio(audioUrl)
		audioRef.current = audioElement

		const handleLoadedMetadata = () => {
			const loadedDuration = audioElement.duration
			if (loadedDuration && isFinite(loadedDuration) && loadedDuration > 0) {
				setAudioDuration(loadedDuration)
				setIsMetadataReady(true)
			} else if (duration && isFinite(duration) && duration > 0) {
				setAudioDuration(duration)
				setIsMetadataReady(true)
			}
		}

		// Устанавливаем начальный duration из пропсов, если он валидный
		if (duration && isFinite(duration) && duration > 0) {
			setAudioDuration(duration)
		}

		const handleTimeUpdate = () => {
			setCurrentTime(audioElement.currentTime)
		}

		const handleEnded = () => {
			setIsPlaying(false)
			setCurrentTime(0)
			if (audioElement) {
				audioElement.currentTime = 0
			}
			setIsMetadataReady(true)
		}

		const handleCanPlay = () => {
			setIsMetadataReady(true)
		}

		const handleError = () => {
			setIsMetadataReady(true)
		}

		audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
		audioElement.addEventListener('timeupdate', handleTimeUpdate)
		audioElement.addEventListener('ended', handleEnded)
		audioElement.addEventListener('canplay', handleCanPlay)
		audioElement.addEventListener('error', handleError)

		return () => {
			audioElement.pause()
			audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audioElement.removeEventListener('timeupdate', handleTimeUpdate)
			audioElement.removeEventListener('ended', handleEnded)
			audioElement.removeEventListener('canplay', handleCanPlay)
			audioElement.removeEventListener('error', handleError)
			audioRef.current = null
		}
	}, [audioUrl, duration])

	// Управление воспроизведением
	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		const effectiveDuration =
			audioDuration > 0 ? audioDuration : duration > 0 ? duration : 0

		if (isPlaying) {
			window.dispatchEvent(
				new CustomEvent('voice-play-started', {
					detail: { id: idRef.current },
				})
			)
			const playPromise = audioElement.play()
			if (playPromise && typeof playPromise.then === 'function') {
				playPromise
					.then(() => {
						setIsMetadataReady(true)
					})
					.catch(() => {
						setIsPlaying(false)
					})
			} else {
				setIsMetadataReady(true)
			}
		} else {
			audioElement.pause()
			if (effectiveDuration > 0 && audioElement.currentTime >= effectiveDuration - 0.05) {
				audioElement.currentTime = 0
			}
		}
	}, [isPlaying, audioDuration, duration])

	useEffect(() => {
		const handler = (event: Event) => {
			const detail = (event as CustomEvent<{ id: string }>).detail
			if (detail?.id && detail.id !== idRef.current) {
				setIsPlaying(false)
			}
		}

		window.addEventListener('voice-play-started' as any, handler)
		return () => {
			window.removeEventListener('voice-play-started' as any, handler)
		}
	}, [])

	const togglePlayback = () => {
		if (!audioRef.current || !isMetadataReady) return
		setIsPlaying(prev => !prev)
	}

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!audioRef.current || !waveformRef.current || !isMetadataReady) return

		const rect = waveformRef.current.getBoundingClientRect()
		const clickX = e.clientX - rect.left
		const progress = Math.max(0, Math.min(1, clickX / rect.width))
		const effectiveDuration =
			audioDuration > 0 ? audioDuration : duration > 0 ? duration : 0
		const newTime = progress * effectiveDuration

		if (effectiveDuration > 0) {
			audioRef.current.currentTime = newTime
			setCurrentTime(newTime)
		}
	}

	const formatTime = (seconds: number) => {
		const totalSeconds = Math.max(0, Math.round(seconds))
		const mins = Math.floor(totalSeconds / 60)
		const secs = totalSeconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const formatFileSize = (bytes?: number) => {
		const value = Number(bytes)
		if (!value || value < 1) return ''
		if (value < 1024) return `${value} Б`
		if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`
		return `${(value / (1024 * 1024)).toFixed(1)} МБ`
	}

	// Используем переданный duration, если audioDuration не загрузился
	const effectiveDuration =
		audioDuration > 0 ? audioDuration : duration > 0 ? duration : 0
	const progressRatio =
		effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0

	// Нормализуем waveform - если массив пустой или слишком маленький, создаем дефолтный
	const normalizedWaveform = useMemo(() => {
		const targetLength = 60
		const generateFallbackWave = () =>
			Array.from({ length: targetLength }, (_, i) => {
				// Используем плавную синусоидальную функцию, чтобы создать приятную волну
				const base = Math.sin((i / targetLength) * Math.PI)
					** 1.5 /* делаем пики острее */
				// Добавляем небольшую случайность, чтобы волна выглядела живой
				const noise = (Math.random() - 0.5) * 0.15
				return Math.min(1, Math.max(0.15, base + noise))
			})

		if (!waveform || waveform.length === 0) {
			return generateFallbackWave()
		}

		// Нормализуем значения waveform к диапазону 0-1 для лучшей визуализации
		const normalized = waveform.map(v => {
			const val = Math.max(0, Math.min(1, Number(v) || 0))
			// Усиливаем сигнал: маленькие значения уменьшаем, большие делаем заметнее
			if (val < 0.05) return 0
			if (val < 0.25) return val * 1.5
			return Math.min(1, val * 1.3)
		})

		const hasSignal = normalized.some(v => v > 0.05)
		if (!hasSignal) {
			return generateFallbackWave()
		}
		
		// Если waveform слишком маленький, увеличиваем его
		if (normalized.length < 30) {
			const expanded = []
			for (let i = 0; i < targetLength; i++) {
				const sourceIndex = Math.floor((i / targetLength) * normalized.length)
				expanded.push(normalized[sourceIndex] || 0)
			}
			return expanded
		}
		// Если waveform слишком большой, уменьшаем его, но сохраняем больше деталей
		if (normalized.length > 60) {
			const step = normalized.length / targetLength
			return Array.from({ length: targetLength }, (_, i) => {
				const index = Math.floor(i * step)
				return normalized[index] || 0
			})
		}
		return normalized
	}, [waveform])

	const activeBarsNormalized = Math.floor(
		progressRatio * normalizedWaveform.length
	)
	const displayDuration = formatTime(effectiveDuration)
	const fileSizeLabel = formatFileSize(fileSize)

	return (
		<div className={`flex items-center gap-2.5 ${className}`}>
			{/* Кнопка Play/Pause - компактная как в Telegram */}
			<button
				type='button'
				onClick={togglePlayback}
				disabled={!isMetadataReady}
				className='w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 transition-all flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed'
				aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
			>
				{!isMetadataReady ? (
					<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
				) : isPlaying ? (
					<Pause className='w-4 h-4 text-white' />
				) : (
					<Play className='w-4 h-4 text-white ml-0.5' />
				)}
			</button>

			{/* Визуализация волны - как в Telegram */}
			<div className='flex-1 min-w-0 flex flex-col gap-1'>
				{/* Волна - вертикальные полоски разной высоты */}
				<div
					ref={waveformRef}
					className={`flex items-end gap-[2px] h-8 select-none relative flex-1 ${
						isMetadataReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
					}`}
					onClick={handleWaveformClick}
				>
					{normalizedWaveform.map((value, index) => {
						const isActive = index < activeBarsNormalized
						const minHeight = 3
						const maxHeight = 34
						const normalizedValue = Math.max(0, Math.min(1, value))
						const easedValue = Math.pow(normalizedValue, 0.55)
						const height = Math.max(
							minHeight,
							Math.min(maxHeight, easedValue * (maxHeight - minHeight) + minHeight)
						)

						return (
							<div
								key={index}
								className={`w-[3px] rounded-full transition-all duration-100 ${
									isActive ? 'bg-emerald-300' : 'bg-emerald-500/35'
								}`}
								style={{
									height: `${height}px`,
									opacity: normalizedValue < 0.08 ? 0.25 : isActive ? 1 : 0.6,
								}}
							/>
						)
					})}
				</div>

				{/* Длительность и размер файла */}
				<div className='flex items-center gap-2 text-[11px] text-emerald-200/85'>
					<span>{displayDuration}</span>
					{fileSizeLabel && (
						<span className='text-emerald-300/60'>{fileSizeLabel}</span>
					)}
				</div>
			</div>
		</div>
	)
}
