'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Flame,
  Clock,
  User,
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Plus,
  Compass,
  Home,
} from 'lucide-react'

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

  // 🔄 сортировка / фильтры
  const filtered =
    filter === 'my'
      ? posts.filter((p) => p.author.id === user?.id)
      : filter === 'popular'
      ? [...posts].sort(
          (a, b) =>
            b._count.likes + b._count.comments - (a._count.likes + a._count.comments)
        )
      : [...posts].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

  const topPosts = [...posts]
    .sort(
      (a, b) => b._count.comments + b._count.likes - (a._count.comments + a._count.likes)
    )
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-6 py-8">
        {/* ───── ЛЕВАЯ КОЛОНКА (НАВИГАЦИЯ) ───── */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-gray-800 pr-4">
          <h2 className="text-sm text-gray-400 uppercase mb-4">Разделы</h2>
          <nav className="flex flex-col gap-2 text-sm">
            <button
              onClick={() => setFilter('new')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                filter === 'new'
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Home className="w-4 h-4" /> Новые
            </button>
            <button
              onClick={() => setFilter('popular')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                filter === 'popular'
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Flame className="w-4 h-4" /> Популярные
            </button>
            {user && (
              <button
                onClick={() => setFilter('my')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                  filter === 'my'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <User className="w-4 h-4" /> Мои темы
              </button>
            )}
            <Link
              href="/community/new"
              className="flex items-center gap-2 px-3 py-2 mt-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-center justify-center font-medium transition"
            >
              <Plus className="w-4 h-4" /> Создать тему
            </Link>
          </nav>

          <div className="mt-10 border-t border-gray-800 pt-4 text-xs text-gray-500 space-y-1">
            <p>NESI Community © {new Date().getFullYear()}</p>
            <p className="text-gray-600">Вдохновлено Reddit 🌿</p>
          </div>
        </aside>

        {/* ───── ЦЕНТРАЛЬНАЯ КОЛОНКА (ЛЕНТА ПОСТОВ) ───── */}
        <main className="flex-1 max-w-2xl">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center mt-20">
              Постов пока нет. Будь первым, кто создаст тему 🚀
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((post) => (
                <article
                  key={post.id}
                  className="bg-[#111]/80 border border-gray-800 rounded-lg p-4 hover:border-emerald-600/40 transition-all"
                >
                  {/* верхняя строка */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-emerald-300">
                        {post.author.fullName || post.author.email}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </div>

                  {/* контент */}
                  <div className="mt-2">
                    {post.title && (
                      <Link
                        href={`/community/${post.id}`}
                        className="block text-lg font-semibold text-white hover:text-emerald-400 transition"
                      >
                        {post.title}
                      </Link>
                    )}
                    <p className="text-gray-300 mt-1 line-clamp-3">{post.content}</p>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={post.imageUrl}
                          alt=""
                          className="rounded-md border border-gray-800 hover:border-emerald-600/40 transition w-full object-cover max-h-[450px]"
                        />
                      </div>
                    )}
                  </div>

                  {/* кнопки действий */}
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                    <button className="flex items-center gap-1 hover:text-pink-400 transition">
                      <Heart className="w-4 h-4" /> {post._count.likes}
                    </button>
                    <Link
                      href={`/community/${post.id}`}
                      className="flex items-center gap-1 hover:text-blue-400 transition"
                    >
                      <MessageSquare className="w-4 h-4" /> {post._count.comments}
                    </Link>
                    <button className="flex items-center gap-1 hover:text-emerald-400 transition">
                      <Share2 className="w-4 h-4" /> Поделиться
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {/* ───── ПРАВАЯ КОЛОНКА (ТОП ПОСТОВ) ───── */}
        <aside className="hidden lg:flex flex-col w-72 border-l border-gray-800 pl-4">
          <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4" /> Последние посты
          </h2>

          <div className="space-y-3">
            {topPosts.map((p) => (
              <Link
                href={`/community/${p.id}`}
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-900/60 transition"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="w-14 h-14 object-cover rounded-md border border-gray-800"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                    нет фото
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200 line-clamp-2">
                    {p.title || p.content.slice(0, 60)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ❤️ {p._count.likes} • 💬 {p._count.comments}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
