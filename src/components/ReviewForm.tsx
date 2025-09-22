'use client'
import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

export default function ReviewForm({ taskId }: { taskId: string }) {
  const { token } = useUser()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Укажи оценку от 1 до 5')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Ошибка при отправке отзыва')
      } else {
        toast.success('Отзыв отправлен!')
        setSubmitted(true)
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return <div className="text-green-500 font-semibold">Отзыв отправлен!</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Оставить отзыв</h3>
      <div>
        <label className="block text-sm mb-1">Оценка (1–5):</label>
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-20 p-2 bg-black text-white border"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Комментарий:</label>
        <textarea
          className="w-full h-24 bg-black text-white border p-2"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Отправка...' : 'Отправить отзыв'}
      </button>
    </div>
  )
}
