'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

// Функция для определения типа медиа по расширению файла
function detectMediaType(imageUrl: string | null, currentType?: string | null): 'image' | 'video' {
  // Сначала проверяем currentType из базы данных (наиболее надежный источник)
  if (currentType === 'video' || currentType === 'image') {
    return currentType
  }
  
  // Если currentType не указан, проверяем расширение в URL (fallback)
  if (imageUrl) {
    const lower = imageUrl.toLowerCase()
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv')) {
      return 'video'
    }
    // Проверяем расширения изображений
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('.svg')) {
      return 'image'
    }
  }
  
  // По умолчанию - изображение
  return 'image'
}

// Функция для получения правильного URL медиа
function getMediaUrl(imageUrl: string | null): string {
  if (!imageUrl) return ''
  // Если уже полный URL (http/https) или начинается с /uploads/, используем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/uploads/')) {
    return imageUrl
  }
  // Если начинается с /, используем как есть
  if (imageUrl.startsWith('/')) {
    return imageUrl
  }
  // Иначе используем через /api/files/
  return `/api/files/${imageUrl}`
}

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
  imageUrl?: string | null
  mediaType?: string | null
  author: Author
  parentId?: string | null
  replies: Comment[]
}

type Post = {
  id: string
  content: string
  imageUrl?: string | null
  mediaType?: string | null
  createdAt: string
  author: Author
  _count: { comments: number; likes: number }
  liked?: boolean
  isPoll?: boolean
  poll?: {
    options: Array<{
      id: string
      text: string
      order: number
      votes: number
    }>
    totalVotes: number
    userVoteOptionId: string | null
  } | null
}

