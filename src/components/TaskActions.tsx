'use client'

import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'

type Props = {
  taskId: string
  authorId: string
  status: string
}

export default function TaskActions({ taskId, authorId, status }: Props) {
  const { user } = useUser()
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/tasks/${taskId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('Удалить задачу?')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/tasks')
    } else {
      alert('Ошибка при удалении')
    }
  }

  // Кнопки видит только автор задачи и только если задача открыта
  if (!user || user.id !== authorId || status !== 'open') return null

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={handleEdit}
        className="bg-blue-600 px-4 py-1 rounded text-white hover:bg-blue-700"
      >
        Редактировать
      </button>
      <button
        onClick={handleDelete}
        className="bg-red-600 px-4 py-1 rounded text-white hover:bg-red-700"
      >
        Удалить
      </button>
    </div>
  )
}
