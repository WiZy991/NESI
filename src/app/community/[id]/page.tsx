'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Heart, MessageSquare, Send, Loader2, UserCircle2, Reply } from 'lucide-react'

type Post = {
  id: string
  title: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: { id: string; fullName: string | null; email: string }
  comments: Comment[]
  _count: { likes: number }
}

type Comment = {
  id: string
  content: string
  createdAt: string
  parentId?: string | null
  author: { id: string; fullName: string | null; email: string }
}

/** Строим древовидные комментарии по parentId */
function buildTree(comments: Comment[]) {
  const byId = new Map<string, Comment & { children: Comment[] }>()
  const roots: (Comment & { children: Comment[] })[] = []

  comments.forEach((c) => byId.set(c.id, { ...c, children: [] }))
  comments.forEach((c) => {
    const node = byId.get(c.id)!
    if (c.parentId && byId.get(c.parentId)) {
      byId.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default function CommunityPostPage() {
  const { user, token } = useUser()
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [liked, setLiked] = useState(false)

  // локальные состояния ответов под каждым комментом
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/community/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const tree = useMemo(() => (post ? buildTree(post.comments || []) : []), [post])

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

  const sendReply = async (parentId: string) => {
    const text = replyText[parentId]?.trim()
    if (!text) return
    setReplyText((s) => ({ ...s, [parentId]: '' }))
    try {
      const res = await fetch(`/api/community/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text, parentId }), // ✅ parentId — для ответа
      })
      if (res.ok) {
        fetchPost()
      }
    } catch (e) {
      console.error('Ошибка ответа на комментарий:', e)
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
  if (!post) return <p className="text-center text-gray-400 mt-20 text-lg">Пост не найден 😕</p>

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 text-white space-y-10">
      {/* Пост */}
      <article className="p-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-[#0b0b0b]/80 to-[#002a2a]/90 shadow-[0_0_25px_rgba(0,255,180,0.15)]">
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

        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* 🖼 Изображение поста (если есть) */}
        {post.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-800">
            {/* если у тебя ссылка типа /api/files/:id — оставляем как есть */}
            <img
              src={post.imageUrl}
              alt="post"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        <footer className="mt-6 flex items-center gap-4 text-sm">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              liked
                ? 'bg-emerald-600 border-emerald-500 text-black'
                : 'border-emerald-500/40 text-gray-300 hover:bg-emerald-700/20'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-black text-black' : 'text-emerald-400'}`} />
            {post._count.likes}
          </button>

          <div className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="w-4 h-4" />
            {post.comments.length}
          </div>
        </footer>
      </article>

      {/* Комментарии (дерево) */}
      <section>
        <h2 className="text-2xl font-semibold text-emerald-400 mb-5 flex items-center gap-2">
          💬 Комментарии
        </h2>

        {tree.length === 0 && (
          <p className="text-gray-500 text-center py-8 border border-gray-800 rounded-lg bg-black/30">
            Комментариев пока нет. Будь первым!
          </p>
        )}

        <div className="space-y-4">
          {tree.map((root) => (
            <CommentNode
              key={root.id}
              node={root}
              depth={0}
              replyOpen={replyOpen}
              setReplyOpen={setReplyOpen}
              replyText={replyText}
              setReplyText={setReplyText}
              sendReply={sendReply}
            />
          ))}
        </div>

        {/* Форма добавления корневого комментария */}
        {user && (
          <div className="mt-8 border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-emerald-300 mb-3">Добавить комментарий</h3>
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
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

/** Узел дерева комментариев (рекурсивно) */
function CommentNode({
  node,
  depth,
  replyOpen,
  setReplyOpen,
  replyText,
  setReplyText,
  sendReply,
}: {
  node: Comment & { children: Comment[] }
  depth: number
  replyOpen: Record<string, boolean>
  setReplyOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  replyText: Record<string, string>
  setReplyText: React.Dispatch<React.SetStateAction<Record<string, string>>>
  sendReply: (parentId: string) => void
}) {
  const time = new Date(node.createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      <div
        className="p-4 rounded-xl border border-gray-800 bg-gradient-to-br from-[#0b0b0b]/60 to-[#001818]/70"
        style={{ marginLeft: depth ? depth * 24 : 0 }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-emerald-300">
            {node.author.fullName || node.author.email}
          </p>
          <span className="text-xs text-gray-500">{time}</span>
        </div>

        <p className="text-gray-200 whitespace-pre-wrap">{node.content}</p>

        <button
          className="mt-3 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          onClick={() => setReplyOpen((s) => ({ ...s, [node.id]: !s[node.id] }))}
        >
          <Reply className="w-4 h-4" /> Ответить
        </button>

        {replyOpen[node.id] && (
          <div className="mt-3">
            <textarea
              value={replyText[node.id] || ''}
              onChange={(e) => setReplyText((s) => ({ ...s, [node.id]: e.target.value }))}
              rows={2}
              placeholder="Ваш ответ…"
              className="w-full p-2 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
            <div className="mt-2">
              <button
                onClick={() => sendReply(node.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                <Send className="w-4 h-4" /> Отправить ответ
              </button>
            </div>
          </div>
        )}
      </div>

      {node.children?.length > 0 &&
        node.children.map((child) => (
          <CommentNode
            key={child.id}
            node={{ ...child, children: (child as any).children || [] }}
            depth={Math.min(depth + 1, 6)} // защита от безумной глубины
            replyOpen={replyOpen}
            setReplyOpen={setReplyOpen}
            replyText={replyText}
            setReplyText={setReplyText}
            sendReply={sendReply}
          />
        ))}
    </div>
  )
}
