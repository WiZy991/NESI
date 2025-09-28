'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

export default function NewPostPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const router = useRouter()
  const { token } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast.error('Напиши что-нибудь')
      return
    }

    if (!token) {
      toast.error('Нет токена авторизации, войди заново')
      return
    }

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
          title: '', // убран
          content,
          imageUrl: fileId ? `/api/files/${fileId}` : null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Тема создана!', { id: toastId })
        router.push('/community')
      } else {
        toast.error(data.error || 'Ошибка при создании поста', { id: toastId })
      }
    } catch (err) {
      console.error('Ошибка при создании поста:', err)
      toast.error('Ошибка сети или сервера', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  // 🔼 Обработчик выбора и загрузки файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/chat-file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setFileId(data.id)
        setFileName(file.name)
        toast.success('Файл загружен')
      } else {
        toast.error(data.error || 'Ошибка загрузки файла')
      }
    } catch (err) {
      console.error('Ошибка загрузки файла:', err)
      toast.error('Ошибка при загрузке файла')
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">Создать тему</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4"
      >
        <textarea
          placeholder="Напишите, о чём хотите поговорить…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <label className="cursor-pointer inline-block text-sm text-emerald-400 hover:underline">
            📎 Прикрепить файл
            <input
              type="file"
              accept="image/*,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileName && (
            <p className="text-xs text-gray-400">
              Загружен файл: <span className="text-white">{fileName}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать тему'}
          </button>
        </div>
      </form>
    </div>
  )
}
