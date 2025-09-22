'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useUser } from '@/context/UserContext'

type ReviewLite = { rating: number }

type PublicUser = {
  id: string
  role: 'customer' | 'executor' | string
  fullName: string | null
  email?: string | null
  avatarUrl?: string | null
  location?: string | null
  description?: string | null
  reviewsReceived?: ReviewLite[]
}

function buildAuthHeaders(): HeadersInit {
  let token: string | null = null
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
    if (m) token = decodeURIComponent(m[1])
    if (!token) token = localStorage.getItem('token')
  }
  const h: HeadersInit = {}
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// перевод ролей на русский
function getRoleName(role: string | undefined | null): string {
  switch (role) {
    case 'executor':
      return 'Исполнитель'
    case 'customer':
      return 'Заказчик'
    default:
      return role || '—'
  }
}

export default function UserPublicProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { user } = useUser()

  const [viewUser, setViewUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // hire CTA
  const [hireState, setHireState] = useState<'none' | 'pending' | 'accepted'>('none')
  const [hireId, setHireId] = useState<string | null>(null)
  const [sendingHire, setSendingHire] = useState(false)

  // подгрузка публичного профиля
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/users/${userId}`, {
          headers: buildAuthHeaders(),
          cache: 'no-store',
        })
        const raw = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(raw?.error || `${res.status} ${res.statusText}`)
        const u: PublicUser | null = (raw?.user ?? raw) || null
        if (!cancelled) setViewUser(u)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Ошибка загрузки профиля')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  // предзагрузка статуса hire (для заказчика на странице исполнителя)
  useEffect(() => {
    if (!viewUser || user?.role !== 'customer' || viewUser.id === user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/hire/status?executorId=${viewUser.id}`, {
          headers: buildAuthHeaders(),
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.exists) {
          setHireState(data.status)
          setHireId(data.hireId)
        } else {
          setHireState('none')
          setHireId(null)
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [viewUser?.id, user?.role, user?.id])

  async function sendHireRequest() {
    if (!viewUser || sendingHire) return
    setSendingHire(true)
    try {
      const res = await fetch('/api/hire', {
        method: 'POST',
        headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ executorId: viewUser.id }),
      })

      if (res.status === 201) {
        const d = await res.json().catch(() => ({}))
        setHireState('pending')
        setHireId(d?.hireId ?? null)
        return
      }

      if (res.status === 409) {
        const d = await res.json().catch(() => ({}))
        setHireState(d?.status === 'accepted' ? 'accepted' : 'pending')
        setHireId(d?.hireId ?? null)
        return
      }

      const err = await res.json().catch(() => ({}))
      alert(err?.error || 'Ошибка при отправке запроса')
    } catch {
      alert('Ошибка сети')
    } finally {
      setSendingHire(false)
    }
  }

  // ====== UI ======
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-white">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !viewUser) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-white">
        <p className="text-red-400">{error || 'Пользователь не найден'}</p>
      </div>
    )
  }

  // рейтинг
  const ratings = viewUser.reviewsReceived || []
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : null
  const reviewsCount = ratings.length

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-black/40 border border-green-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,150,0.3)] flex gap-4 items-start hover:shadow-[0_0_25px_rgba(0,255,150,0.5)] transition">
        {viewUser.avatarUrl && (
          <img
            src={viewUser.avatarUrl}
            alt="Avatar"
            className="w-20 h-20 rounded-full border border-green-500/40 object-cover shadow-[0_0_10px_rgba(0,255,150,0.4)]"
          />
        )}

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-green-400 mb-1">
            {viewUser.fullName || viewUser.email || 'Профиль пользователя'}
          </h1>
          <div className="text-gray-400 mb-2">
            {getRoleName(viewUser.role)} {viewUser.location ? `• ${viewUser.location}` : ''}
          </div>

          {avgRating && viewUser.role === 'executor' && (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-yellow-400 font-bold">★ {avgRating}</span>
              <span className="text-gray-400">({reviewsCount} отзывов)</span>
            </div>
          )}

          <p className="mt-4 text-gray-300">
            {viewUser.description?.trim() || 'Публичная информация о пользователе будет здесь.'}
          </p>
        </div>
      </div>

      {/* CTA «Нанять исполнителя» */}
      {user?.role === 'customer' && user?.id !== viewUser.id && viewUser.role === 'executor' && (
        <div className="mt-6">
          {hireState === 'accepted' ? (
            <div className="flex gap-3">
              <Link
                href={`/messages/${viewUser.id}`}
                className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
              >
                Перейти в чат
              </Link>
              <span className="text-green-400 self-center text-sm">Запрос принят</span>
            </div>
          ) : hireState === 'pending' ? (
            <button
              className="px-3 py-2 rounded bg-gray-700 text-white cursor-not-allowed"
              disabled
            >
              Запрос отправлен
            </button>
          ) : (
            <button
              onClick={sendHireRequest}
              disabled={sendingHire}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Нанять исполнителя
            </button>
          )}
        </div>
      )}
    </div>
  )
}
