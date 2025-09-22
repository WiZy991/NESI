'use client'

import { useUser } from '@/context/UserContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
  taskId: string
  authorId: string
  status: string
}

export default function TaskRespondButton({ taskId, authorId, status }: Props) {
  const { user, token } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [responded, setResponded] = useState(false) // для локального состояния

  // Кнопка видна только для исполнителя, не автора, только на открытой задаче
  if (!user || user.role !== 'executor' || user.id === authorId || status !== 'open') return null

  const handleRespond = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Отклик отправлен!')
        setResponded(true) // показываем, что уже откликнулись
        // router.refresh() // можно обновить, если выводим список откликов
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  if (responded) {
    return <span className="text-green-400 font-semibold">Отклик отправлен</span>
  }

  return (
    <button
      onClick={handleRespond}
      disabled={loading}
      className={`bg-green-600 px-4 py-1 rounded text-white hover:bg-green-700 ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? 'Отклик...' : 'Откликнуться'}
    </button>
  )
}
