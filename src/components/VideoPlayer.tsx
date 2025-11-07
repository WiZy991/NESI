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
  const isSeekingRef = useRef(false) // Флаг перемотки через ref для избежания задержек
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedEnd, setBufferedEnd] = useState(0) // Конец загруженной части для буферизации
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showControls, setShowControls] = useState(false) // Скрываем по умолчанию
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
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

    // Флаг для отслеживания монтирования компонента
    let isMounted = true
    let animationFrameId: number | null = null

    const updateTime = () => {
      if (isMounted && video) {
        setCurrentTime(video.currentTime)
      }
    }
    
    // Плавное обновление времени и буферизации через requestAnimationFrame
    const smoothUpdate = () => {
      if (!isMounted || !video) return
      
      // Не обновляем время во время перемотки (пользователь сам управляет)
      if (!isSeekingRef.current) {
        setCurrentTime(video.currentTime)
      }
      
      // Обновляем буферизацию (загруженную часть)
      if (video.buffered.length > 0 && video.duration > 0) {
        // Находим самый дальний загруженный момент
        let maxBuffered = 0
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.end(i) > maxBuffered) {
            maxBuffered = video.buffered.end(i)
          }
        }
        setBufferedEnd(maxBuffered)
      }
      
      // Продолжаем обновление, если видео играет или загружается
      if (!video.paused || video.readyState < 3) {
        animationFrameId = requestAnimationFrame(smoothUpdate)
      }
    }
    
    const updateDuration = () => {
      if (isMounted && video) {
        setDuration(video.duration)
      }
    }
    
    // Обновление буферизации при загрузке
    const updateBuffered = () => {
      if (!isMounted || !video || !video.duration) return
      
      if (video.buffered.length > 0) {
        let maxBuffered = 0
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.end(i) > maxBuffered) {
            maxBuffered = video.buffered.end(i)
          }
        }
        setBufferedEnd(maxBuffered)
      }
    }
    const handlePlay = () => {
      if (isMounted) {
        setIsPlaying(true)
        // Запускаем плавное обновление при воспроизведении
        animationFrameId = requestAnimationFrame(smoothUpdate)
      }
    }
    const handlePause = () => {
      if (isMounted) {
        setIsPlaying(false)
        // Обновляем время один раз при паузе
        if (video) {
          setCurrentTime(video.currentTime)
        }
        // Останавливаем плавное обновление при паузе
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      }
    }
    const handleFullscreenChange = () => {
      if (isMounted) {
        // Поддерживаем разные браузеры
        const isFullscreenNow = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
        setIsFullscreen(isFullscreenNow)
      }
    }
    
    // Обработка ошибок воспроизведения
    const handleError = (e: Event) => {
      if (isMounted && onError) {
        onError(e as any)
      }
    }

    // Обработка прерывания воспроизведения
    const handleAbort = () => {
      if (isMounted && video) {
        // Если видео было удалено, останавливаем воспроизведение
        try {
          if (!video.paused) {
            video.pause()
          }
          setIsPlaying(false)
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
          }
        } catch (err) {
          // Игнорируем ошибки при остановке
        }
      }
    }

    // Используем progress для обновления буферизации
    video.addEventListener('progress', updateBuffered)
    video.addEventListener('loadedmetadata', () => {
      updateDuration()
      updateBuffered()
    })
    video.addEventListener('loadeddata', updateBuffered)
    video.addEventListener('canplay', updateBuffered)
    video.addEventListener('canplaythrough', updateBuffered)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)
    video.addEventListener('abort', handleAbort)
    video.addEventListener('waiting', () => {
      // При буферизации продолжаем обновление
      if (isMounted && !animationFrameId) {
        animationFrameId = requestAnimationFrame(smoothUpdate)
      }
    })
    video.addEventListener('playing', () => {
      // При возобновлении воспроизведения
      if (isMounted && !animationFrameId) {
        animationFrameId = requestAnimationFrame(smoothUpdate)
      }
    })
    // Добавляем слушатели для всех вариантов события полноэкранного режима
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    // Запускаем обновление сразу для отслеживания загрузки
    animationFrameId = requestAnimationFrame(smoothUpdate)

    return () => {
      isMounted = false
      
      // Отменяем анимацию
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      
      // Безопасное удаление слушателей
      if (video) {
        try {
          video.removeEventListener('progress', updateBuffered)
          video.removeEventListener('loadedmetadata', updateDuration)
          video.removeEventListener('loadeddata', updateBuffered)
          video.removeEventListener('canplay', updateBuffered)
          video.removeEventListener('canplaythrough', updateBuffered)
          video.removeEventListener('play', handlePlay)
          video.removeEventListener('pause', handlePause)
          video.removeEventListener('error', handleError)
          video.removeEventListener('abort', handleAbort)
          video.removeEventListener('waiting', () => {})
          video.removeEventListener('playing', () => {})
          
          // Останавливаем воспроизведение при размонтировании
          try {
            if (!video.paused) {
              video.pause()
            }
          } catch (err) {
            // Игнорируем ошибки при остановке
          }
        } catch (err) {
          // Игнорируем ошибки при очистке
        }
      }
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [onError])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    // Проверяем, что видео все еще в DOM
    if (!video.offsetParent && video.parentElement === null) {
      return
    }

    try {
      if (video.paused) {
        // play() возвращает промис, который может быть отклонен
        await video.play().catch((err) => {
          // Игнорируем ошибки, если видео было удалено из DOM
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            // Это нормально - пользователь может не разрешить автовоспроизведение
            // или видео было удалено из DOM
            return
          }
          console.warn('Ошибка воспроизведения видео:', err)
        })
      } else {
        video.pause()
      }
    } catch (err: any) {
      // Дополнительная обработка ошибок
      if (err.name !== 'AbortError') {
        console.warn('Ошибка управления видео:', err)
      }
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

  const handleSeekStart = () => {
    isSeekingRef.current = true
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const newTime = parseFloat(e.target.value)
    // Обновляем состояние сразу для отзывчивости (зеленая полоса привязана к этому значению)
    setCurrentTime(newTime)
    // Обновляем видео
    video.currentTime = newTime
  }

  const handleSeekEnd = () => {
    const video = videoRef.current
    if (!video) return
    // Синхронизируем с реальным временем видео
    setCurrentTime(video.currentTime)
    isSeekingRef.current = false
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video) return

    // Проверяем, является ли это iOS устройством
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    // Проверяем текущий полноэкранный режим (поддерживаем разные браузеры)
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )

    if (!isCurrentlyFullscreen) {
      // Входим в полноэкранный режим
      if (isIOS) {
        // Для iOS используем нативный метод видео элемента
        if ((video as any).webkitEnterFullscreen) {
          ;(video as any).webkitEnterFullscreen()
        }
      } else {
        // Для других платформ используем Fullscreen API
        const element = container || video
        
        if (element.requestFullscreen) {
          element.requestFullscreen().catch((err) => {
            console.error('Ошибка при переходе в полноэкранный режим:', err)
          })
        } else if ((element as any).webkitRequestFullscreen) {
          // Для Safari (desktop) и старых браузеров
          ;(element as any).webkitRequestFullscreen()
        } else if ((element as any).mozRequestFullScreen) {
          ;(element as any).mozRequestFullScreen()
        } else if ((element as any).msRequestFullscreen) {
          ;(element as any).msRequestFullscreen()
        }
      }
    } else {
      // Выходим из полноэкранного режима
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Ошибка при выходе из полноэкранного режима:', err)
        })
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        ;(document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        ;(document as any).msExitFullscreen()
      }
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

  // Вычисляем проценты для прогресса и буферизации
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-md overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%' }}
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
        className="w-full h-full object-contain"
        preload={isVisible ? "metadata" : "none"}
        playsInline // Разрешаем встроенное воспроизведение на iOS
        controlsList="nodownload" // Отключаем скачивание, но разрешаем полноэкранный режим через наш контрол
        disablePictureInPicture // Отключаем Picture-in-Picture
        onError={(e) => {
          // Обрабатываем ошибки воспроизведения
          if (onError) {
            onError(e)
          }
        }}
        onLoadedMetadata={() => setIsLoaded(true)}
        onClick={async (e) => {
          e.stopPropagation()
          await togglePlay()
        }}
        onContextMenu={(e) => {
          e.preventDefault() // Блокируем контекстное меню (правый клик)
        }}
        onAbort={() => {
          // Обрабатываем прерывание загрузки/воспроизведения
          setIsPlaying(false)
          setIsLoaded(false)
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
          onClick={async (e) => {
            e.stopPropagation()
            await togglePlay()
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
          {/* Прогресс-бар в стиле Telegram */}
          <div className="relative h-4 flex items-center">
            {/* Фоновая полоса (непрогретая часть) - самый нижний слой */}
            <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-gray-700/50 rounded-full" />
            {/* Серая полоса буферизации (загруженная часть) - средний слой */}
            {bufferedPercent > 0 && (
              <div 
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-gray-600 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${bufferedPercent}%` }}
              />
            )}
            {/* Зеленая полоса прогресса (до текущей позиции) - верхний слой */}
            {/* Всегда показываем, без transition - обновление уже плавное через RAF */}
            <div 
              className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-emerald-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Input range - самый верхний слой для интерактивности */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeek}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="absolute top-1/2 left-0 w-full h-4 -translate-y-1/2 bg-transparent rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: 'transparent',
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation()
                // Обработка клика по полоске для перемотки
                const rect = (e.currentTarget as HTMLInputElement).getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                const newTime = percent * duration
                if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
                  setCurrentTime(newTime)
                  const video = videoRef.current
                  if (video) {
                    video.currentTime = newTime
                  }
                }
              }}
            />
            <style jsx>{`
              .slider {
                -webkit-appearance: none;
                appearance: none;
                cursor: pointer;
                margin: 0;
                padding: 0;
              }
              .slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #10b981;
                cursor: grab;
                border: 2px solid #ffffff;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
                margin-top: -5px;
                transition: transform 0.1s ease, width 0.1s ease, height 0.1s ease, margin-top 0.1s ease;
              }
              .slider::-webkit-slider-thumb:hover {
                transform: scale(1.15);
                width: 16px;
                height: 16px;
                margin-top: -6px;
              }
              .slider::-webkit-slider-thumb:active {
                cursor: grabbing;
                transform: scale(1.2);
                width: 18px;
                height: 18px;
                margin-top: -7px;
              }
              .slider::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #10b981;
                cursor: grab;
                border: 2px solid #ffffff;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
                transition: transform 0.1s ease;
                position: relative;
              }
              .slider::-moz-range-thumb:hover {
                transform: scale(1.15);
              }
              .slider::-moz-range-thumb:active {
                cursor: grabbing;
                transform: scale(1.2);
              }
              .slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: transparent;
                border-radius: 2px;
              }
              .slider::-moz-range-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: transparent;
                border-radius: 2px;
              }
            `}</style>
          </div>

          {/* Кнопки управления */}
          <div className="flex items-center gap-2 text-white">
            <button
              onClick={async (e) => {
                e.stopPropagation()
                await togglePlay()
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
              onTouchEnd={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              className="p-1.5 hover:bg-white/20 rounded transition touch-manipulation"
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
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

