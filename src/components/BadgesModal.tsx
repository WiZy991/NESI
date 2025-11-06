'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BadgeIcon from './BadgeIcon'
import { useUser } from '@/context/UserContext'

type Badge = {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
}

type BadgesModalProps = {
  isOpen: boolean
  onClose: () => void
  earnedBadges: Badge[]
}

export default function BadgesModal({ isOpen, onClose, earnedBadges }: BadgesModalProps) {
  const { token } = useUser()
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !token) return

    const fetchAllBadges = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/badges/all', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) throw new Error('Ошибка загрузки достижений')

        const data = await res.json()
        // Используем данные из API, которые уже правильно отфильтрованы по роли
        const all = [...data.earned, ...data.locked]
        setAllBadges(all)
      } catch (err) {
        console.error('Ошибка загрузки всех достижений:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllBadges()
  }, [isOpen, token])

  // Используем данные из API для определения earned, а не из пропса
  // earnedBadges из пропса используются только как fallback

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - фиксирован относительно viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10003] flex items-center justify-center"
            style={{ 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              position: 'fixed'
            }}
          >
            {/* Modal - центрирован с правильными размерами */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-emerald-500/40 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.4)] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col mx-4"
              style={{
                marginTop: '80px', // Отступ от хедера
                marginBottom: '20px'
              }}
            >
              {/* Header */}
              <div className="relative p-6 sm:p-8 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent mb-2">
                      🏆 Все достижения
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base">
                      {loading ? 'Загрузка...' : `${allBadges.filter(b => b.earned).length} из ${allBadges.length} получено`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {allBadges.map((badge) => {
                      // Используем earned из данных API, которые уже правильно отфильтрованы
                      const isEarned = badge.earned === true
                      
                      return (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: allBadges.indexOf(badge) * 0.05 }}
                          className={`group relative overflow-hidden rounded-xl p-5 transition-all duration-300 ${
                            isEarned
                              ? 'bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-emerald-500/50 hover:border-emerald-500/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                              : 'bg-gradient-to-br from-gray-950/90 via-black/90 to-gray-950/90 border-2 border-gray-800/50 opacity-60 hover:opacity-80'
                          }`}
                        >
                          {/* Декоративный фон */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${
                            isEarned
                              ? 'from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100'
                              : 'from-gray-800/5 via-transparent to-gray-800/5'
                          } transition-opacity duration-300`}></div>

                          <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-4">
                              {/* Иконка бейджа */}
                              <div className="flex-shrink-0 relative">
                                <div className={isEarned ? '' : 'grayscale opacity-50'}>
                                  <BadgeIcon
                                    icon={badge.icon}
                                    name={badge.name}
                                    size="md"
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                </div>
                                {/* Замок поверх иконки для недостигнутых */}
                                {!isEarned && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                    <div className="text-2xl opacity-70">🔒</div>
                                  </div>
                                )}
                              </div>

                              {/* Название */}
                              <div className="flex-1 min-w-0 pt-1">
                                <h3 className={`font-bold text-base mb-2 transition line-clamp-2 ${
                                  isEarned
                                    ? 'text-white group-hover:text-emerald-300'
                                    : 'text-gray-400'
                                }`}>
                                  {badge.name}
                                </h3>
                                <div className="flex items-center gap-1">
                                  {isEarned ? (
                                    <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                      ✓ Получено
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded-full border border-gray-700/50">
                                      🔒 Не получено
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Описание */}
                            <div className={`border rounded-lg p-3 mt-3 ${
                              isEarned
                                ? 'bg-black/30 border-gray-800/50'
                                : 'bg-black/50 border-gray-900/50'
                            }`}>
                              <p className={`text-xs leading-relaxed ${
                                isEarned ? 'text-gray-300' : 'text-gray-400'
                              }`}>
                                {badge.description}
                              </p>
                            </div>
                          </div>

                          {/* Блестящий эффект для полученных */}
                          {isEarned && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
                </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

