'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function CancelExecutorButton({ taskId }: { taskId: string }) {
  const router = useRouter()
  const { token } = useUser()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    if (!token) {
      setError('Нет авторизации')
      return
    }

    const confirmed = confirm('Отменить исполнителя и вернуть средства?')
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`)

      // ⏬ Обновляем страницу, чтобы убрать исполнителя и обновить статус
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка отмены')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? 'Отмена...' : 'Отменить исполнителя'}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}
