'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { PROFILE_BACKGROUNDS, getAvailableBackgrounds, type ProfileBackground } from '@/lib/level/profileBackgrounds'
import { getLevelFromXP } from '@/lib/level/calculate'
import { toast } from 'sonner'

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Выбор фона профиля</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-400 mb-6">
            Выберите фон для вашего профиля. Новые фоны разблокируются при повышении уровня.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROFILE_BACKGROUNDS.map((background) => {
              const isAvailable = background.unlockLevel <= currentLevel
              const isSelected = selectedBackground === background.id
              const isLocked = !isAvailable

              return (
                <div
                  key={background.id}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50'
                      : isLocked
                      ? 'border-gray-700 opacity-50 cursor-not-allowed'
                      : 'border-gray-700 hover:border-emerald-500/50'
                  }`}
                  onClick={() => !isLocked && handleSelectBackground(background.id)}
                >
                  {/* Превью фона */}
                  <div
                    className="h-32 w-full"
                    style={{ background: background.gradient }}
                  />

                  {/* Информация о фоне */}
                  <div className="p-3 bg-gray-800/90">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white text-sm">{background.name}</h3>
                      {background.isPremium && (
                        <span className="text-xs text-yellow-400">⭐</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{background.description}</p>
                    {isLocked ? (
                      <div className="text-xs text-gray-500">
                        🔒 Уровень {background.unlockLevel}
                      </div>
                    ) : isSelected ? (
                      <div className="text-xs text-emerald-400">✓ Выбран</div>
                    ) : null}
                  </div>

                  {/* Overlay для заблокированных */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl mb-1">🔒</div>
                        <div className="text-xs text-white font-semibold">
                          Уровень {background.unlockLevel}
                        </div>
                      </div>
                    </div>
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

