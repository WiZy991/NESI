'use client'

import { useState } from 'react'
import Image from 'next/image'

type Author = {
  id: string
  fullName: string
  avatarUrl?: string | null
}

type Comment = {
  id: string
  content: string
  createdAt: string
  author: Author
}

type Post = {
  id: string
  title: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: Author
  _count: { comments: number; likes: number }
}

export default function CommunityPost({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post._count.likes)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/community/${post.id}/like`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikesCount(data.likesCount)
      }
    } catch (err) {
      console.error('Ошибка лайка:', err)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const res = await fetch(`/api/community/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments([...comments, data.comment])
        setNewComment('')
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err)
    }
  }

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const res = await fetch(`/api/community/${post.id}`)
        const data = await res.json()
        if (res.ok) {
          setComments(data.post.comments)
        }
      } catch (err) {
        console.error('Ошибка загрузки комментариев:', err)
      }
    }
    setShowComments(!showComments)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6 shadow-lg">
      {/* Автор */}
      <div className="flex items-center mb-4">
        {post.author.avatarUrl ? (
          <Image
            src={post.author.avatarUrl}
            alt={post.author.fullName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
            {post.author.fullName[0]}
          </div>
        )}
        <div className="ml-3">
          <p className="font-semibold">{post.author.fullName}</p>
          <p className="text-xs text-gray-400">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Контент */}
      <h2 className="text-lg font-bold mb-2">{post.title}</h2>
      <p className="text-gray-200 mb-3">{post.content}</p>

      {post.imageUrl && (
        <div className="mb-3">
          <Image
            src={post.imageUrl}
            alt="post"
            width={600}
            height={400}
            className="rounded-lg"
          />
        </div>
      )}

      {/* Действия */}
      <div className="flex space-x-6 text-gray-400 mb-2">
        <button onClick={handleLike} className="flex items-center space-x-1 hover:text-red-500">
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likesCount}</span>
        </button>
        <button onClick={toggleComments} className="flex items-center space-x-1 hover:text-emerald-400">
          <span>💬</span>
          <span>{comments.length || post._count.comments}</span>
        </button>
      </div>

      {/* Комментарии */}
      {showComments && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start space-x-3">
              {c.author.avatarUrl ? (
                <Image
                  src={c.author.avatarUrl}
                  alt={c.author.fullName}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                  {c.author.fullName[0]}
                </div>
              )}
              <div className="bg-gray-800 px-3 py-2 rounded-lg w-full">
                <p className="font-semibold text-sm">{c.author.fullName}</p>
                <p className="text-gray-200 text-sm">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center space-x-2 mt-2">
            <input
              type="text"
              placeholder="Написать комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddComment}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Отправить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
