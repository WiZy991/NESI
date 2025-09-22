'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function MyTasksPage() {
  const { user, token } = useUser()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!token) return

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/my-tasks', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  if (loading) return <div className="p-6">Загрузка задач...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Мои задачи</h1>

      {tasks.length === 0 ? (
        <p className="text-gray-400">Пока нет назначенных задач.</p>
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="border border-gray-700 rounded p-4 hover:bg-gray-900 transition"
            >
              <Link href={`/tasks/${task.id}`} className="block">
                <h2 className="text-lg font-semibold">{task.title}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Заказчик: {task.customer?.fullName || 'Без имени'}
                </p>
                <p className="text-sm text-gray-500">
                  Назначено: {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
