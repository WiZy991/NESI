'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

export default function CompleteTaskButton({ taskId, authorId }: {
  taskId: string
  authorId: string
}) {
  const { user, token } = useUser()
  const [loading, setLoading] = useState(false)

  if (!user || user.id !== authorId) return null

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Ошибка завершения задачи')
      } else {
        toast.success('Задача завершена')
        window.location.reload()
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
    >
      {loading ? 'Завершаем...' : 'Завершить задачу'}
    </button>
  )
}
