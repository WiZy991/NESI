'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

type Badge = {
  id: string
  name: string
  description: string
  icon: string
  earnedAt?: string
}

type LevelInfo = {
  level: number
  levelName?: string
  levelDescription?: string
  xp: number
  nextLevelXP: number | null
  nextLevelName?: string | null
  xpToNextLevel: number
  progressPercent: number
  suggestions: string[]
  badges: Badge[]
}

export default function LevelPage() {
  const { token } = useUser()
  const [data, setData] = useState<LevelInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const fetchLevel = async () => {
      try {
        const res = await fetch('/api/users/me/level', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Ошибка загрузки уровня:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLevel()
  }, [token])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка данных уровня...</p>
        </div>
      </div>
    )

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 font-semibold">Не удалось загрузить данные</p>
          <p className="text-sm text-gray-400 mt-2">Попробуйте обновить страницу</p>
        </div>
      </div>
    )

  const renderSuggestion = (text: string) => {
    if (text.includes('тест')) {
      return (
        <>
          <Link href="/cert" className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition">
            Пройди
          </Link>{' '}
          дополнительные тесты, чтобы набрать опыт
        </>
      )
    }

    if (text.includes('задач')) {
      return (
        <>
          <Link href="/tasks" className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition">
            Выполни
          </Link>{' '}
          больше задач — это даст XP и поднимет рейтинг
        </>
      )
    }

    if (text.includes('отзыв')) {
      return (
        <>
          <Link href="/profile" className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition">
            Собери
          </Link>{' '}
          больше отзывов с рейтингом 4+
        </>
      )
    }

    return text
  }

  const isIconUrl = (icon: string) => {
    return icon.startsWith('http') || icon.startsWith('/') || icon.includes('.')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Hero секция с уровнем */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-black/80 via-emerald-900/20 to-black/80 border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.4)] mb-8 backdrop-blur-xl">
        {/* Декоративные элементы */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-400/15 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative p-8 sm:p-12 lg:p-16">
          {/* Заголовок */}
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]">
              Уровень {data.level}
            </h1>
            {data.levelName && (
              <p className="text-xl sm:text-2xl lg:text-3xl text-emerald-300 font-bold mb-2">
                {data.levelName}
              </p>
            )}
            {data.levelDescription && (
              <p className="text-base sm:text-lg text-gray-300 max-w-2xl">
                {data.levelDescription}
              </p>
            )}
          </div>

          {/* Статистика XP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm hover:border-emerald-500/60 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <div className="text-sm text-gray-400 mb-2">Текущий опыт</div>
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400">
                {data.xp.toLocaleString('ru-RU')}
              </div>
              <div className="text-xs text-emerald-300 mt-1">XP</div>
            </div>
            
            {data.nextLevelXP && (
              <>
                <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm hover:border-emerald-500/60 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="text-sm text-gray-400 mb-2">До следующего уровня</div>
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-400">
                    {data.xpToNextLevel.toLocaleString('ru-RU')}
                  </div>
                  <div className="text-xs text-emerald-300 mt-1">XP</div>
                </div>
                
                <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm hover:border-emerald-500/60 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="text-sm text-gray-400 mb-2">Прогресс</div>
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-400">
                    {data.progressPercent}%
                  </div>
                  <div className="text-xs text-emerald-300 mt-1">завершено</div>
                </div>
              </>
            )}
          </div>

          {/* Прогрессбар */}
          {data.nextLevelXP && (
            <div className="relative">
              <div className="w-full bg-black/60 h-12 sm:h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${data.progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  {data.progressPercent > 20 && (
                    <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-black text-black drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)]">
                      {data.progressPercent}%
                    </span>
                  )}
                </div>
              </div>
              {data.nextLevelName && (
                <div className="mt-3 text-center text-sm text-gray-400">
                  Следующий уровень: <span className="text-emerald-400 font-semibold">{data.nextLevelName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Бейджи - главная секция */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-black/60 via-gray-900/60 to-black/60 border border-emerald-500/30 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">🏅</span>
              <span>Твои достижения</span>
            </h2>
            {data.badges && data.badges.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
                <span className="text-emerald-300 font-bold text-lg">{data.badges.length}</span>
                <span className="text-emerald-400 text-sm">бейджей</span>
              </div>
            )}
          </div>
          
          {!data.badges || data.badges.length === 0 ? (
            <div className="bg-gradient-to-br from-black/40 to-gray-900/20 border-2 border-dashed border-emerald-500/30 rounded-2xl p-12 sm:p-16 text-center">
              <div className="text-6xl sm:text-7xl mb-4 opacity-60">🏆</div>
              <p className="text-xl text-gray-300 font-semibold mb-2">Пока нет достижений</p>
              <p className="text-sm text-gray-500">Выполняй задачи, проходи тесты и получай бейджи!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="group relative overflow-hidden bg-gradient-to-br from-black/60 via-gray-900/40 to-black/60 border-2 border-emerald-500/30 rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.03] cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {isIconUrl(badge.icon) ? (
                          <div className="relative">
                            <Image
                              src={badge.icon}
                              alt={badge.name}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all">
                            {badge.icon}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg mb-1 group-hover:text-emerald-300 transition">
                          {badge.name}
                        </h3>
                        {badge.earnedAt && (
                          <p className="text-xs text-emerald-400/80">
                            {new Date(badge.earnedAt).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Подсказки */}
      <div className="bg-gradient-to-br from-black/60 via-gray-900/60 to-black/60 border border-emerald-500/30 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-3 mb-6">
          <span className="text-3xl sm:text-4xl">💡</span>
          <span>Как улучшить свой уровень</span>
        </h2>
        
        {data.suggestions.length > 0 ? (
          <div className="space-y-4">
            {data.suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-black/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-black/60 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-bold text-sm group-hover:scale-110 transition-transform">
                  {i + 1}
                </div>
                <div className="flex-1 text-gray-300 text-base leading-relaxed">
                  {renderSuggestion(s)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/40 rounded-2xl p-8 sm:p-12 text-center">
            <div className="text-5xl sm:text-6xl mb-4">🎉</div>
            <p className="text-emerald-300 font-bold text-xl mb-2">Отличная работа!</p>
            <p className="text-gray-300 text-base">Ты на правильном пути к новым достижениям!</p>
          </div>
        )}
      </div>
    </div>
  )
}
