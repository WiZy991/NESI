'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Onboarding from '@/components/Onboarding'  // ← добавил импорт

// Цвета для статусов
const statusColors: Record<string, string> = {
  open: 'bg-emerald-900/40 border border-emerald-500/50 text-emerald-300',
  in_progress: 'bg-yellow-900/40 border border-yellow-500/50 text-yellow-300',
  completed: 'bg-blue-900/40 border border-blue-500/50 text-blue-300',
  cancelled: 'bg-red-900/40 border border-red-500/50 text-red-300',
}

// Названия статусов
function getStatusName(status: string) {
  switch (status) {
    case 'open':
      return 'Открыта'
    case 'in_progress':
      return 'В работе'
    case 'completed':
      return 'Выполнена'
    case 'cancelled':
      return 'Отменена'
    default:
      return status
  }
}

export default function MyTasksPage() {
  const { token, user } = useUser()  // добавлено user, чтобы передавать роль
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!token) return

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks?mine=true', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          toast.error('Ошибка загрузки задач')
          router.push('/tasks')
          return
        }

        const data = await res.json()
        setTasks(data.tasks || [])
      } catch (err) {
        toast.error('Ошибка сети')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [token, router])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <h1 className="text-4xl font-bold text-emerald-400">Мои задачи</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 border border-emerald-500/30 rounded-xl bg-black/40 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-3"
            >
              <div className="h-5 bg-emerald-900/40 rounded w-1/2"></div>
              <div className="h-4 bg-emerald-900/30 rounded w-3/4"></div>
              <div className="h-3 bg-emerald-900/20 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {user && <Onboarding role={user.role} />}  {/* ← добавил запуск Onboarding */}

      <h1 className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
        Мои задачи
      </h1>

      {tasks.length === 0 ? (
        <p className="text-gray-400">У вас пока нет созданных задач.</p>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-6 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition space-y-2"
            >
              <Link href={`/tasks/${task.id}`}>
                <h2 className="text-xl font-semibold text-emerald-300 hover:underline cursor-pointer">
                  {task.title}
                </h2>
              </Link>

              {task.price && (
                <p className="text-emerald-400 font-medium">💰 {task.price} ₽</p>
              )}

              <span
                className={`inline-block mt-1 px-3 py-1 text-sm rounded-full shadow ${
                  statusColors[task.status] || ''
                }`}
              >
                Статус: {getStatusName(task.status)}
              </span>

              <p className="text-sm text-gray-400">
                Создано: {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
