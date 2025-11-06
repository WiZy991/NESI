'use client'

import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  className?: string
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void
}

export default function VideoPlayer({ src, className = '', onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showControls, setShowControls] = useState(false) // Скрываем по умолчанию
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  
  // Lazy loading - загружаем видео только когда оно видимо
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
          }
        })
      },
      { rootMargin: '100px' } // Начинаем загрузку за 100px до появления в viewport
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newTime = parseFloat(e.target.value)
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch((err) => {
        console.error('Ошибка при переходе в полноэкранный режим:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    // Сбрасываем таймер при движении мыши
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    // Автоматически скрываем контролы через 3 секунды бездействия, если видео воспроизводится
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-md overflow-hidden ${className}`}
      onMouseEnter={() => {
        setIsHovered(true)
        setShowControls(true)
        // Сбрасываем таймер при наведении
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        // Скрываем контролы сразу при уходе мыши
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current)
        }
        setShowControls(false)
      }}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={isVisible ? src : undefined}
        className="w-full h-full"
        preload={isVisible ? "metadata" : "none"}
        playsInline
        controlsList="nodownload nofullscreen" // Отключаем скачивание и полноэкранный режим через стандартные контролы
        disablePictureInPicture // Отключаем Picture-in-Picture
        onError={onError}
        onLoadedMetadata={() => setIsLoaded(true)}
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        onContextMenu={(e) => {
          e.preventDefault() // Блокируем контекстное меню (правый клик)
        }}
      />
      
      {/* Плейсхолдер пока видео не видимо */}
      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-sm">Видео загрузится при прокрутке</div>
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isVisible && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Затемнение для контролов */}
      {(showControls || isHovered) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Центральная кнопка play/pause */}
      {(showControls || isHovered) && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition">
            <Play className="w-12 h-12 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Контролы внизу */}
      {(showControls || isHovered) && (
        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2 z-10">
          {/* Прогресс-бар */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${progress}%, #374151 ${progress}%, #374151 100%)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #10b981;
                cursor: pointer;
              }
              .slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #10b981;
                cursor: pointer;
                border: none;
              }
            `}</style>
          </div>

          {/* Кнопки управления */}
          <div className="flex items-center gap-2 text-white">
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
              className="p-1.5 hover:bg-white/20 rounded transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" fill="white" />
              )}
            </button>

            <div className="flex items-center gap-1 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
                className="p-1.5 hover:bg-white/20 rounded transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, #374151 ${volume * 100}%, #374151 100%)`,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <span className="text-xs text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              className="p-1.5 hover:bg-white/20 rounded transition"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

