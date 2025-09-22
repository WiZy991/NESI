'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'

export default function MessageInput({
  taskId,
  onSend,
}: {
  taskId: string
  onSend: (message: any) => void
}) {
  const { token } = useUser()
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!content.trim() && !file) || !token) return

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('content', content)
      if (file) formData.append('file', file)

      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        onSend(data.message)
        setContent('')
        setFile(null)
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border border-emerald-500/40 rounded-xl bg-black/40 p-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
    >
      {/* Поле ввода */}
      <input
        className="flex-1 px-3 py-2 bg-transparent text-white placeholder-gray-500 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
        placeholder="Введите сообщение..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* Кастомный выбор файла */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="file-upload"
          className="cursor-pointer px-3 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        >
          📎 Прикрепить файл
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0])
            }
          }}
          accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg"
          className="hidden"
        />
        {file && (
          <p className="text-xs text-emerald-400 truncate max-w-[200px]">
            {file.name}
          </p>
        )}
      </div>

      {/* Кнопка отправки */}
      <button
        type="submit"
        disabled={loading}
        className="self-end px-6 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.3)] text-sm font-medium"
      >
        {loading ? '...' : 'Отправить'}
      </button>
    </form>
  )
}
