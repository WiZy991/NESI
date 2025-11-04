'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'

interface LevelData {
  level: number
  levelName?: string
  xp: number
  progressPercent: number
}

export default function LevelIndicator() {
  const { user, token } = useUser()
  const [levelData, setLevelData] = useState<LevelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'executor' || !token) {
      setLoading(false)
      return
    }

    const fetchLevel = async () => {
      try {
        const res = await fetch('/api/users/me/level', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setLevelData({
            level: data.level,
            levelName: data.levelName,
            xp: data.xp,
            progressPercent: data.progressPercent,
          })
        }
      } catch (error) {
        console.error('Ошибка загрузки уровня:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLevel()
  }, [user, token])

  // Показываем только для исполнителей
  if (!user || user.role !== 'executor' || loading || !levelData) {
    return null
  }

  return (
    <Link
      href="/level"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all group"
      title={`Уровень ${levelData.level}${levelData.levelName ? ` (${levelData.levelName})` : ''} | ${levelData.xp} XP`}
      data-onboarding-target="nav-level"
    >
      {/* Иконка уровня */}
      <div className="flex items-center gap-1">
        <span className="text-emerald-400 font-bold text-sm">⭐</span>
        <span className="text-emerald-300 font-semibold text-sm">{levelData.level}</span>
      </div>

      {/* Мини-прогресс-бар */}
      <div className="w-16 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
          style={{ width: `${levelData.progressPercent}%` }}
        />
      </div>

      {/* XP (скрыто на маленьких экранах) */}
      <span className="text-xs text-gray-400 hidden sm:inline">
        {levelData.xp} XP
      </span>
    </Link>
  )
}

