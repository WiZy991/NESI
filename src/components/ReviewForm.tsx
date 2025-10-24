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
        toast.success('✅ Отзыв отправлен!')
        setSubmitted(true)
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 text-emerald-400 font-semibold bg-black/30 rounded-lg border border-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-center">
        ✅ Отзыв успешно отправлен!
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-black/30 backdrop-blur-md p-5 rounded-xl border border-emerald-700/40 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all">
      <h3 className="text-xl font-semibold text-emerald-300">
        Оставить отзыв
      </h3>

      {/* Звёздочки */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setRating(num)}
            className={`text-2xl transition-transform ${
              num <= rating
                ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)] scale-110'
                : 'text-gray-500 hover:text-yellow-300'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>

      {/* Комментарий */}
      <textarea
        className="w-full p-3 bg-black/40 text-emerald-100 border border-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition shadow-inner placeholder-gray-500"
        placeholder="Оставь отзыв о работе..."
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {/* Кнопка */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
          loading
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]'
        }`}
      >
        {loading ? 'Отправка...' : 'Отправить отзыв'}
      </button>
    </div>
  )
}
