'use client'
import { useState } from 'react'
import { X, Send, AlertTriangle } from 'lucide-react'

export default function ReportModal({
  target,
  onClose,
}: {
  target: { type: 'post' | 'comment'; id: string }
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const sendReport = async () => {
    if (!reason) {
      alert('⚠️ Выберите причину жалобы')
      return
    }
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
        alert('✅ Жалоба отправлена! Спасибо за вашу помощь 🌿')
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Ошибка: ' + (err.error || 'не удалось отправить жалобу'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-[#001a12]/90 to-[#002a22]/90 shadow-[0_0_25px_rgba(0,255,180,0.1)] p-6 text-white">
        {/* Закрыть */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-emerald-300 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold text-emerald-400">
            Сообщить о нарушении
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Причина жалобы
            </label>
            <select
              className="w-full bg-black/40 border border-emerald-700/40 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">-- выберите причину --</option>
              <option value="spam">Спам или реклама</option>
              <option value="insult">Оскорбления / агрессия</option>
              <option value="nsfw">Неприемлемый контент (NSFW / насилие)</option>
              <option value="politics">Политика / дискриминация</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Дополнительное описание
            </label>
            <textarea
              placeholder="Опишите подробнее (необязательно)"
              className="w-full bg-black/40 border border-emerald-700/40 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition resize-none"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <button
            onClick={sendReport}
            disabled={loading}
            className={`mt-2 flex items-center justify-center gap-2 w-full rounded-lg py-2.5 font-semibold transition ${
              loading
                ? 'bg-emerald-600/40 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_20px_rgba(0,255,180,0.2)]'
            }`}
          >
            {loading ? (
              'Отправка...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Отправить жалобу
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
