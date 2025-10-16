'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList } from 'lucide-react'

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

export default function MyTasksPage() {
  const { token, user } = useUser()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !user) return

    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/my-tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Ошибка ${res.status}`)
        }

        const data = await res.json()
        setTasks(data.tasks || [])
      } catch (err: any) {
        console.error('Ошибка при загрузке задач:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [token, user])

  if (loading) return <p className="text-center mt-10 text-gray-400">Загрузка задач...</p>
  if (error)   return <p className="text-center mt-10 text-red-400">Ошибка: {error}</p>

  const stats = { open: 0, in_progress: 0, completed: 0, cancelled: 0 }
  tasks.forEach((t) => { if (stats[t.status] !== undefined) stats[t.status]++ })

  const total = tasks.length || 1
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
        Мои задачи
      </motion.h1>

      {/* Статистика */}
      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(0,255,150,0.15)] p-6 mb-10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-emerald-400">📊 Статистика</h2>
          <div className="text-sm text-gray-400">Всего: {tasks.length}</div>
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

      {/* Список задач (Grid) */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">У вас пока нет задач.</div>
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
          {tasks.map((task) => {
            const customerName =
              task.customer?.fullName || task.customer?.email || '—'
            const customerId = task.customer?.id

            return (
              <motion.li
                key={task.id}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className={`relative bg-black/40 border-l-4 ${statusColorMap[task.status]} rounded-xl p-5 hover:shadow-[0_0_18px_rgba(0,255,150,0.2)] transition backdrop-blur-sm`}
              >
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-emerald-400 mb-1">
                    {task.title}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {statusMap[task.status] || task.status}
                  </p>
                </div>

                <p className="text-sm text-gray-400 mt-1">
                  Заказчик:{' '}
                  {customerId ? (
                    <Link
                      href={`/users/${customerId}`}
                      className="text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      {customerName}
                    </Link>
                  ) : (
                    <span className="text-blue-300/70 cursor-default">{customerName}</span>
                  )}
                </p>

                <p className="text-sm text-gray-300 mt-2 italic">
                  {task.description || 'Без описания'}
                </p>

                <Link
                  href={`/tasks/${task.id}`}
                  className="mt-3 inline-block text-sm text-blue-400 hover:underline hover:text-blue-300 transition"
                >
                  Перейти к задаче →
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
