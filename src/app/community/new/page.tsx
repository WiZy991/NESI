'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { ImagePlus, Send, Loader2 } from 'lucide-react'

export default function NewPostPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const router = useRouter()
  const { token } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return toast.error('Напиши что-нибудь!')
    if (!token) return toast.error('Авторизация недействительна')

    setLoading(true)
    const toastId = toast.loading('Создаём тему...')

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          imageUrl: fileId ? `/api/files/${fileId}` : null,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success('Тема создана!', { id: toastId })
        router.push('/community')
      } else toast.error(data.error || 'Ошибка при создании', { id: toastId })
    } catch {
      toast.error('Ошибка сети или сервера', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/chat-file', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setFileId(data.id)
        setFileName(file.name)
        toast.success('Файл загружен')
      } else toast.error(data.error || 'Ошибка загрузки')
    } catch {
      toast.error('Ошибка при загрузке файла')
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 text-white">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
        ✏️ Новая тема
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-br from-[#0b0b0b]/80 to-[#002a2a]/90 border border-gray-800/60 rounded-2xl p-6 shadow-lg space-y-4"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Поделись своими мыслями или задай вопрос сообществу..."
          rows={7}
          className="w-full p-4 rounded-lg bg-black/60 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-emerald-400 cursor-pointer hover:text-emerald-300 transition">
            <ImagePlus className="w-5 h-5" />
            <span>Прикрепить изображение</span>
            <input type="file" accept="image/*,.gif" onChange={handleFileChange} className="hidden" />
          </label>

          {fileName && (
            <p className="text-sm text-gray-400">
              📎 {fileName}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Создание...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" /> Опубликовать
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
