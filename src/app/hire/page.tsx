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

export default function HirePage() {
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

  const url = useMemo(
    () => (tab === 'incoming' ? '/api/hire/incoming' : '/api/hire/sent'),
    [tab]
  )

  const refreshData = useCallback(async () => {
    if (!allowedTab) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`
        try {
          const j = await res.json()
          msg = j?.error || msg
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      if (tab === 'incoming') setIncoming(data as IncomingItem[])
      else setSent(data as SentItem[])
    } catch (e: any) {
      setError(e?.message || 'Server error')
    } finally {
      setLoading(false)
    }
  }, [allowedTab, url, tab])

  useEffect(() => {
    if (!allowedTab || tab !== allowedTab) return
    refreshData()
  }, [url, tab, allowedTab, refreshData])

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/hire/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        alert(err?.error || 'Ошибка')
        return
      }
      await refreshData()
    } catch {
      alert('Ошибка сервера')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6 px-3 sm:px-4 text-white overflow-x-hidden w-full">
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-emerald-400">Запросы найма</h1>
        <button
          onClick={refreshData}
          className="p-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Обновить"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Компактная статистика и фильтры */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 md:px-3 py-1 rounded ${statusFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}
          >
            Все ({stats.all})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2 md:px-3 py-1 rounded ${statusFilter === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
          >
            В ожидании ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('accepted')}
            className={`px-2 md:px-3 py-1 rounded ${statusFilter === 'accepted' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-green-400'}`}
          >
            Принято ({stats.accepted})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-2 md:px-3 py-1 rounded ${statusFilter === 'rejected' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'}`}
          >
            Отклонено ({stats.rejected})
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}
      
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/40 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Исполнитель: входящие */}
      {allowedTab === 'incoming' && !loading && !error && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Нет запросов</p>
            </div>
          ) : (
            (filteredItems as IncomingItem[]).map((i) => {
              const isExpanded = expandedItems.has(i.id)
              return (
                <div
                  key={i.id}
                  className="bg-black/30 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/40 transition-colors w-full overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {resolveAvatarUrl(i.customer.avatarUrl) ? (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-emerald-500/30 overflow-hidden flex-shrink-0">
                          <Image
                            src={resolveAvatarUrl(i.customer.avatarUrl)!}
                            alt={i.customer.fullName || i.customer.email}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm md:text-base flex-shrink-0">
                          {(i.customer.fullName || i.customer.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/users/${i.customer.id}`}
                          className="text-emerald-400 hover:text-emerald-300 font-medium truncate block text-sm md:text-base"
                        >
                          {i.customer.fullName || i.customer.email}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-gray-500 mt-1">
                          <span>{new Date(i.createdAt).toLocaleDateString('ru-RU')}</span>
                          {i.amount && <span>{Number(i.amount).toFixed(0)} ₽</span>}
                          {i.paid && <span className="text-green-400">✓ Оплачен</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start sm:self-auto">
                      {i.status === 'pending' && (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                          В ожидании
                        </span>
                      )}
                      {i.status === 'accepted' && (
                        <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                          Принято
                        </span>
                      )}
                      {i.status === 'rejected' && (
                        <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                          Отклонено
                        </span>
                      )}
                    </div>
                  </div>

                  {i.message && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleExpand(i.id)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                      >
                        <span>Письмо</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-emerald-900/10 border border-emerald-500/20 rounded text-sm text-gray-300">
                          {i.message}
                        </div>
                      )}
                    </div>
                  )}

                  {i.status === 'pending' && (
                    <div className="pt-3 border-t border-gray-700/30 mt-3 -mx-4 px-4 sm:mx-0 sm:px-0">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                        <button
                          className="w-full sm:flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium text-sm transition-colors text-center"
                          onClick={() => handleAction(i.id, 'accept')}
                        >
                          Принять
                        </button>
                        <button
                          className="w-full sm:flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium text-sm transition-colors text-center"
                          onClick={() => handleAction(i.id, 'reject')}
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  )}

                  {i.status === 'accepted' && (
                    <div className="pt-3 border-t border-gray-700/30">
                      <Link
                        href={`/chats?open=${i.customer.id}`}
                        className="block text-center px-3 md:px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-colors"
                      >
                        Перейти в чат
                      </Link>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Заказчик: отправленные */}
      {allowedTab === 'sent' && !loading && !error && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Нет запросов</p>
            </div>
          ) : (
            (filteredItems as SentItem[]).map((s) => {
              const isExpanded = expandedItems.has(s.id)
              return (
                <div
                  key={s.id}
                  className="bg-black/30 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {resolveAvatarUrl(s.executor.avatarUrl) ? (
                        <div className="w-10 h-10 rounded-full border border-cyan-500/30 overflow-hidden flex-shrink-0">
                          <Image
                            src={resolveAvatarUrl(s.executor.avatarUrl)!}
                            alt={s.executor.fullName || s.executor.email}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(s.executor.fullName || s.executor.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/users/${s.executor.id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium truncate block"
                        >
                          {s.executor.fullName || s.executor.email}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{new Date(s.createdAt).toLocaleDateString('ru-RU')}</span>
                          {s.amount && <span>{Number(s.amount).toFixed(0)} ₽</span>}
                          {s.paid && <span className="text-green-400">✓ Оплачен</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {s.status === 'pending' && (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          В ожидании
                        </span>
                      )}
                      {s.status === 'accepted' && (
                        <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                          Принято
                        </span>
                      )}
                      {s.status === 'rejected' && (
                        <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                          Отклонено
                        </span>
                      )}
                    </div>
                  </div>

                  {s.message && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleExpand(s.id)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <span>Письмо</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-cyan-900/10 border border-cyan-500/20 rounded text-sm text-gray-300">
                          {s.message}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-700/30">
                    <Link
                      href={`/chats?open=${s.executor.id}`}
                      className="block text-center px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-colors"
                    >
                      Перейти в чат
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
