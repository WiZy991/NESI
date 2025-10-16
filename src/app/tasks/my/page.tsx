'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'

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

  if (loading) {
    return <p className="text-center mt-10 text-gray-400">Загрузка задач...</p>
  }

  if (error) {
    return (
      <p className="text-center mt-10 text-red-400">
        Ошибка: {error}
      </p>
    )
  }

  const stats = {
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  }

  tasks.forEach((t) => {
    if (stats[t.status] !== undefined) stats[t.status]++
  })

  const total = tasks.length || 1
  const percentages = {
    open: (stats.open / total) * 100,
    in_progress: (stats.in_progress / total) * 100,
    completed: (stats.completed / total) * 100,
    cancelled: (stats.cancelled / total) * 100,
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-400">📋 Мои задачи</h1>

      {/* 📊 Статистика */}
      <div className="mb-6 bg-black/40 border border-green-500/30 rounded-lg p-4 shadow-[0_0_10px_rgba(0,255,150,0.2)] text-sm text-gray-300">
        <p className="mb-2 font-semibold text-green-400">📌 Статистика:</p>
        <ul className="space-y-1 mb-3">
          <li>Открытые: <b>{stats.open}</b></li>
          <li>В работе: <b>{stats.in_progress}</b></li>
          <li>Выполненные: <b>{stats.completed}</b></li>
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
            title={`Выполненные: ${stats.completed}`}
          />
          <div
            style={{ width: `${percentages.cancelled}%` }}
            className="bg-gradient-to-r from-red-500 to-red-700"
            title={`Отменённые: ${stats.cancelled}`}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-400">У вас пока нет назначенных задач.</p>
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="bg-black/40 border border-gray-800 rounded-lg p-4 shadow hover:shadow-[0_0_12px_rgba(0,255,150,0.3)] transition"
            >
              <h2 className="text-lg font-semibold text-green-400 mb-1">
                {task.title}
              </h2>
              <p className={`text-sm mb-1 ${statusColorMap[task.status]}`}>
                Статус: {statusMap[task.status] || task.status}
              </p>
              <p className="text-sm text-gray-400 mb-1">
                Заказчик: {task.customer?.fullName || task.customer?.email || '—'}
              </p>
              <p className="text-sm text-gray-300 mb-2">{task.description}</p>
              <Link
                href={`/tasks/${task.id}`}
                className="text-blue-400 hover:underline text-sm"
              >
                Перейти к задаче →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
