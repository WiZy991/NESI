'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MessageSquare, Heart, Flame, Clock, User } from 'lucide-react'

type Author = {
  id: string
  fullName: string | null
  email: string
  avatarUrl?: string | null
}

type Post = {
  id: string
  title: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: Author
  liked?: boolean
  _count: { comments: number; likes: number }
}

export default function CommunityPage() {
  const { user } = useUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'new' | 'popular' | 'my'>('new')

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

  // фильтрация и сортировка
  const filteredPosts =
    filter === 'my'
      ? posts.filter((p) => p.author.id === user?.id)
      : filter === 'popular'
      ? [...posts].sort(
          (a, b) => b._count.likes + b._count.comments - (a._count.likes + a._count.comments)
        )
      : [...posts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 text-white">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-400 flex items-center gap-2 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
          💬 Сообщество
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

      {/* Фильтры */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'new', label: 'Новые', icon: <Clock className="w-4 h-4" /> },
          { key: 'popular', label: 'Популярные', icon: <Flame className="w-4 h-4" /> },
          { key: 'my', label: 'Мои темы', icon: <User className="w-4 h-4" /> },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              filter === f.key
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(0,255,180,0.3)]'
                : 'border-gray-700 text-gray-400 hover:text-emerald-300 hover:border-emerald-500/50'
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Лента постов (как Reddit) */}
      {filteredPosts.length === 0 ? (
        <p className="text-gray-400 text-center mt-20">
          Постов пока нет. Будь первым, кто создаст тему 🚀
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col sm:flex-row sm:items-start gap-4 bg-[#0f0f0f]/80 border border-gray-800 rounded-xl p-5 hover:border-emerald-600/40 transition-all"
            >
              {/* Блок лайков / Reddit-style vote bar */}
              <div className="flex sm:flex-col items-center sm:items-center justify-center sm:justify-start gap-2 text-gray-400">
                <button
                  className="hover:text-pink-400 transition flex items-center gap-1"
                  title="Лайки"
                >
                  <Heart className="w-4 h-4" /> {post._count.likes}
                </button>
                <button
                  className="hover:text-blue-400 transition flex items-center gap-1"
                  title="Комментарии"
                >
                  <MessageSquare className="w-4 h-4" /> {post._count.comments}
                </button>
              </div>

              {/* Контент поста */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="font-medium text-emerald-300">
                    {post.author.fullName || post.author.email}
                  </span>
                  •
                  <span>
                    {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                {post.title && (
                  <Link
                    href={`/community/${post.id}`}
                    className="block text-lg font-semibold text-emerald-200 hover:text-emerald-400"
                  >
                    {post.title}
                  </Link>
                )}

                <p className="text-gray-300 line-clamp-3">{post.content}</p>

                {post.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="rounded-md border border-gray-800 hover:border-emerald-600/40 transition w-full max-h-[400px] object-cover"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                  <Link
                    href={`/community/${post.id}`}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition"
                  >
                    Читать →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
