'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'

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

  if (!post) return <p className="text-center text-gray-400">Пост не найден</p>

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 text-white space-y-8">
      {/* Пост */}
      <div className="p-6 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
        <h1 className="text-2xl font-bold text-emerald-300">{post.title}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Автор: {post.author.fullName || post.author.email} •{' '}
          {new Date(post.createdAt).toLocaleString()}
        </p>
        <p className="mt-4 text-gray-200 whitespace-pre-wrap">{post.content}</p>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <button
            onClick={toggleLike}
            className={`px-3 py-1 rounded-lg border ${
              liked
                ? 'bg-emerald-600 border-emerald-500 text-black'
                : 'border-emerald-400 hover:bg-emerald-700/30'
            }`}
          >
            ❤️ {post._count.likes}
          </button>
        </div>
      </div>

      {/* Комментарии */}
      <div>
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">Комментарии</h2>

        {post.comments.length === 0 && (
          <p className="text-gray-400">Комментариев пока нет. Будь первым!</p>
        )}

        <div className="space-y-3">
          {post.comments.map((c) => (
            <div
              key={c.id}
              className="p-3 border border-gray-800 bg-black/50 rounded-lg"
            >
              <p className="text-sm text-gray-400 mb-1">
                {c.author.fullName || c.author.email} •{' '}
                {new Date(c.createdAt).toLocaleString()}
              </p>
              <p className="text-gray-200 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {/* Форма добавления комментария */}
        {user && (
          <div className="mt-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder="Напиши комментарий…"
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
            <button
              onClick={sendComment}
              disabled={sending}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold disabled:opacity-50"
            >
              Отправить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
