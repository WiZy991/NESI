'use client'
import { useState } from 'react'
import { X, Send } from 'lucide-react'

export default function ReportModal({ target, onClose }: { target: { type: 'post' | 'comment', id: string }, onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const sendReport = async () => {
    if (!reason) return alert('Выберите причину')
    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: target.type,
          reason,
          description: text,
          postId: target.type === 'post' ? target.id : null,
          commentId: target.type === 'comment' ? target.id : null,
        }),
      })
      if (res.ok) {
        alert('✅ Жалоба отправлена. Спасибо!')
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Ошибка: ' + (err.error || 'не удалось отправить'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md relative border border-gray-700">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">⚠️ Сообщить о нарушении</h2>

        <div className="space-y-3">
          <label className="block text-sm text-gray-300">Причина жалобы:</label>
          <select
            className="w-full bg-black/40 border border-gray-700 rounded-md p-2 text-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">-- выберите --</option>
            <option value="spam">Спам или реклама</option>
            <option value="insult">Оскорбление / агрессия</option>
            <option value="nsfw">Неприемлемый контент (NSFW, насилие)</option>
            <option value="politics">Политика / дискриминация</option>
            <option value="other">Другое</option>
          </select>

          <textarea
            placeholder="Опишите подробнее (необязательно)"
            className="w-full bg-black/40 border border-gray-700 rounded-md p-2 text-white"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            onClick={sendReport}
            disabled={loading}
            className="mt-3 flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 rounded-md py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Отправка...' : <>
              <Send className="w-4 h-4" /> Отправить жалобу
            </>}
          </button>
        </div>
      </div>
    </div>
  )
}
