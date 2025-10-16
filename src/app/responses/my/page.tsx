'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart3, Filter, User, ClipboardList, Mail } from 'lucide-react'

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
  completed: 'text-emerald-400',
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
        if (!res.ok) throw new Error('Ошибка загрузки')
        const data = await res.json()
        setResponses(data.responses || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchResponses()
  }, [token])

  const handleWithdraw = async (responseId: string) => {
    if (!confirm('Отозвать отклик?') || !token) return
    try {
      const res = await fetch(`/api/responses/${responseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Не удалось удалить')
      setResponses((prev) => prev.filter((r) => r.id !== responseId))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading)
    return (
      <div className="text-center mt-20 text-gray-400 animate-pulse">
        Загрузка откликов...
      </div>
    )

  const filtered =
    filterStatus === 'all'
      ? responses
      : responses.filter((r) => r.task.status === filterStatus)

  const stats = { open: 0, in_progress: 0, completed: 0, cancelled: 0 }
  responses.forEach((r) => {
    if (stats[r.task.status] !== undefined) stats[r.task.status]++
  })
  const total = responses.length || 1
  const percentages = {
    open: (stats.open / total) * 100,
    in_progress: (stats.in_progress / total) * 100,
    completed: (stats.completed / total) * 100,
    cancelled: (stats.cancelled / total) * 100,
  }

  return (
    <div className="max-w-5xl mx-auto mt-12 p-6 text-white">
      {/* Заголовок */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold text-emerald-400 mb-8 flex items-center gap-2"
      >
        <ClipboardList className="w-7 h-7 text-emerald-400" />
        Мои отклики
      </motion.h1>

      {/* Панель статистики */}
      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(0,255,150,0.15)] p-6 mb-8 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Статистика
          </h2>
          <div className="text-sm text-gray-400">Всего: {responses.length}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-5">
          <div><span className="text-yellow-400">{stats.open}</span><p className="text-xs text-gray-400">Открытых</p></div>
          <div><span className="text-blue-400">{stats.in_progress}</span><p className="text-xs text-gray-400">В работе</p></div>
          <div><span className="text-emerald-400">{stats.completed}</span><p className="text-xs text-gray-400">Выполнено</p></div>
          <div><span className="text-red-400">{stats.cancelled}</span><p className="text-xs text-gray-400">Отменено</p></div>
        </div>

        {/* Прогресс-бар */}
        <div className="h-3 rounded-full bg-gray-900 overflow-hidden flex">
          <div style={{ width: `${percentages.open}%` }} className="bg-yellow-400/70" />
          <div style={{ width: `${percentages.in_progress}%` }} className="bg-blue-500/70" />
          <div style={{ width: `${percentages.completed}%` }} className="bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          <div style={{ width: `${percentages.cancelled}%` }} className="bg-red-600/70" />
        </div>
      </div>

      {/* Фильтр */}
      <div className="mb-8 flex items-center gap-2">
        <Filter className="w-5 h-5 text-emerald-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-black/60 border border-emerald-500/30 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="all">Все</option>
          <option value="open">Открытые</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Выполненные</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Нет откликов по выбранному фильтру</div>
      ) : (
        <motion.ul
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {filtered.map((r) => (
            <motion.li
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
              className="bg-black/40 border border-emerald-500/20 rounded-2xl p-5 hover:shadow-[0_0_25px_rgba(0,255,150,0.15)] transition"
            >
              <Link
                href={`/tasks/${r.task.id}`}
                className="text-lg font-semibold text-emerald-400 hover:underline flex items-center gap-2"
              >
                <Mail className="w-5 h-5" /> {r.task.title}
              </Link>
              <p className={`text-sm mt-1 ${statusColorMap[r.task.status]}`}>
                Статус: {statusMap[r.task.status]}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-500" />
                Заказчик:{' '}
                <Link href={`/users/${r.task.customer.id}`} className="text-blue-400 hover:underline">
                  {r.task.customer.fullName || r.task.customer.email}
                </Link>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Дата отклика: {new Date(r.createdAt).toLocaleDateString()}
              </p>

              {r.price && (
                <p className="text-sm text-emerald-400 mt-1">💰 {r.price} ₽</p>
              )}
              {r.message && (
                <p className="text-sm text-gray-300 mt-2 border-l-2 border-emerald-400/40 pl-3 italic">
                  {r.message}
                </p>
              )}
              {r.task.status === 'open' && (
                <button
                  onClick={() => handleWithdraw(r.id)}
                  className="mt-3 px-3 py-1 rounded bg-red-600/80 hover:bg-red-700 text-white text-sm transition"
                >
                  Отозвать отклик
                </button>
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
