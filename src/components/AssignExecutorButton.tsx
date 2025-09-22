'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'

type Props = {
  taskId: string
  executorId: string
}

export default function AssignExecutorButton({ taskId, executorId }: Props) {
  const { token } = useUser()
  const [loading, setLoading] = useState(false)

  const handleAssign = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ executorId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Ошибка назначения')
      } else {
        toast.success('Исполнитель назначен')
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
      onClick={handleAssign}
      disabled={loading}
      className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
    >
      {loading ? 'Назначение...' : 'Назначить'}
    </button>
  )
}

