'use client'

import { useEffect, useState } from 'react'

export default function AdminResponses() {
  const [responses, setResponses] = useState<any[]>([])

  useEffect(() => {
    const fetchResponses = async () => {
      const res = await fetch('/api/admin/responses', { cache: 'no-store' })
      const data = await res.json()
      setResponses(data.responses || [])
    }
    fetchResponses()
  }, [])

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/responses/${id}`, { method: 'DELETE' })
    location.reload()
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Отклики</h2>
      <ul className="space-y-2">
        {responses.map((r) => (
          <li key={r.id} className="p-3 border border-gray-700 rounded">
            <p className="text-green-400">{r.price} ₽</p>
            <p>{r.message}</p>
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
