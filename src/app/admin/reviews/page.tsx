'use client'

import { useEffect, useState } from 'react'

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    const fetchReviews = async () => {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' })
      const data = await res.json()
      setReviews(data.reviews || [])
    }
    fetchReviews()
  }, [])

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    location.reload()
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Отзывы</h2>
      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="p-3 border border-gray-700 rounded">
            <p className="text-yellow-400">⭐ {r.rating}</p>
            <p>{r.comment}</p>
            <button
              onClick={() => handleDelete(r.id)}
              className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
