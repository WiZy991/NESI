'use client'
import { useState } from 'react'
import { X, Send, ChevronDown, AlertTriangle } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'

export default function ReportModal({
  target,
  onClose,
}: {
  target: { type: 'post' | 'comment'; id: string }
  onClose: () => void
}) {
  const [reason, setReason] = useState<string>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  // Закрытие по Escape
  useEscapeKey(() => {
    if (!loading) {
      onClose()
    }
  })

  const reasons = [
    { value: 'spam', label: 'Спам или реклама' },
    { value: 'insult', label: 'Оскорбления / агрессия' },
    { value: 'nsfw', label: 'Неприемлемый контент (NSFW / насилие)' },
    { value: 'politics', label: 'Политика / дискриминация' },
    { value: 'other', label: 'Другое' },
  ]

  const sendReport = async () => {
    if (!reason) return alert('Выберите причину жалобы')
    setLoading(true)
    try {
      const res = await fetch('/api/community/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          type: target.type,
          reason,
          description: text,
          postId: target.type === 'post' ? target.id : null,
          commentId: target.type === 'comment' ? target.id : null,
        }),
      })

      if (res.ok) {
        alert('✅ Жалоба успешно отправлена!')
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Ошибка: ' + (err.error || 'Не удалось отправить'))
      }
    } catch (e) {
      console.error('Ошибка при отправке жалобы:', e)
      alert('Не удалось отправить жалобу, попробуйте позже.')
    } finally {
      setLoading(false)
    }
  } // ✅ Закрыли sendReport

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#001a12]/90 border border-emerald-600/40 shadow-[0_0_30px_rgba(0,255,180,0.25)] rounded-2xl p-6 w-full max-w-md relative animate-fadeIn">
        {/* Закрытие */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-emerald-400 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="text-emerald-400 w-5 h-5" />
          <h2 className="text-lg font-semibold text-emerald-400">
            Сообщить о нарушении
          </h2>
        </div>

        {/* Причина */}
        <div className="mb-4 relative">
          <label className="block text-sm text-gray-300 mb-1">
            Причина жалобы
          </label>

          <div
            className="bg-black/40 border border-emerald-700/40 rounded-md px-3 py-2 flex justify-between items-center cursor-pointer hover:border-emerald-400 transition"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="text-white text-sm">
              {reason
                ? reasons.find((r) => r.value === reason)?.label
                : '-- выберите причину --'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-emerald-400 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </div>

          {dropdownOpen && (
            <div className="absolute mt-1 w-full bg-[#002218]/95 border border-emerald-700/40 rounded-md shadow-[0_0_20px_rgba(0,255,180,0.15)] z-10 overflow-hidden animate-fadeIn">
              {reasons.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setReason(r.value)
                    setDropdownOpen(false)
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm ${
                    reason === r.value
                      ? 'bg-emerald-600/30 text-emerald-200'
                      : 'text-gray-300 hover:bg-emerald-800/20 hover:text-emerald-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Дополнительная информация
          </label>
          <textarea
            placeholder="Опишите подробнее (необязательно)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full bg-black/40 border border-emerald-700/40 rounded-md p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition resize-none"
          />
        </div>

        {/* Кнопка */}
        <button
          onClick={sendReport}
          disabled={loading}
          className="mt-5 flex items-center justify-center gap-2 w-full bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-md py-2 font-semibold shadow-[0_0_15px_rgba(0,255,180,0.25)] transition disabled:opacity-50"
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
  )
}
