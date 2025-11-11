'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface VoicePlayerProps {
	audioUrl: string
	waveform: number[]
	duration: number
	className?: string
}

export default function VoicePlayer({
	audioUrl,
	waveform,
	duration,
	className = '',
}: VoicePlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [audioDuration, setAudioDuration] = useState(duration)
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const waveformRef = useRef<HTMLDivElement | null>(null)

	// Инициализация аудио элемента
	useEffect(() => {
		if (!audioUrl) return

		const audioElement = new Audio(audioUrl)
		audioRef.current = audioElement

		const handleLoadedMetadata = () => {
			setAudioDuration(audioElement.duration || duration)
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
		const newTime = progress * audioDuration

		audioRef.current.currentTime = newTime
		setCurrentTime(newTime)
	}

	const formatTime = (seconds: number) => {
		const totalSeconds = Math.max(0, Math.round(seconds))
		const mins = Math.floor(totalSeconds / 60)
		const secs = totalSeconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const progressRatio =
		audioDuration > 0 ? Math.min(currentTime / audioDuration, 1) : 0
	const activeBars = Math.floor(progressRatio * waveform.length)

	return (
		<div className={`flex items-center gap-3 ${className}`}>
			{/* Кнопка Play/Pause */}
			<button
				type='button'
				onClick={togglePlayback}
				className='w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 border-emerald-300 bg-emerald-300/10 hover:bg-emerald-300/20 transition-all flex-shrink-0'
				aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
			>
				{isPlaying ? (
					<Pause className='w-5 h-5 text-emerald-300' />
				) : (
					<Play className='w-5 h-5 text-emerald-300 ml-0.5' />
				)}
			</button>

			{/* Визуализация волны */}
			<div className='flex-1 min-w-0'>
				<div
					ref={waveformRef}
					className='flex items-end gap-[2px] sm:gap-[3px] h-16 sm:h-18 lg:h-20 cursor-pointer select-none relative'
					onClick={handleWaveformClick}
				>
					{/* Фон прогресса */}
					<div
						className='absolute inset-0 bg-gradient-to-r from-emerald-400/25 to-emerald-500/40 rounded-lg pointer-events-none transition-all duration-150'
						style={{ width: `${progressRatio * 100}%` }}
					/>

					{/* Волна */}
					<div className='relative flex items-end gap-[2px] sm:gap-[3px] h-full w-full'>
						{waveform.map((value, index) => {
							const isActive = index <= activeBars
							const height = Math.max(10, value * 60)
							return (
								<div
									key={index}
									className={`flex-1 rounded-full transition-colors duration-150 ${
										isActive ? 'bg-emerald-300' : 'bg-emerald-500/25'
									}`}
									style={{
										height: `${height}px`,
										opacity: value < 0.1 ? 0.35 : 0.9,
									}}
								/>
							)
						})}
					</div>
				</div>

				{/* Время */}
				<div className='flex items-center justify-between text-[10px] text-emerald-100/80 mt-1'>
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(audioDuration)}</span>
				</div>
			</div>
		</div>
	)
}
