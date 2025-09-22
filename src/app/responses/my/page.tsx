'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'

interface Response {
  id: string
  message: string
  price: number
  createdAt: string
  task: {
    id: string
    title: string
    status: string
    customer: {
      id: string
      fullName: string | null
      email: string
    }
  }
}

const statusMap: Record<string, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  completed: 'Выполнена',
  cancelled: 'Отменена',
}

const statusColorMap: Record<string, string> = {
  open: 'text-yellow-400',
  in_progress: 'text-blue-400',
  completed: 'text-green-400',
  cancelled: 'text-red-400',
}

export default function MyResponsesPage() {
  const { token } = useUser()
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const fetchResponses = async () => {
      if (!token) return

      try {
        const res = await fetch('/api/responses/my', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error('Не удалось получить отклики')

        const data = await res.json()
        setResponses(data.responses || [])
      } catch (err) {
        console.error('❌ Ошибка загрузки откликов:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResponses()
  }, [token])

  const handleWithdraw = async (responseId: string) => {
    const confirmed = confirm('Вы уверены, что хотите отозвать отклик?')
    if (!confirmed || !token) return

    try {
      const res = await fetch(`/api/responses/${responseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Не удалось отозвать отклик')

      setResponses((prev) => prev.filter((r) => r.id !== responseId))
    } catch (err) {
      console.error('Ошибка при отзыве отклика:', err)
    }
  }

  if (loading) {
    return <p className="text-center mt-10 text-gray-400">Загрузка откликов...</p>
  }

  const filteredResponses =
    filterStatus === 'all'
      ? responses
      : responses.filter((r) => r.task.status === filterStatus)

  const stats = {
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  }

  responses.forEach((r) => {
    if (stats[r.task.status] !== undefined) {
      stats[r.task.status]++
    }
  })

  const total = responses.length || 1
  const percentages = {
    open: (stats.open / total) * 100,
    in_progress: (stats.in_progress / total) * 100,
    completed: (stats.completed / total) * 100,
    cancelled: (stats.cancelled / total) * 100,
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-400">📨 Мои отклики</h1>

      {/* 📊 Статистика */}
      <div className="mb-6 bg-black/40 border border-green-500/30 rounded-lg p-4 shadow-[0_0_10px_rgba(0,255,150,0.2)] text-sm text-gray-300">
        <p className="mb-2 font-semibold text-green-400">📌 Статистика:</p>
        <ul className="space-y-1 mb-3">
          <li>Ожидают ответа: <b>{stats.open}</b></li>
          <li>В работе: <b>{stats.in_progress}</b></li>
          <li>Завершённые: <b>{stats.completed}</b></li>
          <li>Отменённые: <b>{stats.cancelled}</b></li>
        </ul>

        {/* Прогресс-бар */}
        <div className="h-3 rounded-full bg-gray-800 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${percentages.open}%` }}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500"
            title={`Открытые: ${stats.open}`}
          />
          <div
            style={{ width: `${percentages.in_progress}%` }}
            className="bg-gradient-to-r from-blue-500 to-blue-600"
            title={`В работе: ${stats.in_progress}`}
          />
          <div
            style={{ width: `${percentages.completed}%` }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            title={`Завершённые: ${stats.completed}`}
          />
          <div
            style={{ width: `${percentages.cancelled}%` }}
            className="bg-gradient-to-r from-red-500 to-red-700"
            title={`Отменённые: ${stats.cancelled}`}
          />
        </div>
      </div>

      {/* 🔽 Фильтр */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mr-2">Фильтр:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-black/60 border border-green-500/30 text-white px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-green-400"
        >
          <option value="all">Все</option>
          <option value="open">Открыта</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Выполнена</option>
          <option value="cancelled">Отменена</option>
        </select>
      </div>

      {filteredResponses.length === 0 ? (
        <div className="flex flex-col items-center text-gray-400 py-12">
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56">
            <rect width="56" height="56" rx="28" fill="#111" />
            <path d="M16 28h24" stroke="#555" strokeWidth="2" strokeLinecap="round" />
            <circle cx="28" cy="28" r="27" stroke="#333" strokeWidth="2" />
          </svg>
          <span className="mt-4 text-lg">Нет откликов по выбранному фильтру</span>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredResponses.map((response) => (
            <li
              key={response.id}
              className="bg-black/40 border border-gray-800 rounded-lg p-4 shadow hover:shadow-[0_0_12px_rgba(0,255,150,0.3)] transition"
            >
              <Link
                href={`/tasks/${response.task.id}`}
                className="text-green-400 text-lg font-semibold hover:underline"
              >
                {response.task.title}
              </Link>
              <p className={`text-sm mt-1 ${statusColorMap[response.task.status]}`}>
                Статус: {statusMap[response.task.status] || response.task.status}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Заказчик:{' '}
                <Link
                  href={`/users/${response.task.customer.id}`}
                  className="text-blue-400 hover:underline"
                >
                  {response.task.customer.fullName || response.task.customer.email}
                </Link>
              </p>
              <p className="text-sm text-gray-500">
                Отклик: {new Date(response.createdAt).toLocaleDateString()}
              </p>

              {response.price !== null && (
                <p className="text-sm text-green-400 mt-1">
                  💰 {response.price} ₽
                </p>
              )}

              {response.message && (
                <p className="text-sm text-gray-300 mt-1">
                  💬 {response.message}
                </p>
              )}

              {response.task.status === 'open' && (
                <button
                  onClick={() => handleWithdraw(response.id)}
                  className="mt-3 px-3 py-1 rounded bg-red-600/80 hover:bg-red-700 text-white text-sm transition"
                >
                  Отозвать отклик
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
