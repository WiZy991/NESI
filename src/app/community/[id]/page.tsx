'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Heart,
  MessageSquare,
  Send,
  Loader2,
  UserCircle2,
  Reply,
  Flame,
  Plus,
  Home,
  User,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Flag,
  Check,
  X,
} from 'lucide-react'

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

/** Древовидные комментарии */
function buildTree(comments: Comment[]) {
  const byId = new Map<string, Comment & { children: Comment[] }>()
  const roots: (Comment & { children: Comment[] })[] = []
  comments.forEach((c) => byId.set(c.id, { ...c, children: [] }))
  comments.forEach((c) => {
    const node = byId.get(c.id)!
    if (c.parentId && byId.get(c.parentId)) byId.get(c.parentId)!.children.push(node)
    else roots.push(node)
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
  const [openMenu, setOpenMenu] = useState<string | null>(null)

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
        body: JSON.stringify({ content: text, parentId }),
      })
      if (res.ok) fetchPost()
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

  // ─── Меню действий ───
  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    alert('📋 Ссылка скопирована!')
  }

  const reportItem = () => alert('🚨 Жалоба отправлена модераторам')
  const deleteItem = async (endpoint: string) => {
    if (!confirm('Удалить?')) return
    await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchPost()
  }

  if (loading) return <LoadingSpinner />
  if (!post) return <p className="text-center text-gray-400 mt-20 text-lg">Пост не найден 😕</p>

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-6 py-8">
        {/* ЛЕВАЯ КОЛОНКА */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-gray-800 pr-4">
          <h2 className="text-sm text-gray-400 uppercase mb-4">РАЗДЕЛЫ</h2>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/community" className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600/20 text-emerald-300">
              <Home className="w-4 h-4" /> Новые
            </Link>
            <Link href="/community?sort=popular" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition">
              <Flame className="w-4 h-4" /> Популярные
            </Link>
            {user && (
              <Link href="/community?filter=my" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition">
                <User className="w-4 h-4" /> Мои темы
              </Link>
            )}
            <Link href="/community/new" className="flex items-center gap-2 px-3 py-2 mt-4 rounded-md bg-emerald-600 hover:bg-emerald-700 justify-center font-medium transition">
              <Plus className="w-4 h-4" /> Создать тему
            </Link>
          </nav>
          <div className="mt-10 border-t border-gray-800 pt-4 text-xs text-gray-500 space-y-1">
            <p>NESI Community © 🌿{new Date().getFullYear()}</p>
          </div>
        </aside>

        {/* ЦЕНТР */}
        <main className="flex-1 max-w-3xl mx-auto space-y-10">
          {/* Пост */}
          <article className="p-6 rounded-2xl border border-gray-800 bg-transparent shadow-[0_0_25px_rgba(0,255,180,0.05)] relative">
            <div className="flex justify-between items-start mb-4">
              <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 hover:text-emerald-400 transition">
                <UserCircle2 className="w-10 h-10 text-emerald-400" />
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
              </Link>

              <div className="relative">
                <button onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)} className="p-1 hover:text-emerald-400">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {openMenu === post.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20">
                    <button onClick={() => { copyLink(window.location.href); setOpenMenu(null); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full">
                      <Copy className="w-4 h-4" /> Копировать ссылку
                    </button>
                    <button onClick={() => { reportItem(); setOpenMenu(null); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-red-400 w-full">
                      <Flag className="w-4 h-4" /> Пожаловаться
                    </button>
                    {user?.id === post.author.id && (
                      <button onClick={() => { deleteItem(`/api/community/${post.id}`); setOpenMenu(null); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-pink-400 w-full">
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {post.title && <h1 className="text-2xl font-bold text-emerald-400 mb-3">{post.title}</h1>}
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {post.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-800">
                <img src={post.imageUrl} alt="post" className="w-full h-auto object-cover" loading="lazy" />
              </div>
            )}

            <footer className="mt-6 flex items-center gap-4 text-sm">
              <button onClick={toggleLike} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${liked ? 'bg-emerald-600 border-emerald-500 text-black' : 'border-emerald-500/40 text-gray-300 hover:bg-emerald-700/20'}`}>
                <Heart className={`w-4 h-4 ${liked ? 'fill-black text-black' : 'text-emerald-400'}`} /> {post._count.likes}
              </button>
              <div className="flex items-center gap-2 text-gray-400"><MessageSquare className="w-4 h-4" /> {post.comments.length}</div>
            </footer>
          </article>

          {/* Комментарии */}
          <section>
            <h2 className="text-2xl font-semibold text-emerald-400 mb-5 flex items-center gap-2">💬 Комментарии</h2>
            {tree.length === 0 && <p className="text-gray-500 text-center py-8 border border-gray-800 rounded-lg bg-transparent">Комментариев пока нет. Будь первым!</p>}
            <div className="space-y-4">
              {tree.map((root) => (
                <CommentNode
                  key={root.id}
                  node={root}
                  depth={0}
                  userId={user?.id}
                  token={token}
                  fetchPost={fetchPost}
                  replyOpen={replyOpen}
                  setReplyOpen={setReplyOpen}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  sendReply={sendReply}
                />
              ))}
            </div>
            {user && (
              <div className="mt-8 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">Добавить комментарий</h3>
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} placeholder="Напиши что-нибудь..." className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                <button onClick={sendComment} disabled={sending} className="mt-3 flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {sending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

/** Узел комментария */
function CommentNode({
  node,
  depth,
  userId,
  token,
  fetchPost,
  replyOpen,
  setReplyOpen,
  replyText,
  setReplyText,
  sendReply,
}: any) {
  const [openMenu, setOpenMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(node.content)

  const time = new Date(node.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  const saveEdit = async () => {
    await fetch(`/api/community/comment/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: editText }),
    })
    setEditing(false)
    fetchPost()
  }

  const deleteComment = async () => {
    if (!confirm('Удалить комментарий?')) return
    await fetch(`/api/community/comment/${node.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchPost()
  }

  return (
    <div>
      <div
        className="p-4 rounded-xl border bg-gradient-to-br from-[#001a12]/70 to-[#002a22]/60 shadow-[0_0_15px_rgba(0,255,180,0.08)] transition hover:shadow-[0_0_25px_rgba(0,255,180,0.15)] relative"
        style={{ marginLeft: depth ? depth * 24 : 0, borderColor: 'rgba(0,255,180,0.25)' }}
      >
        <div className="flex items-start justify-between mb-2">
          <Link href={`/profile/${node.author.id}`} className="font-medium text-emerald-300 hover:text-emerald-400 transition">
            {node.author.fullName || node.author.email}
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{time}</span>
            <button onClick={() => setOpenMenu(!openMenu)} className="hover:text-emerald-400">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {openMenu && (
            <div className="absolute right-0 mt-6 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20">
              <button onClick={() => { navigator.clipboard.writeText(window.location.href + '#' + node.id); setOpenMenu(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full">
                <Copy className="w-4 h-4" /> Копировать ссылку
              </button>
              {userId === node.author.id ? (
                <>
                  <button onClick={() => { setEditing(true); setOpenMenu(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full">
                    <Edit3 className="w-4 h-4" /> Редактировать
                  </button>
                  <button onClick={() => { deleteComment(); setOpenMenu(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-pink-400 w-full">
                    <Trash2 className="w-4 h-4" /> Удалить
                  </button>
                </>
              ) : (
                <button onClick={() => { alert('🚨 Жалоба отправлена'); setOpenMenu(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-red-400 w-full">
                  <Flag className="w-4 h-4" /> Пожаловаться
                </button>
              )}
            </div>
          )}
        </div>

        {editing ? (
  <div className="space-y-2">
    <textarea
      value={editText}
      onChange={(e) => setEditText(e.target.value)}
      rows={2}
      className="w-full p-2 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
    />
    <div className="flex gap-2">
      <button
        onClick={saveEdit}
        className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-sm"
      >
        <Check className="w-4 h-4" />
        Сохранить
      </button>
      <button
        onClick={() => setEditing(false)}
        className="flex items-center gap-1 px-3 py-1 rounded bg-gray-700 hover:bg-gray-800 text-sm"
      >
        <X className="w-4 h-4" />
        Отмена
      </button>
    </div>
  </div>
) : (
  <p className="text-gray-200 whitespace-pre-wrap">{node.content}</p>
)}

<button
  className="mt-3 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
  onClick={() => setReplyOpen((s: any) => ({ ...s, [node.id]: !s[node.id] }))}
>
  <Reply className="w-4 h-4" /> Ответить
</button>

{replyOpen[node.id] && (
  <div className="mt-3">
    <textarea
      value={replyText[node.id] || ''}
      onChange={(e) =>
        setReplyText((s: any) => ({ ...s, [node.id]: e.target.value }))
      }
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
  node.children.map((child: any) => (
    <CommentNode
      key={child.id}
      node={{ ...child, children: (child as any).children || [] }}
      depth={Math.min(depth + 1, 6)}
      userId={userId}
      token={token}
      fetchPost={fetchPost}
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
