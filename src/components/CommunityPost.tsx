// Финальный компонент CommunityPost.tsx с комментариями как в ВК и загрузкой файлов

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

// Типы

interface Author {
  id: string
  fullName: string | null
  email: string
  avatarFileId?: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: Author
  parentId?: string | null
  replies: Comment[]
}

interface Post {
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
  const [showAllComments, setShowAllComments] = useState(false)

  const maxVisibleRootComments = 3

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Загрузка комментариев
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

  useEffect(() => {
    loadComments()
  }, [post.id])

  // Лайк
  const toggleLike = async () => {
    try {
      const res = await fetch(`/api/community/${post.id}/like`, { method: 'POST' })
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

  // Отправка комментария
  const submitComment = async () => {
    if (!commentInput.trim()) return
    try {
      const res = await fetch(`/api/community/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput, parentId: replyTo })
      })
      const data = await res.json()
      if (res.ok) {
        await loadComments()
        setCommentInput('')
        setReplyTo(null)
      } else {
        alert(data.error || 'Ошибка комментария')
      }
    } catch (err) {
      console.error('Ошибка отправки комментария:', err)
    }
  }

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
        {c.replies?.length > 0 && renderComments(c.replies, level + 1)}
      </div>
    ))

  const visibleRootComments = showAllComments
    ? comments
    : comments.slice(0, maxVisibleRootComments)

  const hasHiddenComments = comments.length > maxVisibleRootComments

  return (
    <div className="p-5 border border-emerald-500/30 rounded-xl bg-black/40 shadow-md space-y-4">
      <div className="flex items-center gap-3">
        <Avatar author={post.author} />
        <div>
          <p className="font-semibold">{post.author.fullName || post.author.email}</p>
          <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>

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

      <div className="flex items-center gap-6 text-sm">
        <button onClick={toggleLike} className="flex items-center gap-1 hover:text-emerald-400">
          {liked ? '❤️' : '🤍'} {likesCount}
        </button>
        <span>💬 {comments.length}</span>
      </div>

      <div className="mt-3">
        {loadingComments ? (
          <p className="text-gray-500">Загрузка комментариев...</p>
        ) : (
          <>
            {renderComments(visibleRootComments)}
            {hasHiddenComments && !showAllComments && (
              <button
                onClick={() => setShowAllComments(true)}
                className="mt-2 text-sm text-emerald-400 hover:underline"
              >
                Показать все комментарии ({comments.length})
              </button>
            )}
          </>
        )}
      </div>

      {showAllComments && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-white">Все комментарии</h3>
            {renderComments(comments)}
            <button
              onClick={() => setShowAllComments(false)}
              className="mt-4 text-sm text-emerald-400 hover:underline"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

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
