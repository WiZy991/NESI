'use client'

import { useState } from 'react'

type Author = {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

type Comment = {
  id: string
  content: string
  createdAt: string
  author: Author
  parentId: string | null
  _count: { children: number; likes: number }
  children?: Comment[]
}

type Post = {
  id: string
  title: string
  content: string
  createdAt: string
  author: Author
  liked: boolean
  _count: { comments: number; likes: number }
}

export default function CommunityPost({ post }: { post: Post }) {
  const [likes, setLikes] = useState(post._count.likes)
  const [liked, setLiked] = useState(post.liked)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')

  // 📌 лайк поста
  const toggleLike = async () => {
    try {
      const res = await fetch(`/api/community/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikes(data.likesCount)
      }
    } catch (err) {
      console.error('Ошибка лайка:', err)
    }
  }

  // 📌 отправка комментария
  const handleComment = async () => {
    if (!comment.trim()) return
    setLoading(true)

    try {
      const res = await fetch(`/api/community/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments((prev) => [...prev, data.comment])
        setComment('')
      }
    } catch (err) {
      console.error('Ошибка комментария:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-gray-900 rounded-xl shadow-md border border-gray-800 mb-6">
      {/* Заголовок поста */}
      <div className="flex items-center gap-3">
        {post.author.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt="avatar"
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white">
            {post.author.fullName?.[0] || 'U'}
          </div>
        )}
        <div>
          <p className="font-semibold">{post.author.fullName || post.author.email}</p>
          <span className="text-xs text-gray-400">
            {new Date(post.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Текст поста */}
      <div className="mt-3">
        <h2 className="text-lg font-semibold">{post.title}</h2>
        <p className="text-gray-300 mt-1">{post.content}</p>
      </div>

      {/* Лайки / Комменты */}
      <div className="mt-4 flex gap-6 text-gray-400 text-sm">
        <button onClick={toggleLike} className="flex items-center gap-1 hover:text-emerald-400">
          {liked ? '❤️' : '🤍'} {likes}
        </button>
        <span>💬 {post._count.comments + comments.length}</span>
      </div>

      {/* Список комментариев */}
      <div className="mt-4 space-y-3">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} postId={post.id} />
        ))}
      </div>

      {/* Форма коммента */}
      <div className="mt-3 flex gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Написать комментарий..."
          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white"
        />
        <button
          onClick={handleComment}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm"
        >
          {loading ? '...' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}

function CommentItem({ comment, postId }: { comment: Comment; postId: string }) {
  const [replying, setReplying] = useState(false)
  const [reply, setReply] = useState('')
  const [children, setChildren] = useState<Comment[]>(comment.children || [])

  const sendReply = async () => {
    if (!reply.trim()) return

    try {
      const res = await fetch(`/api/community/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply, parentId: comment.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setChildren((prev) => [...prev, data.comment])
        setReply('')
        setReplying(false)
      }
    } catch (err) {
      console.error('Ошибка ответа:', err)
    }
  }

  return (
    <div className="ml-10">
      <div className="flex items-start gap-2">
        {comment.author.avatarUrl ? (
          <img src={comment.author.avatarUrl} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">
            {comment.author.fullName?.[0] || 'U'}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{comment.author.fullName}</p>
          <p className="text-gray-300 text-sm">{comment.content}</p>
          <button
            onClick={() => setReplying(!replying)}
            className="text-xs text-gray-400 hover:text-emerald-400 mt-1"
          >
            Ответить
          </button>
        </div>
      </div>

      {replying && (
        <div className="mt-2 ml-10 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Ваш ответ..."
            className="flex-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm text-white"
          />
          <button
            onClick={sendReply}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm"
          >
            Отправить
          </button>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 ml-6 space-y-2">
          {children.map((child) => (
            <CommentItem key={child.id} comment={child} postId={postId} />
          ))}
        </div>
      )}
    </div>
  )
}
