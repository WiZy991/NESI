'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Heart, MessageSquare, Send, Loader2, UserCircle2 } from 'lucide-react'

type Post = {
  id: string
  title: string
  content: string
  createdAt: string
  author: { id: string; fullName: string | null; email: string }
  comments: Comment[]
  _count: { likes: number }
}

type Comment = {
  id: string
  content: string
  createdAt: string
  author: { id: string; fullName: string | null; email: string }
}

export default function CommunityPostPage() {
  const { user, token } = useUser()
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [liked, setLiked] = useState(false)

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/community/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      setPost(data.post)
      setLiked(data.liked || false)
    } catch (err) {
      console.error('Ошибка загрузки поста:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPost()
  }, [id])

  const sendComment = async () => {
    if (!commentText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/community/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText }),
      })
      if (res.ok) {
        setCommentText('')
        fetchPost()
      }
    } catch (err) {
      console.error('Ошибка комментария:', err)
    } finally {
      setSending(false)
    }
  }

  const toggleLike = async () => {
    try {
      const res = await fetch(`/api/community/${id}/like`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        fetchPost()
      }
    } catch (err) {
      console.error('Ошибка лайка:', err)
    }
  }

  if (loading) return <LoadingSpinner />

  if (!post)
    return (
      <p className="text-center text-gray-400 mt-20 text-lg">Пост не найден 😕</p>
    )

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 text-white space-y-10 animate-fade-in">
      {/* 🔹 Пост */}
      <article className="p-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-[#0b0b0b]/80 to-[#002a2a]/90 shadow-[0_0_25px_rgba(0,255,180,0.15)] hover:shadow-[0_0_35px_rgba(0,255,180,0.25)] transition-all">
        <header className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-800 border border-emerald-700/40 flex items-center justify-center overflow-hidden">
            <UserCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-emerald-300 font-semibold">
              {post.author.fullName || post.author.email}
            </h2>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </header>

        {post.title && (
          <h1 className="text-2xl font-bold text-emerald-400 mb-3">{post.title}</h1>
        )}
        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        <footer className="mt-6 flex items-center gap-4 text-sm">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
              liked
                ? 'bg-emerald-600 border-emerald-500 text-black shadow-[0_0_10px_rgba(0,255,180,0.4)]'
                : 'border-emerald-500/40 text-gray-300 hover:bg-emerald-700/20'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${liked ? 'fill-black text-black' : 'text-emerald-400'}`}
            />
            {post._count.likes}
          </button>

          <div className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="w-4 h-4" />
            {post.comments.length}
          </div>
        </footer>
      </article>

      {/* 🔸 Комментарии */}
      <section>
        <h2 className="text-2xl font-semibold text-emerald-400 mb-5 flex items-center gap-2">
          💬 Комментарии
        </h2>

        {post.comments.length === 0 && (
          <p className="text-gray-500 text-center py-8 border border-gray-800 rounded-lg bg-black/30">
            Комментариев пока нет. Будь первым!
          </p>
        )}

        <div className="space-y-4">
          {post.comments.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-gray-800 bg-gradient-to-br from-[#0b0b0b]/60 to-[#001818]/70 hover:border-emerald-600/40 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-emerald-300">
                  {c.author.fullName || c.author.email}
                </p>
                <span className="text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {/* ✏️ Добавление комментария */}
        {user && (
          <div className="mt-8 border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-emerald-300 mb-3">
              Добавить комментарий
            </h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder="Напиши что-нибудь..."
              className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
            <button
              onClick={sendComment}
              disabled={sending}
              className="mt-3 flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Отправка...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Отправить
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
