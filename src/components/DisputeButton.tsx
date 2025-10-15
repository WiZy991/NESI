'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

export default function DisputeButton({ taskId }: { taskId: string }) {
  const { token } = useUser()
  const [hasDispute, setHasDispute] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  // Проверка наличия спора
  useEffect(() => {
    if (!token) return
    const checkDispute = async () => {
      try {
        const res = await fetch(`/api/disputes/by-task/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        setHasDispute(Boolean(data.exists))
      } catch (err) {
        console.error('Ошибка проверки спора:', err)
      }
    }
    checkDispute()
  }, [token, taskId])

  // Отправка спора
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !reason) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, reason, details }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Ошибка создания спора')

      setHasDispute(true)
      setMessage('✅ Спор успешно создан!')
      setShowForm(false)
      setReason('')
      setDetails('')
    } catch (err: any) {
      setMessage(`❌ ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (hasDispute) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 mt-4">
        ⚠️ По этой задаче уже есть открытый спор.
      </div>
    )
  }

  return (
    <div className="mt-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-red-500/30"
        >
          ⚖️ Открыть спор
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-black/40 border border-emerald-500/30 rounded-xl p-4 mt-4 space-y-3"
        >
          <h3 className="text-lg font-semibold text-emerald-300 mb-2">
            Создание спора
          </h3>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Причина</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-gray-200"
              placeholder="Коротко опишите причину"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Подробности</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-gray-200"
              placeholder="Опишите ситуацию подробнее..."
            />
          </div>

          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
            >
              {loading ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
