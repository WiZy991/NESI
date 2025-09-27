'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

type Author = {
  id: string
  fullName: string | null
  email: string
  avatarFileId?: string | null
}

type Comment = {
  id: string
  content: string
  createdAt: string
  author: Author
  parentId?: string | null
  replies?: Comment[]
}

type Post = {
  id: string
  title: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: Author
  _count: { comments: number; likes: number }
  liked?: boolean
}

export default function CommunityPost({ post }: { post: Post }) {
  const { user } = useUser()
  const [liked, setLiked] = useState(post.liked || false)
  const [likesCount, setLikesCount] = useState(post._count.likes)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)

  // 📌 Загружаем комментарии
  useEffect(() => {
    const loadComments = async () => {
      setLoadingComments(true)
      try {
        const res = await fetch(`/api/community/${post.id}/comment`)
        const data = await res.json()
        setComments(data.comments || [])
      } catch (err) {
        console.error('Ошибка загрузки комментариев:', err)
      } finally {
        setLoadingComments(false)
      }
    }
    loadComments()
  }, [post.id])

  // 📌 Лайк поста
  const toggleLike = async () => {
    try {
      const res = await fetch(`/api/community/${post.id}/like`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikesCount(data.likesCount)
      } else {
        alert(data.error || 'Ошибка лайка')
      }
    } catch (err) {
      console.error('Ошибка лайка:', err)
    }
  }

  // 📌 Отправка комментария
  const submitComment = async () => {
    if (!commentInput.trim()) return
    try {
      const res = await fetch(`/api/community/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput, parentId: replyTo }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments((prev) =>
          replyTo
            ? prev.map((c) =>
                c.id === replyTo ? { ...c, replies: [...(c.replies || []), data.comment] } : c
              )
            : [...prev, data.comment]
        )
        setCommentInput('')
        setReplyTo(null)
      } else {
        alert(data.error || 'Ошибка комментария')
      }
    } catch (err) {
      console.error('Ошибка отправки комментария:', err)
    }
  }

  // 📌 Рендер аватарки
  const Avatar = ({ author }: { author: Author }) => (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-sm">
      {author.avatarFileId ? (
        <Image
          src={`/api/files/${author.avatarFileId}`}
          alt={author.fullName || author.email}
          width={32}
          height={32}
        />
      ) : (
        (author.fullName?.[0] || author.email[0]).toUpperCase()
      )}
    </div>
  )

  // 📌 Рекурсивный вывод комментариев
  const renderComments = (list: Comment[], level = 0) =>
    list.map((c) => (
      <div key={c.id} className="mt-3" style={{ marginLeft: level * 24 }}>
        <div className="flex items-start gap-2">
          <Avatar author={c.author} />
          <div className="bg-gray-800 px-3 py-2 rounded-lg w-full">
            <p className="text-sm font-semibold">{c.author.fullName || c.author.email}</p>
            <p className="text-sm">{c.content}</p>
            <button
              onClick={() => setReplyTo(c.id)}
              className="text-xs text-emerald-400 hover:underline mt-1"
            >
              Ответить
            </button>
          </div>
        </div>
        {c.replies && renderComments(c.replies, level + 1)}
      </div>
    ))

  return (
    <div className="p-5 border border-emerald-500/30 rounded-xl bg-black/40 shadow-md space-y-4">
      {/* Автор */}
      <div className="flex items-center gap-3">
        <Avatar author={post.author} />
        <div>
          <p className="font-semibold">{post.author.fullName || post.author.email}</p>
          <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Контент */}
      <h2 className="text-lg font-bold text-emerald-300">{post.title}</h2>
      <p>{post.content}</p>
      {post.imageUrl && (
        <Image
          src={post.imageUrl}
          alt="post image"
          width={600}
          height={400}
          className="rounded-lg mt-2"
        />
      )}

      {/* Действия */}
      <div className="flex items-center gap-6 text-sm">
        <button onClick={toggleLike} className="flex items-center gap-1 hover:text-emerald-400">
          {liked ? '❤️' : '🤍'} {likesCount}
        </button>
        <span>💬 {comments.length}</span>
      </div>

      {/* Комментарии */}
      <div className="mt-3">
        {loadingComments ? (
          <p className="text-gray-500">Загрузка комментариев...</p>
        ) : (
          renderComments(comments)
        )}
      </div>

      {/* Форма коммента */}
      {user && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder={replyTo ? 'Ответить на комментарий...' : 'Написать комментарий...'}
            className="flex-1 px-3 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={submitComment}
            className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            Отправить
          </button>
        </div>
      )}
    </div>
  )
}
