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

	// Инициализация аудио элемента
	useEffect(() => {
		if (!audioUrl) return

		const audioElement = new Audio(audioUrl)
		audioRef.current = audioElement

		const handleLoadedMetadata = () => {
			const loadedDuration = audioElement.duration
			// Проверяем, что duration валидный (не NaN, не Infinity, больше 0)
			if (loadedDuration && isFinite(loadedDuration) && loadedDuration > 0) {
				setAudioDuration(loadedDuration)
			} else if (duration && isFinite(duration) && duration > 0) {
				// Используем переданный duration как fallback
				setAudioDuration(duration)
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
	}, [audioUrl, duration])

	// Управление воспроизведением
	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		if (isPlaying) {
			const playPromise = audioElement.play()
			if (playPromise && typeof playPromise.then === 'function') {
				playPromise.catch(() => {
					setIsPlaying(false)
				})
			}
		} else {
			audioElement.pause()
		}
	}, [isPlaying])

	const togglePlayback = () => {
		setIsPlaying(prev => !prev)
	}

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!audioRef.current || !waveformRef.current) return

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
		if (!bytes) return ''
		if (bytes < 1024) return `${bytes} Б`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
		return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
	}

	// Используем переданный duration, если audioDuration не загрузился
	const effectiveDuration =
		audioDuration > 0 ? audioDuration : duration > 0 ? duration : 0
	const progressRatio =
		effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0

	// Нормализуем waveform - если массив пустой или слишком маленький, создаем дефолтный
	const normalizedWaveform = useMemo(() => {
		if (!waveform || waveform.length === 0) {
			// Создаем дефолтный waveform из 36 элементов
			return Array.from({ length: 36 }, () => Math.random() * 0.5 + 0.3)
		}
		// Если waveform слишком маленький, увеличиваем его
		if (waveform.length < 20) {
			const expanded = []
			for (let i = 0; i < 36; i++) {
				const sourceIndex = Math.floor((i / 36) * waveform.length)
				expanded.push(waveform[sourceIndex] || 0.3)
			}
			return expanded
		}
		// Если waveform слишком большой, уменьшаем его
		if (waveform.length > 50) {
			const step = waveform.length / 36
			return Array.from({ length: 36 }, (_, i) => {
				const index = Math.floor(i * step)
				return waveform[index] || 0.3
			})
		}
		return waveform
	}, [waveform])

	const activeBarsNormalized = Math.floor(
		progressRatio * normalizedWaveform.length
	)

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			{/* Кнопка Play/Pause - в фирменном стиле платформы (emerald) */}
			<button
				type='button'
				onClick={togglePlayback}
				className='w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 transition-all flex-shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:shadow-[0_0_16px_rgba(16,185,129,0.6)]'
				aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
			>
				{isPlaying ? (
					<Pause className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-white' />
				) : (
					<Play className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ml-0.5' />
				)}
			</button>

			{/* Визуализация волны */}
			<div className='flex-1 min-w-0'>
				{/* Волна с прогрессом - как в Telegram */}
				<div
					ref={waveformRef}
					className='flex items-end gap-[1.5px] sm:gap-[2px] h-6 sm:h-7 cursor-pointer select-none relative'
					onClick={handleWaveformClick}
				>
					{/* Волна - вертикальные полоски как в Telegram */}
					<div className='relative flex items-end gap-[1.5px] sm:gap-[2px] h-full w-full'>
						{normalizedWaveform.map((value, index) => {
							const isActive = index < activeBarsNormalized
							// Высота полоски: минимум 2px, максимум 100% высоты контейнера
							const minHeight = 2
							const maxHeight = 28 // h-7 = 28px
							const height = Math.max(
								minHeight,
								Math.min(maxHeight, value * maxHeight)
							)

							return (
								<div
									key={index}
									className={`w-[2px] sm:w-[2.5px] rounded-full transition-all duration-150 ${
										isActive
											? 'bg-emerald-400'
											: 'bg-emerald-500/30'
									}`}
									style={{
										height: `${height}px`,
										opacity: value < 0.1 ? 0.2 : isActive ? 1 : 0.4,
									}}
								/>
							)
						})}
					</div>
				</div>

				{/* Размер файла и время внизу - в фирменном стиле */}
				<div className='flex items-center justify-between text-[9px] sm:text-[10px] mt-0.5'>
					<span className='text-emerald-300/80 font-medium'>
						{formatTime(currentTime)} / {formatTime(effectiveDuration)}
					</span>
					{fileSize && (
						<span className='text-emerald-400/60'>
							{formatFileSize(fileSize)}
						</span>
					)}
				</div>
			</div>
		</div>
	)
}
