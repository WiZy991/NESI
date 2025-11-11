'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
	const activeBars = Math.floor(progressRatio * waveform.length)

	return (
		<div className={`flex items-center gap-3 ${className}`}>
			{/* Кнопка Play/Pause - как в Telegram (светло-голубая) */}
			<button
				type='button'
				onClick={togglePlayback}
				className='w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-sky-400 hover:bg-sky-500 transition-all flex-shrink-0 shadow-sm'
				aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
			>
				{isPlaying ? (
					<Pause className='w-5 h-5 text-white' />
				) : (
					<Play className='w-5 h-5 text-white ml-0.5' />
				)}
			</button>

			{/* Визуализация волны */}
			<div className='flex-1 min-w-0'>
				{/* Волна с прогрессом */}
				<div
					ref={waveformRef}
					className='flex items-end gap-[2px] sm:gap-[3px] h-12 sm:h-14 cursor-pointer select-none relative'
					onClick={handleWaveformClick}
				>
					{/* Фон прогресса - тонкая линия как в Telegram (всегда видна) */}
					<div
						className='absolute bottom-0 left-0 h-0.5 bg-sky-400 transition-all duration-150 pointer-events-none z-10'
						style={{
							width: `${Math.max(0, Math.min(100, progressRatio * 100))}%`,
						}}
					/>

					{/* Волна */}
					<div className='relative flex items-end gap-[2px] sm:gap-[3px] h-full w-full'>
						{waveform.map((value, index) => {
							const isActive = index <= activeBars
							const height = Math.max(8, value * 40)
							return (
								<div
									key={index}
									className={`flex-1 rounded-full transition-colors duration-150 ${
										isActive ? 'bg-sky-400' : 'bg-sky-400/30'
									}`}
									style={{
										height: `${height}px`,
										opacity: value < 0.1 ? 0.4 : 1,
									}}
								/>
							)
						})}
					</div>
				</div>

				{/* Размер файла и время внизу - как в Telegram */}
				<div className='flex items-center justify-between text-xs text-gray-400 mt-1'>
					<span>{formatTime(currentTime)}</span>
					{fileSize && (
						<span className='text-gray-500'>{formatFileSize(fileSize)}</span>
					)}
				</div>
			</div>
		</div>
	)
}
