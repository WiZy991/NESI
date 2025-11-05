'use client'

import { useEffect, useState } from 'react'

type AchievementModalProps = {
  badge: {
    id: string
    name: string
    icon: string
    description?: string
  }
  onClose: () => void
}

export default function AchievementModal({ badge, onClose }: AchievementModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Анимация появления
    setTimeout(() => setIsVisible(true), 100)

    // Звуковой эффект
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      
      // Создаем более торжественный звук
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Триумфальный аккорд
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime) // E5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)
      
      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.8)
      oscillator2.stop(audioContext.currentTime + 0.8)
      
      // Второй аккорд для большей торжественности
      setTimeout(() => {
        const osc3 = audioContext.createOscillator()
        const osc4 = audioContext.createOscillator()
        const gain2 = audioContext.createGain()
        
        osc3.connect(gain2)
        osc4.connect(gain2)
        gain2.connect(audioContext.destination)
        
        osc3.frequency.setValueAtTime(659.25, audioContext.currentTime) // E5
        osc4.frequency.setValueAtTime(783.99, audioContext.currentTime) // G5
        
        gain2.gain.setValueAtTime(0, audioContext.currentTime)
        gain2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1)
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6)
        
        osc3.start(audioContext.currentTime)
        osc4.start(audioContext.currentTime)
        osc3.stop(audioContext.currentTime + 0.6)
        osc4.stop(audioContext.currentTime + 0.6)
      }, 200)
    } catch (error) {
      console.error('Ошибка воспроизведения звука:', error)
    }

    // Автоматическое закрытие через 5 секунд
    const timer = setTimeout(() => {
      handleClose()
    }, 5000)

    // Остановка конфетти через 3 секунды
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false)
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(confettiTimer)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 500) // Даем время на анимацию исчезновения
  }

  return (
    <>
      {/* Затемненный фон */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Конфетти */}
      {showConfetti && (
        <div className="fixed inset-0 z-[10001] pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: [
                  '#FFD700', // золотой
                  '#FF6B6B', // красный
                  '#4ECDC4', // бирюзовый
                  '#95E1D3', // мятный
                  '#F38181', // розовый
                  '#FFE66D', // желтый
                ][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Модальное окно */}
      <div
        className={`fixed inset-0 z-[10002] flex items-center justify-center p-4 pointer-events-none ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`bg-gradient-to-br from-yellow-900/95 via-emerald-900/95 to-yellow-900/95 border-4 border-yellow-500 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center shadow-2xl transform transition-all duration-700 pointer-events-auto ${
            isVisible
              ? 'scale-100 rotate-0'
              : 'scale-50 rotate-12'
          }`}
          style={{
            boxShadow: isVisible
              ? '0 0 80px rgba(234, 179, 8, 0.6), 0 0 120px rgba(16, 185, 129, 0.4), inset 0 0 60px rgba(234, 179, 8, 0.2)'
              : 'none',
          }}
        >
          {/* Лучи света */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 bg-gradient-radial from-yellow-400/30 via-transparent to-transparent animate-pulse" />
          </div>

          {/* Заголовок "ДОСТИЖЕНИЕ ПОЛУЧЕНО!" */}
          <div
            className={`mb-6 transform transition-all duration-700 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 mb-2">
              ДОСТИЖЕНИЕ ПОЛУЧЕНО!
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto rounded-full" />
          </div>

          {/* Иконка достижения */}
          <div
            className={`mb-6 transform transition-all duration-700 ${
              isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="relative inline-block">
              {/* Внешнее свечение */}
              <div className="absolute inset-0 bg-yellow-400/50 rounded-full blur-2xl animate-ping" />
              <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl animate-pulse" />
              
              {/* Иконка */}
              <div className="relative bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full p-6 sm:p-8 border-4 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.8)]">
                <span className="text-6xl sm:text-8xl block animate-bounce-slow">
                  {badge.icon}
                </span>
              </div>
            </div>
          </div>

          {/* Название достижения */}
          <div
            className={`mb-4 transform transition-all duration-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-yellow-200 mb-2">
              {badge.name}
            </h3>
          </div>

          {/* Описание */}
          {badge.description && (
            <div
              className={`mb-6 transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
                {badge.description}
              </p>
            </div>
          )}

          {/* Кнопка закрытия */}
          <button
            onClick={handleClose}
            className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{ transitionDelay: '1000ms' }}
          >
            Великолепно! ✨
          </button>

          {/* Прогресс-бар (опционально) */}
          <div className="mt-4 text-xs text-gray-400">
            Автоматически закроется через несколько секунд
          </div>
        </div>
      </div>

      {/* Стили для анимаций */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes gradient-radial {
          from {
            transform: scale(0.8);
            opacity: 0.5;
          }
          to {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </>
  )
}

