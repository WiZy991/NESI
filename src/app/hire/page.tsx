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

  // вкладка зависит от роли
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
    <div className="max-w-4xl mx-auto py-8 px-4 text-white space-y-6">
      <h1 className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
        Запросы найма
      </h1>

      {/* заголовок вкладки */}
      <div className="flex items-center gap-3">
        {user?.role === 'executor' && (
          <span className="px-3 py-1 rounded-lg bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 font-medium">
            Входящие запросы
          </span>
        )}
        {user?.role === 'customer' && (
          <span className="px-3 py-1 rounded-lg bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 font-medium">
            Отправленные запросы
          </span>
        )}
        <button
          onClick={refreshData}
          className="ml-auto px-3 py-1 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition"
          title="Обновить список"
        >
          Обновить
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* ------------------ Исполнитель: входящие ------------------ */}
      {allowedTab === 'incoming' && !loading && !error && (
        <div className="space-y-4">
          {incoming.length === 0 ? (
            <p className="text-gray-400">Пока нет входящих запросов.</p>
          ) : (
            incoming.map((i) => (
              <div
                key={i.id}
                className="p-5 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      Заказчик:{' '}
                      <Link
                        href={`/users/${i.customer.id}`}
                        className="text-emerald-400 hover:underline"
                      >
                        {i.customer.fullName || i.customer.email}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(i.createdAt).toLocaleString()} • Оплачен:{' '}
                      {i.paid ? 'да' : 'нет'}
                    </p>
                  </div>
                  <span className={`font-medium ${statusColor(i.status)}`}>
                    {i.status === 'pending'
                      ? 'В ожидании'
                      : i.status === 'accepted'
                      ? 'Принято'
                      : 'Отклонено'}
                  </span>
                </div>

                {i.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                      onClick={() => handleAction(i.id, 'accept')}
                    >
                      Принять
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                      onClick={() => handleAction(i.id, 'reject')}
                    >
                      Отклонить
                    </button>
                  </div>
                )}

                {i.status === 'accepted' && (
                  <p className="text-green-400 mt-2">
                    ✅ Вы приняли приглашение. Свяжитесь с заказчиком через{' '}
                    <Link
                      href={`/messages/${i.customer.id}`}
                      className="underline text-emerald-300 hover:text-emerald-200"
                    >
                      чат
                    </Link>.
                  </p>
                )}

                {i.status === 'rejected' && (
                  <p className="text-red-400 mt-2">
                    ❌ Вы отклонили это приглашение.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ------------------ Заказчик: отправленные ------------------ */}
      {allowedTab === 'sent' && !loading && !error && (
        <div className="space-y-4">
          {sent.length === 0 ? (
            <p className="text-gray-400">Пока нет отправленных запросов.</p>
          ) : (
            sent.map((s) => (
              <div
                key={s.id}
                className="p-5 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      Исполнитель:{' '}
                      <Link
                        href={`/users/${s.executor.id}`}
                        className="text-emerald-400 hover:underline"
                      >
                        {s.executor.fullName || s.executor.email}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(s.createdAt).toLocaleString()} • Оплачен:{' '}
                      {s.paid ? 'да' : 'нет'}
                    </p>
                  </div>
                  <span className={`font-medium ${statusColor(s.status)}`}>
                    {s.status === 'pending'
                      ? 'В ожидании'
                      : s.status === 'accepted'
                      ? 'Принято'
                      : 'Отклонено'}
                  </span>
                </div>

                {/* чат доступен всегда */}
                <p className="text-blue-400 mt-2">
                  💬 Перейти в{' '}
                  <Link
                    href={`/messages/${s.executor.id}`}
                    className="underline text-emerald-300 hover:text-emerald-200"
                  >
                    чат
                  </Link>
                </p>

                {s.status === 'accepted' && (
                  <p className="text-green-400 mt-2">
                    ✅ Исполнитель принял запрос.
                  </p>
                )}

                {s.status === 'rejected' && (
                  <p className="text-red-400 mt-2">
                    ❌ Исполнитель отклонил запрос.
                  </p>
                )}

                {s.status === 'pending' && (
                  <p className="text-yellow-400 mt-2">
                    ⌛ Ожидает ответа исполнителя.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
