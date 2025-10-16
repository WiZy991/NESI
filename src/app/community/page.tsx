'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import CommunityPost from '@/components/CommunityPost'
import { Flame, Clock, MessageSquare, User } from 'lucide-react'

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

  // ✨ Фильтрация (в будущем можно делать через бэкенд)
  const filteredPosts =
    filter === 'my'
      ? posts.filter((p) => p.author.id === user?.id)
      : filter === 'popular'
      ? [...posts].sort(
          (a, b) => b._count.likes + b._count.comments - (a._count.likes + a._count.comments)
        )
      : posts

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 text-white">
      {/* 🔹 Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
          💬 Сообщество
        </h1>
        {user && (
          <Link
            href="/community/new"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            ➕ Создать тему
          </Link>
        )}
      </div>

      {/* 🔸 Фильтры */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { key: 'new', label: 'Новые', icon: <Clock className="w-4 h-4" /> },
          { key: 'popular', label: 'Популярные', icon: <Flame className="w-4 h-4" /> },
          { key: 'my', label: 'Мои темы', icon: <User className="w-4 h-4" /> },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
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

      {/* 🔹 Список постов */}
      {filteredPosts.length === 0 ? (
        <p className="text-gray-400 text-center mt-20">
          {filter === 'my'
            ? 'Ты ещё не создавал темы 😅'
            : 'Постов пока нет. Будь первым, кто создаст тему 🚀'}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-gradient-to-br from-[#0b0b0b]/80 to-[#002a2a]/90 border border-gray-800/60 rounded-2xl p-6 shadow-lg transition-all hover:shadow-[0_0_20px_rgba(0,255,180,0.3)] hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      post.author.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        post.author.fullName || post.author.email
                      )}&background=111111&color=00ffb2`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full border border-emerald-700/50 shadow-[0_0_8px_rgba(0,255,180,0.3)]"
                  />
                  <div>
                    <p className="font-semibold text-emerald-300">
                      {post.author.fullName || post.author.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-200 mb-3 line-clamp-4 whitespace-pre-wrap">{post.content}</p>

              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full rounded-lg border border-gray-800 hover:border-emerald-500/50 transition"
                />
              )}

              <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="hover:text-pink-400 transition">
                    ❤️ {post._count.likes}
                  </span>
                  <span className="hover:text-blue-400 transition">
                    💬 {post._count.comments}
                  </span>
                </div>
                <Link
                  href={`/community/${post.id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition"
                >
                  Подробнее →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
