'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/admin/reports', { cache: 'no-store' })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Ошибка')
        setReports(data.reports || [])
      } catch (err: any) {
        console.error('Ошибка загрузки жалоб:', err)
        setError('Ошибка загрузки жалоб')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  if (loading)
    return (
      <p className="text-gray-400 animate-pulse p-6">Загрузка жалоб...</p>
    )

  if (error)
    return <p className="text-red-500 p-6">{error}</p>

  if (!reports.length)
    return (
      <div className="p-6 text-gray-400">
        Жалоб пока нет — значит всё спокойно 😎
      </div>
    )

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
        <AlertTriangle className="w-6 h-6 text-emerald-400" /> Жалобы пользователей
      </h2>

      <div className="space-y-4">
        {reports.map((r) => (
          <Card
            key={r.id}
            className="bg-black/60 border border-emerald-600/30 shadow-[0_0_12px_rgba(0,255,180,0.25)] hover:border-emerald-400/40 transition"
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-emerald-300 font-semibold">
                  {r.type === 'post' ? '📄 Пост' : '💬 Комментарий'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>

              <p className="text-gray-200 mb-1">
                <b>Причина:</b> {r.reason}
              </p>

              {r.description && (
                <p className="text-gray-400 text-sm mb-2">
                  <b>Описание:</b> {r.description}
                </p>
              )}

              {/* 💬 Переход на объект жалобы */}
              {r.post && (
                <a
                  href={`/community/${r.post.id}`}
                  className="text-sm text-emerald-400 hover:text-emerald-300 underline block mb-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Перейти к посту →
                </a>
              )}
              {r.comment && (
                <a
                  href={`/community/comment/${r.comment.id}`}
                  className="text-sm text-emerald-400 hover:text-emerald-300 underline block mb-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Перейти к комментарию →
                </a>
              )}

              <p className="text-sm text-emerald-400 mt-2">
                От: {r.reporter?.fullName || 'Неизвестный пользователь'} ({r.reporter?.email})
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
