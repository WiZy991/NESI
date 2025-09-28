import { useState, useEffect, useRef } from 'react'
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
  replies: Comment[]
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
  const [showAllComments, setShowAllComments] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowAllComments(false)
      }
    }
    if (showAllComments) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAllComments])

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
        setAttachedFile(null)
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

  const renderReplies = (replies: Comment[], level: number) => {
    const first = replies[0] ? [replies[0]] : []
    return first.map((reply) => (
      <div key={reply.id} className="mt-3" style={{ marginLeft: level * 24 }}>
        <div className="flex items-start gap-2">
          <Avatar author={reply.author} />
          <div className="bg-gray-800 px-3 py-2 rounded-lg w-full">
            <p className="text-sm font-semibold">{reply.author.fullName || reply.author.email}</p>
            <p className="text-sm">{reply.content}</p>
            <button
              onClick={() => setReplyTo(reply.id)}
              className="text-xs text-emerald-400 hover:underline mt-1"
            >Ответить</button>
          </div>
        </div>
      </div>
    ))
  }

  const renderComments = (list: Comment[], limit = 3) => {
    const sliced = list.slice(0, limit)
    return sliced.map((c) => (
      <div key={c.id} className="mt-3">
        <div className="flex items-start gap-2">
          <Avatar author={c.author} />
          <div className="bg-gray-800 px-3 py-2 rounded-lg w-full">
            <p className="text-sm font-semibold">{c.author.fullName || c.author.email}</p>
            <p className="text-sm">{c.content}</p>
            <button
              onClick={() => setReplyTo(c.id)}
              className="text-xs text-emerald-400 hover:underline mt-1"
            >Ответить</button>
          </div>
        </div>
        {renderReplies(c.replies || [], 1)}
      </div>
    ))
  }

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
        <Image src={post.imageUrl} alt="post image" width={600} height={400} className="rounded-lg mt-2" />
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
            {renderComments(comments)}
            {comments.length > 3 && (
              <button
                onClick={() => setShowAllComments(true)}
                className="text-sm text-emerald-400 hover:underline mt-2"
              >
                Показать все комментарии ({comments.length})
              </button>
            )}
          </>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-2 mt-3 relative">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder={replyTo ? 'Ответить на комментарий...' : 'Написать комментарий...'}
            className="flex-1 px-3 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />

          {/* Скрепка */}
          <label className="cursor-pointer flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-6 h-6 text-gray-400 hover:text-emerald-400 transition"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79V18a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h5.21" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l3 3-8.5 8.5a2.121 2.121 0 01-3-3L16 5z" />
            </svg>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  console.log('📎 Выбран файл для комментария:', file.name)
                  setAttachedFile(file)
                }
              }}
            />
          </label>

          <button
            onClick={submitComment}
            className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            Отправить
          </button>
        </div>
      )}

      {showAllComments && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div ref={modalRef} className="bg-gray-900 max-h-[80vh] overflow-y-auto w-full max-w-2xl p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Все комментарии</h3>
            {renderComments(comments, comments.length)}
          </div>
        </div>
      )}
    </div>
  )
}
