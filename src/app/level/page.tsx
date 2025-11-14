'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'
import BadgeIcon from '@/components/BadgeIcon'
import BadgesModal from '@/components/BadgesModal'

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
  const [checkingBadges, setCheckingBadges] = useState(false)
  const [badgesModalOpen, setBadgesModalOpen] = useState(false)
  const [lockedBadges, setLockedBadges] = useState<any[]>([])

  useEffect(() => {
    if (!token) return

    const fetchLevel = async () => {
      try {
        // Сначала проверяем достижения
        setCheckingBadges(true)
        try {
          await fetch('/api/badges/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
        } catch (badgeError) {
          console.error('Ошибка проверки достижений:', badgeError)
        } finally {
          setCheckingBadges(false)
        }

        // Затем загружаем данные уровня
        const res = await fetch('/api/users/me/level', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        const json = await res.json()
        setData(json)

        // Загружаем недостигнутые достижения
        try {
          const badgesRes = await fetch('/api/badges/all', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
          if (badgesRes.ok) {
            const badgesData = await badgesRes.json()
            setLockedBadges(badgesData.locked || [])
          }
        } catch (err) {
          console.error('Ошибка загрузки недостигнутых достижений:', err)
        }
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

    if (text.includes('Выполни больше задач')) {
      return (
        <>
          <Link href="/tasks" className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition">
            Выполни
          </Link>{' '}
          больше задач — это даст XP и поднимет рейтинг
        </>
      )
    }

    if (text.includes('Завершенные задачи дают опыт')) {
      return (
        <>
          <Link href="/tasks" className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition">
            Завершенные задачи
          </Link>{' '}
          дают опыт — выполняй больше задач для роста уровня
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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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
              <p className="text-sm text-gray-500 mb-6">Выполняй задачи, проходи тесты и получай бейджи!</p>
              {lockedBadges.length > 0 && (
                <button
                  onClick={() => setBadgesModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-sm font-semibold"
                >
                  Показать скрытые достижения ({lockedBadges.length})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Полученные достижения */}
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-4">✓ Полученные</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {data.badges.map((badge, index) => (
                <div
                  key={`${badge.id}-${index}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] cursor-pointer"
                >
                  {/* Декоративный фон */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Игровая иконка бейджа */}
                      <div className="flex-shrink-0">
                        <BadgeIcon 
                          icon={badge.icon} 
                          name={badge.name} 
                          size="md"
                          className="group-hover:scale-110"
                        />
                      </div>
                      
                      {/* Название и дата */}
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-bold text-white text-base mb-1 group-hover:text-emerald-300 transition line-clamp-2">
                          {badge.name}
                        </h3>
                        {badge.earnedAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(badge.earnedAt).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Описание */}
                    <div className="bg-black/30 border border-gray-800/50 rounded-lg p-3 mt-2">
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Блестящий эффект сверху */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
                </div>
              </div>
              
              {/* Кнопка показать скрытые достижения */}
              {lockedBadges.length > 0 && (
                <button
                  onClick={() => setBadgesModalOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-base font-semibold flex items-center justify-center gap-2"
                >
                  <span>🔒</span>
                  <span>Показать скрытые достижения ({lockedBadges.length})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Информация о системе XP */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-black/60 via-gray-900/60 to-black/60 border border-emerald-500/30 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-3 mb-6">
            <span className="text-3xl sm:text-4xl">📊</span>
            <span>Как получить опыт (XP)</span>
          </h2>
          
          <div className="space-y-4">
            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-black/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-bold text-lg group-hover:scale-110 transition-transform">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition">
                    Завершение задачи
                  </h3>
                  <p className="text-gray-300 text-base mb-2">
                    Выполни задачу как исполнитель и получи опыт за качественную работу
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 font-bold text-sm">
                      +20 XP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-black/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-bold text-lg group-hover:scale-110 transition-transform">
                  ⭐
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition">
                    Получение хорошего отзыва
                  </h3>
                  <p className="text-gray-300 text-base mb-2">
                    Получи отзыв с рейтингом 4 или 5 звезд от заказчика
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 font-bold text-sm">
                      +5 XP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-black/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-bold text-lg group-hover:scale-110 transition-transform">
                  🎓
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition">
                    Прохождение сертификации
                  </h3>
                  <p className="text-gray-300 text-base mb-2">
                    Успешно пройди тест по категории и получи сертификацию
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 font-bold text-sm">
                      +10 XP
                    </span>
                    <span className="text-xs text-gray-500">за каждую сертификацию</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <p className="text-sm text-gray-300">
              <span className="text-emerald-400 font-semibold">💡 Совет:</span> Чем больше задач вы выполняете и чем выше качество вашей работы, тем быстрее вы повышаете уровень и получаете доступ к новым возможностям!
            </p>
          </div>
        </div>
      </div>

      {/* Преимущества уровней */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-black/60 via-gray-900/60 to-black/60 border border-emerald-500/30 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-3 mb-6">
            <span className="text-3xl sm:text-4xl">🎁</span>
            <span>Что дают повышения уровней</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Снижение комиссии */}
            <div className="bg-gradient-to-br from-emerald-900/30 via-black/40 to-emerald-900/30 border-2 border-emerald-500/40 rounded-2xl p-6 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/40 to-emerald-600/30 border-2 border-emerald-500/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  💰
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition">
                    Снижение комиссии
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Чем выше уровень, тем меньше комиссия платформы. Реальная экономия денег!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 1-2:</span>
                      <span className="text-emerald-400 font-bold">20%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 3:</span>
                      <span className="text-emerald-400 font-bold">19% <span className="text-emerald-500">(-1%)</span></span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 4:</span>
                      <span className="text-emerald-400 font-bold">18% <span className="text-emerald-500">(-2%)</span></span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 5:</span>
                      <span className="text-emerald-400 font-bold">17% <span className="text-emerald-500">(-3%)</span></span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 6:</span>
                      <span className="text-yellow-400 font-bold">12-16% <span className="text-yellow-500">(до -8%)</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Увеличение лимита задач */}
            <div className="bg-gradient-to-br from-blue-900/30 via-black/40 to-blue-900/30 border-2 border-blue-500/40 rounded-2xl p-6 hover:border-blue-500/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/40 to-blue-600/30 border-2 border-blue-500/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📋
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition">
                    Больше задач одновременно
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Выполняй несколько задач одновременно и зарабатывай больше!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 1:</span>
                      <span className="text-blue-400 font-bold">1 задача</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 2:</span>
                      <span className="text-blue-400 font-bold">2 задачи</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 3:</span>
                      <span className="text-blue-400 font-bold">3 задачи</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 4:</span>
                      <span className="text-blue-400 font-bold">5 задач</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 5:</span>
                      <span className="text-blue-400 font-bold">8 задач</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Уровень 6:</span>
                      <span className="text-yellow-400 font-bold">10 задач</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Приоритет в откликах */}
            <div className="bg-gradient-to-br from-purple-900/30 via-black/40 to-purple-900/30 border-2 border-purple-500/40 rounded-2xl p-6 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/40 to-purple-600/30 border-2 border-purple-500/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ⭐
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition">
                    Приоритет в откликах
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Твои отклики показываются первыми заказчикам. Больше шансов получить задачу!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-gray-300">Уровень 2: <span className="text-emerald-400 font-semibold">Зеленая рамка</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                      <span className="text-gray-300">Уровень 3: <span className="text-amber-400 font-semibold">Бронзовая рамка</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-gray-300">Уровень 4: <span className="text-gray-300 font-semibold">Серебряная рамка</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-300">Уровень 5: <span className="text-yellow-400 font-semibold">Золотая рамка</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-gray-300">Уровень 6: <span className="text-yellow-400 font-semibold">Легендарная рамка</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Визуальные привилегии */}
            <div className="bg-gradient-to-br from-pink-900/30 via-black/40 to-pink-900/30 border-2 border-pink-500/40 rounded-2xl p-6 hover:border-pink-500/60 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/40 to-pink-600/30 border-2 border-pink-500/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-300 transition">
                    Визуальные привилегии
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Выделяйся среди других исполнителей уникальным оформлением!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-pink-400">🎨</span>
                      <span className="text-gray-300">Рамка аватара (цвет зависит от уровня)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-pink-400">⭐</span>
                      <span className="text-gray-300">Иконка уровня рядом с именем</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-pink-400">🖼️</span>
                      <span className="text-gray-300">Эксклюзивные фоны профиля</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-pink-400">👑</span>
                      <span className="text-gray-300">Уровень 5+: <span className="text-yellow-400 font-semibold">Корона</span> и анимации</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-pink-400">💫</span>
                      <span className="text-gray-300">Уровень 6: <span className="text-yellow-400 font-semibold">Легендарное</span> оформление</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-5 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-pink-500/10 border-2 border-emerald-500/30 rounded-xl">
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-emerald-400 font-bold text-base">💎 Премиум статус:</span> На уровнях 5+ ты получаешь доступ к эксклюзивным анимациям, золотым рамкам и короне! Это не просто косметика — это признание твоего профессионализма и опыта.
            </p>
          </div>
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

      {/* Модальное окно всех достижений */}
      <BadgesModal
        isOpen={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
        earnedBadges={data.badges || []}
      />
    </div>
  )
}
