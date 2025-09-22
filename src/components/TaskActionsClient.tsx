'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

type Props = {
  taskId: string
  authorId: string
  status: string
}

export default function TaskActionsClient({ taskId, authorId, status }: Props) {
  const { user, token } = useUser()
  const router = useRouter()

  const handleDelete = async () => {
    const confirmDelete = confirm('Удалить задачу?')
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Задача удалена')
        router.push('/tasks')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Ошибка удаления')
      }
    } catch {
      toast.error('Сетевая ошибка')
    }
  }

  // Только для автора задачи в статусе "open"
  const isCustomer = user?.id === authorId && status === 'open'
  if (!user) return null

  return (
    <div className="flex gap-2 mt-4">
      {isCustomer && (
        <>
          <button
            onClick={() => router.push(`/tasks/${taskId}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Редактировать
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Удалить
          </button>
        </>
      )}
    </div>
  )
}
