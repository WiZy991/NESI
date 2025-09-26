'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'

type Post = {
  id: string
  title: string
  content: string
  createdAt: string
  author: { id: string; fullName: string | null; email: string }
  _count: { comments: number; likes: number }
}

export default function CommunityPage() {
  const { user } = useUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/community', { cache: 'no-store' })
        const data = await res.json()
        setPosts(data.posts || [])
      } catch (err) {
        console.error('Ошибка загрузки постов:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 text-white space-y-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
          Сообщество
        </h1>
        {user && (
          <Link
            href="/community/new"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition"
          >
            ➕ Создать тему
          </Link>
        )}
      </div>

      {/* Список постов */}
      <div className="space-y-5">
        {posts.length === 0 && (
          <p className="text-gray-400">Постов пока нет. Будь первым, кто создаст тему 🚀</p>
        )}

        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/community/${p.id}`}
            className="block p-5 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:bg-black/60 transition"
          >
            <h2 className="text-xl font-semibold text-emerald-300">{p.title}</h2>

            <p className="text-sm text-gray-400 mt-1">
              Автор: {p.author.fullName || p.author.email} •{' '}
              {new Date(p.createdAt).toLocaleString()}
            </p>

            <p className="mt-3 text-gray-200 line-clamp-2">{p.content}</p>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <span>💬 {p._count.comments}</span>
              <span>❤️ {p._count.likes}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
