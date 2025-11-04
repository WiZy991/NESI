'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useUser } from '@/context/UserContext'

type IncomingItem = {
  id: string
  createdAt: string
  paid: boolean
  status: 'pending' | 'accepted' | 'rejected'
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
  executor: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
    location?: string | null
  }
}

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

export default function HirePage() {
  const { user } = useUser()
  const [tab, setTab] = useState<'incoming' | 'sent'>('incoming')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400'
      case 'accepted':
        return 'text-green-400'
      case 'rejected':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 text-white space-y-8">
      {/* Заголовок с градиентом */}
      <div className="text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]">
          📑 Запросы найма
        </h1>
        <p className="text-gray-400 text-lg">
          Управляйте запросами на сотрудничество
        </p>
      </div>

      {/* Панель управления */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-black/40 backdrop-blur-sm border border-emerald-500/20 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-3">
          {user?.role === 'executor' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-300 font-semibold">Входящие запросы</span>
            </div>
          )}
          {user?.role === 'customer' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-emerald-300 font-semibold">Отправленные запросы</span>
            </div>
          )}
        </div>
        
        <button
          onClick={refreshData}
          className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300 font-medium group"
          title="Обновить список"
        >
          <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Обновить</span>
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}
      
      {error && (
        <div className="p-5 rounded-xl bg-red-900/20 border border-red-500/40 text-red-300">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Ошибка</span>
          </div>
          <p>{error}</p>
        </div>
      )}

      {/* Исполнитель: входящие */}
      {allowedTab === 'incoming' && !loading && !error && (
        <div className="space-y-4">
          {incoming.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Запросов пока нет</h3>
              <p className="text-gray-500">Входящие запросы на найм появятся здесь</p>
            </div>
          ) : (
            incoming.map((i) => (
              <div
                key={i.id}
                className="relative group bg-black/40 backdrop-blur-sm border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.25)] transition-all duration-300"
              >
                {/* Градиентный фон */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-6 space-y-4">
                  {/* Заголовок карточки */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {/* Аватар */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {(i.customer.fullName || i.customer.email).charAt(0).toUpperCase()}
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Заказчик</p>
                        <Link
                          href={`/users/${i.customer.id}`}
                          className="text-lg font-semibold text-emerald-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group/link"
                        >
                          {i.customer.fullName || i.customer.email}
                          <svg className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Статус */}
                    <div className="flex items-center gap-2">
                      {i.status === 'pending' && (
                        <span className="px-4 py-2 rounded-lg bg-yellow-900/30 border border-yellow-500/40 text-yellow-400 font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                          В ожидании
                        </span>
                      )}
                      {i.status === 'accepted' && (
                        <span className="px-4 py-2 rounded-lg bg-green-900/30 border border-green-500/40 text-green-400 font-semibold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Принято
                        </span>
                      )}
                      {i.status === 'rejected' && (
                        <span className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 font-semibold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Отклонено
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Детали */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(i.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {i.paid ? (
                        <>
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-400 font-medium">Оплачен</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Не оплачен</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Действия */}
                  {i.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700/50">
                      <button
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:scale-105"
                        onClick={() => handleAction(i.id, 'accept')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Принять
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all duration-300 transform hover:scale-105"
                        onClick={() => handleAction(i.id, 'reject')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Отклонить
                      </button>
                    </div>
                  )}

                  {i.status === 'accepted' && (
                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                      <p className="text-green-300 flex items-start gap-2">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Вы приняли приглашение. Свяжитесь с заказчиком через{' '}
                          <Link
                            href={`/chats?open=${i.customer.id}`}
                            className="underline text-emerald-300 hover:text-emerald-200 font-semibold"
                          >
                            чат
                          </Link>.
                        </span>
                      </p>
                    </div>
                  )}

                  {i.status === 'rejected' && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                      <p className="text-red-300 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Вы отклонили это приглашение.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Заказчик: отправленные */}
      {allowedTab === 'sent' && !loading && !error && (
        <div className="space-y-4">
          {sent.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Нет отправленных запросов</h3>
              <p className="text-gray-500">Ваши отправленные запросы на найм появятся здесь</p>
            </div>
          ) : (
            sent.map((s) => (
              <div
                key={s.id}
                className="relative group bg-black/40 backdrop-blur-sm border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(6,182,212,0.25)] transition-all duration-300"
              >
                {/* Градиентный фон */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-6 space-y-4">
                  {/* Заголовок карточки */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {/* Аватар */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {(s.executor.fullName || s.executor.email).charAt(0).toUpperCase()}
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Исполнитель</p>
                        <Link
                          href={`/users/${s.executor.id}`}
                          className="text-lg font-semibold text-cyan-300 hover:text-cyan-400 transition-colors flex items-center gap-2 group/link"
                        >
                          {s.executor.fullName || s.executor.email}
                          <svg className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Статус */}
                    <div className="flex items-center gap-2">
                      {s.status === 'pending' && (
                        <span className="px-4 py-2 rounded-lg bg-yellow-900/30 border border-yellow-500/40 text-yellow-400 font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                          В ожидании
                        </span>
                      )}
                      {s.status === 'accepted' && (
                        <span className="px-4 py-2 rounded-lg bg-green-900/30 border border-green-500/40 text-green-400 font-semibold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Принято
                        </span>
                      )}
                      {s.status === 'rejected' && (
                        <span className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 font-semibold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Отклонено
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Детали */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(s.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {s.paid ? (
                        <>
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-400 font-medium">Оплачен</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Не оплачен</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Действия и статусы */}
                  <div className="pt-4 border-t border-gray-700/50 space-y-3">
                    {/* Кнопка чата */}
                    <Link
                      href={`/chats?open=${s.executor.id}`}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-900/30 to-cyan-800/30 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 font-semibold group/chat"
                    >
                      <svg className="w-5 h-5 group-hover/chat:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Перейти в чат
                    </Link>

                    {s.status === 'accepted' && (
                      <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                        <p className="text-green-300 flex items-center gap-2">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Исполнитель принял ваш запрос
                        </p>
                      </div>
                    )}
                    
                    {s.status === 'rejected' && (
                      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                        <p className="text-red-300 flex items-center gap-2">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Исполнитель отклонил запрос
                        </p>
                      </div>
                    )}
                    
                    {s.status === 'pending' && (
                      <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                        <p className="text-yellow-300 flex items-center gap-2">
                          <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Ожидает ответа исполнителя
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
