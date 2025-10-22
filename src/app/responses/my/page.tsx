'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList, BarChart3, Filter, Mail, User } from 'lucide-react'

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
  open: 'border-yellow-400/70 shadow-[0_0_8px_rgba(250,204,21,0.3)]',
  in_progress: 'border-blue-400/70 shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  completed: 'border-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  cancelled: 'border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
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
    <div className="max-w-6xl mx-auto mt-12 p-6 text-white">
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
      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(0,255,150,0.15)] p-6 mb-10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Статистика
          </h2>
          <div className="text-sm text-gray-400">Всего: {responses.length}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-5">
          <div><span className="text-yellow-400 font-semibold">{stats.open}</span><p className="text-xs text-gray-400">Открытые</p></div>
          <div><span className="text-blue-400 font-semibold">{stats.in_progress}</span><p className="text-xs text-gray-400">В работе</p></div>
          <div><span className="text-emerald-400 font-semibold">{stats.completed}</span><p className="text-xs text-gray-400">Выполнено</p></div>
          <div><span className="text-red-400 font-semibold">{stats.cancelled}</span><p className="text-xs text-gray-400">Отменено</p></div>
        </div>

        <div className="h-3 rounded-full bg-gray-900 overflow-hidden flex">
          <div style={{ width: `${percentages.open}%` }} className="bg-yellow-400/70" />
          <div style={{ width: `${percentages.in_progress}%` }} className="bg-blue-500/70" />
          <div style={{ width: `${percentages.completed}%` }} className="bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          <div style={{ width: `${percentages.cancelled}%` }} className="bg-red-600/70" />
        </div>
      </div>

            {/* Фильтр */}
      <div className="mb-8 flex items-center gap-3 relative">
        <Filter className="w-5 h-5 text-emerald-400" />
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between w-48 bg-black/60 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] transition focus:outline-none"
          >
            {filterStatus === 'all'
              ? 'Все'
              : filterStatus === 'open'
              ? 'Открытые'
              : filterStatus === 'in_progress'
              ? 'В работе'
              : filterStatus === 'completed'
              ? 'Выполненные'
              : 'Отменённые'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 ml-2 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 w-48 mt-2 bg-black/80 border border-emerald-500/30 backdrop-blur-md rounded-xl shadow-[0_0_20px_rgba(0,255,150,0.2)] overflow-hidden animate-fadeIn">
              {[
                { value: 'all', label: 'Все' },
                { value: 'open', label: 'Открытые' },
                { value: 'in_progress', label: 'В работе' },
                { value: 'completed', label: 'Выполненные' },
                { value: 'cancelled', label: 'Отменённые' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilterStatus(opt.value)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    filterStatus === opt.value
                      ? 'bg-emerald-600/30 text-emerald-300'
                      : 'text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Список откликов (Grid) */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Нет откликов по выбранному фильтру</div>
      ) : (
        <motion.ul
          className="grid gap-6 md:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {filtered.map((r) => {
            const customer = r.task.customer
            const customerName = customer?.fullName || customer?.email || '—'

            return (
              <motion.li
                key={r.id}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className={`relative bg-black/40 border-l-4 ${statusColorMap[r.task.status]} rounded-xl p-5 hover:shadow-[0_0_18px_rgba(0,255,150,0.2)] transition backdrop-blur-sm`}
              >
                <Link
                  href={`/tasks/${r.task.id}`}
                  className="text-lg font-semibold text-emerald-400 hover:underline flex items-center gap-2"
                >
                  <Mail className="w-5 h-5 text-emerald-400" />
                  {r.task.title}
                </Link>

                <p className={`text-sm mt-1 ${statusColorMap[r.task.status].replace('border-', 'text-')}`}>
                  Статус: {statusMap[r.task.status]}
                </p>

                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-500" />
                  Заказчик:{' '}
                  {customer?.id ? (
                    <Link
                      href={`/users/${customer.id}`}
                      className="text-blue-400 hover:underline hover:text-blue-300 transition"
                    >
                      {customerName}
                    </Link>
                  ) : (
                    <span className="text-blue-300/70">{customerName}</span>
                  )}
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
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
