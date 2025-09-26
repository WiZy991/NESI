'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (res.ok) {
        const post = await res.json()
        router.push(`/community/${post.id}`)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Ошибка при создании поста')
      }
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