export default function CommunityPost({ post }: { post: Post }) {
  const { user, token } = useUser()
  const [liked, setLiked] = useState(post.liked || false)
  const [likesCount, setLikesCount] = useState(post._count.likes)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pollData, setPollData] = useState<Post['poll']>(post.poll ?? null)
  const [voteLoading, setVoteLoading] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setPollData(post.poll ?? null)
  }, [post.poll])

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

  const handleVote = async (optionId: string) => {
    if (!token) {
      alert('Чтобы проголосовать, войдите в аккаунт.')
      return
    }
    if (voteLoading) return

    setVoteLoading(optionId)
    try {
      const res = await fetch(`/api/community/${post.id}/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionId }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.poll) {
          setPollData(data.poll)
        }
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || 'Не удалось отправить голос')
      }
    } catch (err) {
      console.error('Ошибка голосования:', err)
      alert('Ошибка голосования. Попробуйте позже.')
    } finally {
      setVoteLoading(null)
    }
  }

  const uploadFile = async (): Promise<{ url: string; mediaType: string } | undefined> => {
    if (!file) return undefined
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/chat-file', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data?.id) return undefined
      
      // Определяем тип медиа
      const fileType = file.type
      const isVideo = fileType.startsWith('video/')
      const mediaType = isVideo ? 'video' : 'image'
      
      return {
        url: `/api/files/${data.id}`,
        mediaType
      }
    } catch (err) {
      console.error('Ошибка загрузки файла:', err)
      return undefined
    }
  }

  const submitComment = async () => {
    if (!commentInput.trim() && !file) return

    setUploading(true)
    let imageUrl: string | undefined
    let mediaType: string | undefined
    if (file) {
      const uploadResult = await uploadFile()
      if (uploadResult) {
        imageUrl = uploadResult.url
        mediaType = uploadResult.mediaType
      }
    }

    try {
      const body: any = {
        content: commentInput,
        parentId: replyTo,
      }
      if (imageUrl) {
        body.imageUrl = imageUrl
        body.mediaType = mediaType
      }

      const res = await fetch(`/api/community/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        await loadComments()
        setCommentInput('')
        setReplyTo(null)
        setFile(null)
      } else {
        alert(data.error || 'Ошибка комментария')
      }
    } catch (err) {
      console.error('Ошибка отправки комментария:', err)
    } finally {
      setUploading(false)
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
    return replies.map((reply) => (
      <div key={reply.id} className="mt-3" style={{ marginLeft: level * 24 }}>
        <div className="flex items-start gap-2">
          <Avatar author={reply.author} />
          <div className="bg-gray-800 px-3 py-2 rounded-lg w-full">
            <p className="text-sm font-semibold">{reply.author.fullName || reply.author.email}</p>
            <p className="text-sm">{reply.content}</p>
            {reply.imageUrl && (() => {
              const itemMediaType = detectMediaType(reply.imageUrl, reply.mediaType)
              return itemMediaType === 'video' || (reply.imageUrl && /\.(mp4|webm|mov|avi|mkv)$/i.test(reply.imageUrl)) ? (
                <video
                  src={getMediaUrl(reply.imageUrl)}
                  controls
                  className="w-full max-w-xs max-h-48 rounded mt-2 object-contain"
                  preload="metadata"
                />
              ) : (
                <Image 
                  src={getMediaUrl(reply.imageUrl)} 
                  alt="img" 
                  width={300} 
                  height={200} 
                  className="mt-2 rounded" 
                />
              )
            })()}
            <button
              onClick={() => setReplyTo(reply.id)}
              className="text-xs text-emerald-400 hover:underline mt-1"
            >
              Ответить
            </button>
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
            {c.imageUrl && (() => {
              const itemMediaType = detectMediaType(c.imageUrl, c.mediaType)
              return itemMediaType === 'video' || (c.imageUrl && /\.(mp4|webm|mov|avi|mkv)$/i.test(c.imageUrl)) ? (
                <video
                  src={getMediaUrl(c.imageUrl)}
                  controls
                  className="w-full max-w-xs max-h-48 rounded mt-2 object-contain"
                  preload="metadata"
                />
              ) : (
                <Image 
                  src={getMediaUrl(c.imageUrl)} 
                  alt="img" 
                  width={300} 
                  height={200} 
                  className="mt-2 rounded" 
                />
              )
            })()}
            <button
              onClick={() => setReplyTo(c.id)}
              className="text-xs text-emerald-400 hover:underline mt-1"
            >
              Ответить
            </button>
          </div>
        </div>
        {renderReplies(c.replies || [], 1)}
      </div>
    ))
  }

  const renderPoll = () => {
    if (!post.isPoll || !pollData) return null
    const options = [...(pollData.options || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const totalVotes =
      pollData.totalVotes ?? options.reduce((sum, option) => sum + (option.votes || 0), 0)

    return (
      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-300">Опрос</h3>
          <span className="text-xs text-gray-400">
            {totalVotes > 0 ? `Всего голосов: ${totalVotes}` : 'Голосов пока нет'}
          </span>
        </div>
        <div className="space-y-2">
          {options.map(option => {
            const votes = option.votes || 0
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
            const isSelected = pollData.userVoteOptionId === option.id
            const isDisabled = !token || (voteLoading && voteLoading !== option.id)

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleVote(option.id)}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                    : 'border-gray-700 hover:border-emerald-500/40 hover:bg-gray-800/40 text-gray-200'
                } ${!token ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{option.text}</span>
                  <span className="text-xs text-gray-400">
                    {voteLoading === option.id ? '…' : `${percentage}% • ${votes}`}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isSelected ? 'bg-emerald-400' : 'bg-emerald-600/50'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">
          {token
            ? pollData.userVoteOptionId
              ? 'Вы можете изменить свой выбор, проголосовав за другой вариант.'
              : 'Выберите вариант, чтобы проголосовать.'
            : 'Авторизуйтесь, чтобы принять участие в голосовании.'}
        </p>
      </div>
    )
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

      <p>{post.content}</p>
      {renderPoll()}
      {post.imageUrl && (() => {
        const itemMediaType = detectMediaType(post.imageUrl, post.mediaType)
        return itemMediaType === 'video' || (post.imageUrl && /\.(mp4|webm|mov|avi|mkv)$/i.test(post.imageUrl)) ? (
          <video
            src={getMediaUrl(post.imageUrl)}
            controls
            className="w-full max-h-96 rounded-lg mt-2 object-contain"
            preload="metadata"
            onError={(e) => {
              const video = e.target as HTMLVideoElement
              video.style.display = 'none'
            }}
          />
        ) : (
          <Image 
            src={getMediaUrl(post.imageUrl)} 
            alt="post image" 
            width={600} 
            height={400} 
            className="rounded-lg mt-2" 
            onError={(e) => {
              const img = e.target as HTMLImageElement
              img.style.display = 'none'
            }}
          />
        )
      })()}

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
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={replyTo ? 'Ответить на комментарий...' : 'Написать комментарий...'}
              className="flex-1 px-3 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />

            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0])
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-emerald-400 hover:text-emerald-500"
              title="Прикрепить файл"
            >
              📎
            </button>

            <button
              onClick={submitComment}
              disabled={uploading}
              className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              {uploading ? '...' : 'Отправить'}
            </button>
          </div>

          {file && (
            <div className="text-sm text-gray-400">
              📎 {file.name}
              <button
                onClick={() => setFile(null)}
                className="ml-2 text-red-400 hover:underline"
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      )}

      {showAllComments && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" data-nextjs-scroll-focus-boundary={false}>
          <div ref={modalRef} className="bg-gray-900 max-h-[80vh] overflow-y-auto w-full max-w-2xl p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Все комментарии</h3>
            {renderComments(comments, comments.length)}
          </div>
        </div>
      )}
    </div>
  )
}
