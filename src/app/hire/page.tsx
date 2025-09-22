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

  // Разрешённая вкладка по роли
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Запросы найма</h1>

      {/* Табы (показываем только актуальную по роли) */}
      <div className="flex gap-3 mb-6">
        {user?.role === 'executor' && (
          <button className="px-3 py-1 rounded bg-blue-600 cursor-default">
            Входящие (для исполнителя)
          </button>
        )}
        {user?.role === 'customer' && (
          <button className="px-3 py-1 rounded bg-blue-600 cursor-default">
            Отправленные (для заказчика)
          </button>
        )}
        <button
          onClick={refreshData}
          className="ml-auto px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
          title="Обновить список"
        >
          Обновить
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* ------------------ ИСПОЛНИТЕЛЬ: Входящие ------------------ */}
      {allowedTab === 'incoming' && !loading && !error && (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <p className="text-gray-400">Пока нет входящих запросов.</p>
          ) : (
            incoming.map((i) => (
              <div
                key={i.id}
                className="bg-gray-900 border border-gray-700 p-3 rounded"
              >
                <div className="font-semibold">
                  Заказчик:{' '}
                  <Link
                    href={`/users/${i.customer.id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {i.customer.fullName || i.customer.email}
                  </Link>
                </div>
                <div className="text-sm text-gray-400">
                  Дата: {new Date(i.createdAt).toLocaleString()} • Оплачен:{' '}
                  {i.paid ? 'да' : 'нет'}
                </div>

                {i.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      onClick={() => handleAction(i.id, 'accept')}
                    >
                      Принять
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      onClick={() => handleAction(i.id, 'reject')}
                    >
                      Отклонить
                    </button>
                  </div>
                )}

                {i.status === 'accepted' && (
                  <p className="text-green-400 mt-2">
                    Вы приняли приглашение. Свяжитесь с заказчиком через{' '}
                    <Link
                      href={`/messages/${i.customer.id}`}
                      className="underline text-blue-400 hover:text-blue-300"
                    >
                      чат
                    </Link>.
                  </p>
                )}

                {i.status === 'rejected' && (
                  <p className="text-red-400 mt-2">
                    Вы отклонили это приглашение.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ------------------ ЗАКАЗЧИК: Отправленные ------------------ */}
      {allowedTab === 'sent' && !loading && !error && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <p className="text-gray-400">Пока нет отправленных запросов.</p>
          ) : (
            sent.map((s) => (
              <div
                key={s.id}
                className="bg-gray-900 border border-gray-700 p-3 rounded"
              >
                <div className="font-semibold">
                  Исполнитель:{' '}
                  <Link
                    href={`/users/${s.executor.id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {s.executor.fullName || s.executor.email}
                  </Link>
                </div>
                <div className="text-sm text-gray-400">
                  Дата: {new Date(s.createdAt).toLocaleString()} • Оплачен:{' '}
                  {s.paid ? 'да' : 'нет'}
                </div>

                {s.status === 'accepted' && (
                  <div className="text-sm text-green-400 mt-2">
                    Статус: Принято. Перейти в{' '}
                    <Link
                      href={`/messages/${s.executor.id}`}
                      className="underline text-blue-400 hover:text-blue-300"
                    >
                      чат
                    </Link>.
                  </div>
                )}

                {s.status === 'rejected' && (
                  <div className="text-sm text-red-400 mt-2">
                    Статус: Отклонено.
                  </div>
                )}

                {s.status === 'pending' && (
                  <div className="text-sm text-gray-300 mt-2">
                    Статус: В ожидании.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
