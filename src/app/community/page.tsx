'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Flame,
  User,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Compass,
  Home,
} from 'lucide-react'

// 🔧 Утилита для подстановки правильного пути к аватару
function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return null
  if (!avatar.startsWith('http') && !avatar.startsWith('/'))
    return `/api/files/${avatar}`
  return avatar
}

type Author = {
  id: string
  fullName: string | null
  email: string
  avatarFileId?: string | null
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
  const { user, token } = useUser()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'new' | 'popular' | 'my'>('new')
  const [likeLoading, setLikeLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // 📌 читаем фильтр из URL при монтировании
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('sort') === 'popular') setFilter('popular')
    else if (params.get('filter') === 'my') setFilter('my')
    else setFilter('new')
  }, [])

  // 📌 загрузка постов
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

  // 📌 изменение фильтра с обновлением URL
  const changeFilter = (type: 'new' | 'popular' | 'my') => {
    setFilter(type)
    if (type === 'popular') router.push('/community?sort=popular')
    else if (type === 'my') router.push('/community?filter=my')
    else router.push('/community')
  }

  if (loading) return <LoadingSpinner />

  // 📊 фильтрация постов
  const filtered =
    filter === 'my'
      ? posts.filter((p) => p.author.id === user?.id)
      : filter === 'popular'
      ? [...posts].sort(
          (a, b) =>
            b._count.likes + b._count.comments -
            (a._count.likes + a._count.comments)
        )
      : [...posts].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )

  const topPosts = [...posts]
    .sort(
      (a, b) =>
        b._count.comments + b._count.likes -
        (a._count.comments + a._count.likes)
    )
    .slice(0, 5)

  // ❤️ лайк
  const toggleLike = async (postId: string) => {
    if (!token) return
    setLikeLoading(postId)
    try {
      const res = await fetch(`/api/community/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  liked: data.liked,
                  _count: {
                    ...p._count,
                    likes: data.liked
                      ? p._count.likes + 1
                      : p._count.likes - 1,
                  },
                }
              : p
          )
        )
      }
    } catch (err) {
      console.error('Ошибка лайка:', err)
    } finally {
      setLikeLoading(null)
    }
  }

  // 📋 скопировать ссылку
  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/community/${id}`)
    alert('📋 Ссылка на пост скопирована!')
  }

  const reportPost = (id: string) =>
    alert(`🚨 Жалоба на пост ${id} отправлена модерации`)

  const deletePost = async (id: string) => {
    if (!confirm('Удалить этот пост?')) return
    try {
      const res = await fetch(`/api/community/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
        alert('✅ Пост удалён')
      } else {
        alert('Ошибка удаления поста')
      }
    } catch {
      alert('Ошибка сети при удалении поста')
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-6 py-8">
        {/* ЛЕВАЯ КОЛОНКА */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-gray-800 pr-4">
          <h2 className="text-sm text-gray-400 uppercase mb-4">РАЗДЕЛЫ</h2>
          <nav className="flex flex-col gap-2 text-sm">
            <button
              onClick={() => changeFilter('new')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                filter === 'new'
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Home className="w-4 h-4" /> Новые
            </button>

            <button
              onClick={() => changeFilter('popular')}
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
                onClick={() => changeFilter('my')}
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
            <p>NESI Community © 🌿{new Date().getFullYear()}</p>
          </div>
        </aside>

        {/* ЦЕНТРАЛЬНЫЙ КОНТЕНТ */}
        <main className="flex-1 max-w-2xl">
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-center mt-20">
              Постов пока нет. Будь первым, кто создаст тему 🚀
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className="group border border-gray-800 rounded-lg p-4 hover:border-emerald-500/40 transition-all bg-transparent backdrop-blur-sm relative"
                >
                  {/* Автор и меню */}
                  <div className="flex items-start justify-between text-sm text-gray-400 relative">
                    <Link
                      href={`/users/${post.author.id}`}
                      className="group flex items-center gap-3 hover:bg-emerald-900/10 p-2 rounded-lg border border-transparent hover:border-emerald-500/30 transition"
                    >
                      {post.author.avatarFileId || post.author.avatarUrl ? (
                        <img
                          src={resolveAvatarUrl(
                            post.author.avatarFileId || post.author.avatarUrl
                          )}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover border border-emerald-700/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-700/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition" />
                        </div>
                      )}
                      <div className="flex flex-col leading-tight">
                        <span className="text-emerald-300 font-medium group-hover:text-emerald-400 transition">
                          {post.author.fullName || post.author.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </Link>

                    {/* Меню */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenu(openMenu === post.id ? null : post.id)
                        }
                        className="p-1 hover:text-emerald-400 transition"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openMenu === post.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20">
                          <button
                            onClick={() => {
                              copyLink(post.id)
                              setOpenMenu(null)
                            }}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-800 transition"
                          >
                            📋 Копировать ссылку
                          </button>
                          <button
                            onClick={() => {
                              reportPost(post.id)
                              setOpenMenu(null)
                            }}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-800 text-red-400 transition"
                          >
                            🚨 Пожаловаться
                          </button>
                          {user?.id === post.author.id && (
                            <button
                              onClick={() => {
                                deletePost(post.id)
                                setOpenMenu(null)
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-800 text-pink-500 transition"
                            >
                              🗑 Удалить пост
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Контент поста */}
                  <Link href={`/community/${post.id}`} className="block mt-3">
                    {post.title && (
                      <h2 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                        {post.title}
                      </h2>
                    )}
                    <p className="text-gray-300 mt-1 whitespace-pre-line line-clamp-3">
                      {post.content}
                    </p>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={post.imageUrl}
                          alt=""
                          className="rounded-md border border-gray-800 group-hover:border-emerald-600/40 transition w-full object-cover max-h-[450px]"
                        />
                      </div>
                    )}
                  </Link>

                  {/* Панель действий */}
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleLike(post.id)
                      }}
                      disabled={likeLoading === post.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border border-transparent cursor-pointer transition ${
                        post.liked
                          ? 'text-pink-500 bg-pink-500/10 border-pink-500/40 hover:bg-pink-500/20'
                          : 'hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          post.liked ? 'fill-pink-500 text-pink-500' : ''
                        }`}
                      />
                      {post._count.likes}
                    </button>

                    <Link
                      href={`/community/${post.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 hover:text-blue-400 transition"
                    >
                      <MessageSquare className="w-4 h-4" />{' '}
                      {post._count.comments}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ПРАВАЯ КОЛОНКА */}
        <aside className="hidden lg:flex flex-col w-72 border-l border-gray-800 pl-4">
          <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4" /> Последние посты
          </h2>
          <div className="space-y-3">
            {topPosts.map((p) => (
              <Link
                href={`/community/${p.id}`}
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-emerald-600/10 transition"
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
