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
    if (!reason) return alert('Выберите причину жалобы')
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
        alert('Ошибка: ' + (err.error || 'Не удалось отправить'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#001a12]/90 border border-emerald-600/40 shadow-[0_0_25px_rgba(0,255,180,0.25)] rounded-2xl p-6 w-full max-w-md relative animate-fadeIn">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-emerald-400 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-emerald-400 w-5 h-5" />
          <h2 className="text-lg font-semibold text-emerald-400">
            Сообщить о нарушении
          </h2>
        </div>

        {/* Форма */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Причина жалобы
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="appearance-none w-full bg-black/40 border border-emerald-700/40 rounded-md py-2 pl-3 pr-10 text-white focus:border-emerald-500 outline-none transition"
              >
                <option value="">-- выберите причину --</option>
                <option value="spam">Спам или реклама</option>
                <option value="insult">Оскорбления / агрессия</option>
                <option value="nsfw">
                  Неприемлемый контент (NSFW / насилие)
                </option>
                <option value="politics">Политика / дискриминация</option>
                <option value="other">Другое</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-3 text-emerald-400">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Дополнительная информация
            </label>
            <textarea
              placeholder="Опишите подробнее (необязательно)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-emerald-700/40 rounded-md p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          <button
            onClick={sendReport}
            disabled={loading}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-600/90 hover:bg-emerald-700 rounded-md py-2 font-semibold text-white shadow-[0_0_10px_rgba(0,255,180,0.3)] transition disabled:opacity-50"
          >
            {loading ? (
              'Отправка...'
            ) : (
              <>
                <Send className="w-4 h-4" /> Отправить жалобу
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
