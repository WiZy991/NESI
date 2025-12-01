'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useUser } from '@/context/UserContext'

type IncomingItem = {
  id: string
  createdAt: string
  paid: boolean
  status: 'pending' | 'accepted' | 'rejected'
  message?: string | null
  amount?: number | string
  customer: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
    location?: string | null
  }
}

type SentItem = {
  id: string
  createdAt: string
  paid: boolean
  status: 'pending' | 'accepted' | 'rejected'
  message?: string | null
  amount?: number | string
  executor: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
    location?: string | null
  }
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected'

function getAuthHeaders(): HeadersInit {
  let token: string | null = null
  if (typeof window !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
    if (m) token = decodeURIComponent(m[1])
    if (!token) token = localStorage.getItem('token')
  }
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// Функция для преобразования avatarUrl (может быть ID файла или полным URL)
function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null
  // Если это уже полный URL (начинается с http или /), возвращаем как есть
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('/')) {
    return avatarUrl
  }
  // Иначе это ID файла, преобразуем в URL
  return `/api/files/${avatarUrl}`
}

export default function HirePageContent() {
  const { user } = useUser()
  const [tab, setTab] = useState<'incoming' | 'sent'>('incoming')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const [incoming, setIncoming] = useState<IncomingItem[]>([])
  const [sent, setSent] = useState<SentItem[]>([])

  const allowedTab: 'incoming' | 'sent' | null = user
    ? user.role === 'executor'
      ? 'incoming'
      : 'sent'
    : null

  useEffect(() => {
    if (allowedTab) setTab(allowedTab)
  }, [allowedTab])

  // Статистика
  const stats = useMemo(() => {
    const items = tab === 'incoming' ? incoming : sent
    return {
      all: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      accepted: items.filter(i => i.status === 'accepted').length,
      rejected: items.filter(i => i.status === 'rejected').length,
    }
  }, [incoming, sent, tab])

  // Фильтрация
  const filteredItems = useMemo(() => {
    const items = tab === 'incoming' ? incoming : sent
    if (statusFilter === 'all') return items
    return items.filter(i => i.status === statusFilter)
  }, [incoming, sent, tab, statusFilter])

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const headers = getAuthHeaders()
      
      if (user.role === 'executor') {
        const res = await fetch('/api/hire/incoming', { headers })
        if (!res.ok) throw new Error('Ошибка загрузки входящих запросов')
        const data = await res.json()
        setIncoming(data.items || [])
      } else {
        const res = await fetch('/api/hire/sent', { headers })
        if (!res.ok) throw new Error('Ошибка загрузки отправленных запросов')
        const data = await res.json()
        setSent(data.items || [])
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`/api/hire/${id}/${action}`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error('Ошибка')
      await fetchData()
    } catch (err) {
      alert('Ошибка')
    }
  }

  if (loading && incoming.length === 0 && sent.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-white">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">❌ {error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  const items = filteredItems

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-white">
      <h1 className="text-3xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
        <span className="text-4xl">💼</span>
        Запросы найма
      </h1>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.all}</div>
          <div className="text-sm text-gray-400">Всего</div>
        </div>
        <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-400">Ожидают</div>
        </div>
        <div className="bg-black/40 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.accepted}</div>
          <div className="text-sm text-gray-400">Приняты</div>
        </div>
        <div className="bg-black/40 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          <div className="text-sm text-gray-400">Отклонены</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'accepted', 'rejected'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg transition ${
              statusFilter === status
                ? 'bg-emerald-600 text-white'
                : 'bg-black/40 text-gray-400 hover:bg-black/60'
            }`}
          >
            {status === 'all' ? 'Все' : status === 'pending' ? 'Ожидают' : status === 'accepted' ? 'Приняты' : 'Отклонены'}
          </button>
        ))}
      </div>

      {/* Список */}
      {items.length === 0 ? (
        <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-8 text-center">
          <p className="text-gray-400">Нет запросов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: IncomingItem | SentItem) => {
            const otherUser = 'customer' in item ? item.customer : item.executor
            const isExpanded = expandedItems.has(item.id)

            return (
              <div
                key={item.id}
                className="bg-black/40 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {otherUser.avatarUrl ? (
                      <Image
                        src={resolveAvatarUrl(otherUser.avatarUrl) || ''}
                        alt={otherUser.fullName || otherUser.email}
                        width={48}
                        height={48}
                        className="rounded-full border-2 border-emerald-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-lg font-bold text-emerald-400">
                        {(otherUser.fullName || otherUser.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {otherUser.fullName || otherUser.email}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : item.status === 'accepted'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {item.status === 'pending' ? 'Ожидает' : item.status === 'accepted' ? 'Принят' : 'Отклонен'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      {item.message && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
                        >
                          {isExpanded ? 'Скрыть сообщение' : 'Показать сообщение'}
                        </button>
                      )}
                      {isExpanded && item.message && (
                        <p className="mt-2 text-gray-300 whitespace-pre-wrap">{item.message}</p>
                      )}
                    </div>
                  </div>
                  {item.status === 'pending' && user?.role === 'executor' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(item.id, 'accept')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

