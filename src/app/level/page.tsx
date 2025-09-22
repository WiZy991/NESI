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
}

type LevelInfo = {
  level: number
  xp: number
  nextLevelXP: number | null
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
    return <div className="text-center mt-10 text-gray-400">Загрузка...</div>

  if (!data)
    return (
      <div className="text-center mt-10 text-red-500">
        Не удалось загрузить данные
      </div>
    )

  const renderSuggestion = (text: string) => {
    if (text.includes('тест')) {
      return (
        <>
          <Link href="/cert" className="text-blue-400 hover:underline">
            Пройди
          </Link>{' '}
          дополнительные тесты, чтобы набрать опыт
        </>
      )
    }

    if (text.includes('задач')) {
      return (
        <>
          <Link href="/tasks" className="text-blue-400 hover:underline">
            Выполни
          </Link>{' '}
          больше задач — это даст XP и поднимет рейтинг
        </>
      )
    }

    if (text.includes('отзыв')) {
      return (
        <>
          <Link href="/profile" className="text-blue-400 hover:underline">
            Собери
          </Link>{' '}
          больше отзывов с рейтингом 4+
        </>
      )
    }

    return text
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 rounded-xl bg-black/40 border border-green-500/30 shadow-[0_0_20px_rgba(0,255,150,0.2)] text-white">
      <h1 className="text-2xl font-bold mb-6 text-green-400">🌟 Твой уровень</h1>

      <div className="space-y-2 mb-6 text-gray-300">
        <p>
          Уровень: <span className="font-semibold text-white">{data.level}</span>
        </p>
        <p>
          Опыт (XP):{' '}
          <span className="font-semibold text-white">{data.xp}</span>
        </p>

        {data.nextLevelXP && (
          <p>
            До следующего уровня:{' '}
            <span className="font-semibold text-white">
              {data.xpToNextLevel} XP
            </span>
          </p>
        )}
      </div>

      {/* 🔋 Прогрессбар */}
      <div className="w-full bg-gray-800 h-5 rounded-lg overflow-hidden mb-8">
        <div
          className="h-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-400 transition-all"
          style={{ width: `${data.progressPercent}%` }}
        ></div>
      </div>

      {/* 📌 Подсказки */}
      <h2 className="text-lg font-semibold mb-2 text-blue-400">📌 Подсказки:</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-8">
        {data.suggestions.length > 0 ? (
          data.suggestions.map((s, i) => <li key={i}>{renderSuggestion(s)}</li>)
        ) : (
          <li>Ты красавчик, всё идёт по плану!</li>
        )}
      </ul>

      {/* 🏅 Бейджи */}
      <h2 className="text-lg font-semibold mb-2 text-yellow-400">🏅 Твои бейджи:</h2>
      {!data.badges || data.badges.length === 0 ? (
        <p className="text-gray-400">Пока ничего, но всё впереди!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center space-x-3 bg-gray-800/60 p-3 rounded-lg border border-gray-700 hover:border-yellow-500 transition shadow"
            >
              <Image
                src={badge.icon}
                alt={badge.name}
                width={40}
                height={40}
                className="rounded"
              />
              <div>
                <p className="font-semibold text-white">{badge.name}</p>
                <p className="text-sm text-gray-400">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
