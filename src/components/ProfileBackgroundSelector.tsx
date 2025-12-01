'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { PROFILE_BACKGROUNDS, getAvailableBackgrounds, type ProfileBackground } from '@/lib/level/profileBackgrounds'
import { getLevelFromXP } from '@/lib/level/calculate'
import { toast } from 'sonner'
import '@/styles/level-animations.css'

type ProfileBackgroundSelectorProps = {
  currentLevel: number
  onClose: () => void
}

export function ProfileBackgroundSelector({ currentLevel, onClose }: ProfileBackgroundSelectorProps) {
  const { token, user } = useUser()
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableBackgrounds, setAvailableBackgrounds] = useState<ProfileBackground[]>([])

  useEffect(() => {
    const loadCurrentBackground = async () => {
      if (!token) return
      
      try {
        const res = await fetch('/api/profile/background', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setSelectedBackground(data.backgroundId || 'default')
        }
      } catch (err) {
        console.error('Ошибка загрузки фона:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentBackground()
    setAvailableBackgrounds(getAvailableBackgrounds(currentLevel))
  }, [token, currentLevel])

  const handleSelectBackground = async (backgroundId: string) => {
    if (!token || saving) return

    setSaving(true)
    try {
      const res = await fetch('/api/profile/background', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backgroundId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка сохранения')
      }

      setSelectedBackground(backgroundId)
      toast.success('Фон профиля обновлен')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения фона')
    } finally {
      setSaving(false)
    }
  }

  // Блокировка прокрутки фона при открытом модальном окне (включая состояние загрузки)
  useEffect(() => {
    // Сохраняем текущие значения
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    // Блокируем прокрутку
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    // Предотвращаем сдвиг контента при скрытии скроллбара
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    
    return () => {
      // Восстанавливаем исходные значения
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.paddingRight = ''
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998] overflow-hidden">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      style={{ touchAction: 'none' }}
    >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          style={{ touchAction: 'none' }}
        />

      {/* Modal */}
      <div 
        className="relative bg-gray-900 rounded-2xl border-2 border-emerald-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-emerald-500/20 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Выбор фона профиля</h2>
            <p className="text-sm text-gray-400">
              Новые фоны разблокируются при повышении уровня
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROFILE_BACKGROUNDS.map((background) => {
              const isAvailable = background.unlockLevel <= currentLevel
              const isSelected = selectedBackground === background.id
              const isLocked = !isAvailable

              return (
                <div
                  key={background.id}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-[1.03]'
                      : isLocked
                      ? 'border-gray-700/30 opacity-50 cursor-not-allowed'
                      : 'border-gray-700/40 hover:border-emerald-500/60 hover:shadow-[0_8px_25px_rgba(16,185,129,0.2)] hover:scale-[1.02] cursor-pointer'
                  }`}
                  onClick={() => !isLocked && !saving && handleSelectBackground(background.id)}
                >
                  {/* Превью фона */}
                  <div
                    className="h-48 w-full relative overflow-hidden transition-all duration-500 group-hover:scale-105"
                    style={{ background: background.gradient }}
                  >
                    {/* Градиентный overlay для лучшей видимости текста */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-70" />
                    
                    {/* Анимация градиента при hover (только для премиум фонов уровня 5+) */}
                    {!isLocked && background.isPremium && background.unlockLevel >= 5 && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 background-shine pointer-events-none"
                        style={{ 
                          background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                          backgroundSize: '200% 200%',
                          animation: 'gradient-flow 3s ease infinite'
                        }}
                      />
                    )}
                    
                    {/* Блестящий эффект для выбранного */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent background-shine pointer-events-none" />
                    )}
                    
                    {/* Индикатор выбранного */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.5)] backdrop-blur-sm border border-emerald-400/30">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Выбран</span>
                      </div>
                    )}

                    {/* Premium badge */}
                    {background.isPremium && !isLocked && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_20px_rgba(234,179,8,0.6)] backdrop-blur-sm border-2 border-yellow-300/50 animate-pulse">
                        <span className="text-sm animate-spin" style={{ animationDuration: '3s' }}>✨</span>
                        <span>Premium</span>
                      </div>
                    )}
                    
                    {/* Индикатор уровня разблокировки для доступных фонов */}
                    {!isLocked && !background.isPremium && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-emerald-500/80 to-emerald-600/80 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_15px_rgba(16,185,129,0.4)] backdrop-blur-sm border border-emerald-400/30">
                        <span className="text-sm">🎨</span>
                        <span>Уровень {background.unlockLevel}</span>
                      </div>
                    )}

                    {/* Декоративные элементы */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
                  </div>

                  {/* Информация о фоне */}
                  <div className="p-5 bg-gradient-to-b from-gray-800 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`font-bold text-base transition-colors ${
                          isSelected ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {background.name}
                        </h3>
                        {background.isPremium && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-yellow-400 font-semibold">⭐ ПРЕМИУМ</span>
                            {background.unlockLevel >= 6 && (
                              <span className="text-[10px] text-yellow-300 font-semibold">👑 ЛЕГЕНДАРНЫЙ</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed min-h-[2.5rem]">
                      {background.description}
                    </p>
                    
                    {/* Индикатор особенностей фона */}
                    {!isLocked && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {background.unlockLevel <= 2 && (
                          <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                            ✨ Анимация
                          </span>
                        )}
                        {background.unlockLevel >= 3 && background.unlockLevel < 5 && (
                          <>
                            <span className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
                              ✨ Анимация
                            </span>
                            <span className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-medium">
                              🌟 Эффекты
                            </span>
                          </>
                        )}
                        {background.isPremium && (
                          <>
                            <span className="px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-medium">
                              ✨ Премиум анимация
                            </span>
                            <span className="px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-medium">
                              💫 Уникальные эффекты
                            </span>
                            {background.unlockLevel >= 6 && (
                              <span className="px-2 py-1 rounded-md bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 text-[10px] font-bold">
                                👑 ЛЕГЕНДАРНЫЙ
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Статус */}
                    {isLocked ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-400">
                            Требуется уровень {background.unlockLevel}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Ваш уровень: {currentLevel}
                          </div>
                        </div>
                      </div>
                    ) : isSelected ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-emerald-400">Активный фон</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-400">Нажмите для выбора</span>
                      </div>
                    )}
                  </div>

                  {/* Overlay для заблокированных */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/80 border-2 border-gray-700 mb-3">
                          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-base text-white font-bold mb-1">
                          Заблокировано
                        </div>
                        <div className="text-sm text-gray-300 mb-1">
                          Требуется уровень {background.unlockLevel}
                        </div>
                        <div className="text-xs text-gray-400">
                          Ваш уровень: {currentLevel}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hover effect для доступных */}
                  {!isLocked && !isSelected && (
                    <>
                      <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-all duration-300 pointer-events-none rounded-2xl" />
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      {/* Пульсирующая рамка при hover */}
                      <div className="absolute -inset-0.5 rounded-2xl border-2 border-emerald-500/0 group-hover:border-emerald-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none animate-pulse" />
                    </>
                  )}

                  {/* Анимация для выбранного */}
                  {isSelected && (
                    <div className="absolute -inset-1 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse pointer-events-none" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

