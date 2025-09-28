'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { token } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      toast.error('Заполни заголовок и текст')
      return
    }

    if (!token) {
      toast.error('Нет токена авторизации')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Создаём тему...')

    let uploadedImageUrl: string | null = null

    try {
      // 📤 Загружаем изображение (если есть)
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)

        const uploadRes = await fetch('/api/upload/chat-file', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Ошибка загрузки файла')

        uploadedImageUrl = `/api/files/${uploadData.id}`
      }

      // 📌 Создание поста
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          imageUrl: uploadedImageUrl,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Тема создана!', { id: toastId })
        router.push('/community')
      } else {
        toast.error(data.error || 'Ошибка создания поста', { id: toastId })
      }
    } catch (err) {
      console.error('Ошибка:', err)
      toast.error('Ошибка сети или сервера', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">Создать тему</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4"
      >
        <input
          type="text"
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <textarea
          placeholder="Напишите, о чём хотите поговорить…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />

        <input
          type="file"
          accept="image/png, image/jpeg, image/gif"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="text-sm text-gray-300"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
        >
          {loading ? 'Создание...' : 'Создать тему'}
        </button>
      </form>
    </div>
  )
}
