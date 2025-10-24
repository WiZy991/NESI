'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2, MessageSquare } from 'lucide-react'

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/community/report', { cache: 'no-store' })
        const data = await res.json()
        setReports(data.reports || [])
      } catch (e) {
        console.error('Ошибка загрузки жалоб:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить жалобу?')) return
    await fetch(`/api/community/report/${id}`, { method: 'DELETE' })
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading)
    return <p className="text-gray-400 p-6 text-center">Загрузка жалоб...</p>

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <h1 className="text-3xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
        <AlertTriangle className="text-emerald-400 w-6 h-6" />
        Жалобы пользователей
      </h1>

      {reports.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">Пока жалоб нет 🎉</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="p-4 border border-emerald-700/30 rounded-xl bg-black/50 shadow-[0_0_15px_rgba(0,255,180,0.15)]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-400">
                    <span className="text-emerald-400 font-semibold">
                      {r.reporterId || 'Неизвестно'}
                    </span>{' '}
                    пожаловался на{' '}
                    <span className="text-yellow-400">{r.type}</span>
                  </p>
                  <p className="text-white font-semibold">{r.reason}</p>
                  {r.description && (
                    <p className="text-gray-300 italic text-sm">
                      {r.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-red-500 hover:text-red-400 transition"
                  title="Удалить жалобу"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {r.postId && (
                <p className="text-sm text-emerald-400 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Пост ID: {r.postId}
                </p>
              )}
              {r.commentId && (
                <p className="text-sm text-blue-400 flex items-center gap-1">
                  💬 Комментарий ID: {r.commentId}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
