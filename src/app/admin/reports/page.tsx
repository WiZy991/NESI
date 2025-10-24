'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Trash2, ExternalLink } from 'lucide-react'

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 🔹 Загружаем жалобы 
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

  useEffect(() => {
    fetchReports()
  }, [])

  // 🔹 Удаление поста или комментария
  const handleDelete = async (report: any) => {
    if (!confirm(`Удалить ${report.type === 'post' ? 'пост' : 'комментарий'}?`))
      return

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: report.type,
          id:
            report.type === 'post'
              ? report.post?.id
              : report.comment?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка удаления')

      alert(data.message || 'Удалено')
      await fetchReports()
    } catch (err: any) {
      alert('Ошибка при удалении: ' + err.message)
    }
  }

  if (loading)
    return <p className="text-gray-400 animate-pulse p-6">Загрузка жалоб...</p>

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
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-emerald-300 font-semibold">
                  {r.type === 'post' ? '📄 Пост' : '💬 Комментарий'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>

              <p className="text-gray-200">
                <b>Причина:</b> {r.reason}
              </p>

              {r.description && (
                <p className="text-gray-400 text-sm">
                  <b>Описание:</b> {r.description}
                </p>
              )}

              {/* 🔗 Переход на объект жалобы */}
              {r.targetLink && (
                <a
                  href={r.targetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  <ExternalLink className="w-4 h-4" /> Перейти →
                </a>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-800 mt-2">
                <p className="text-sm text-gray-400">
                  От: {r.reporter?.fullName || 'Неизвестный пользователь'} (
                  {r.reporter?.email})
                </p>

                {/* 🗑 Кнопка удаления */}
                <button
                  onClick={() => handleDelete(r)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
