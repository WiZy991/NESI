'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

export default function HireDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [hire, setHire] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/hire/${id}`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Ошибка')
        setHire(data)
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">{error}</p>
  if (!hire) return <p>Запрос не найден</p>

  const handleAction = async (action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/hire/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        alert(err?.error || 'Ошибка выполнения действия')
        return
      }

      // 🔄 обновим данные
      router.refresh()

      // ✅ Если приняли — переходим сразу в чат
      if (action === 'accept' && hire?.customer?.id) {
        router.push(`/chats?open=${hire.customer.id}`)
      }
    } catch (err) {
      console.error('Ошибка при изменении статуса', err)
      alert('Ошибка сервера')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-white space-y-4">
      <h1 className="text-2xl font-bold text-emerald-400">
        Запрос от {hire.customer?.fullName || '—'}
      </h1>

      <p><b>Дата:</b> {new Date(hire.createdAt).toLocaleString()}</p>
      <p><b>Статус:</b> {hire.status}</p>
      <p><b>Оплачен:</b> {hire.paid ? 'Да' : 'Нет'}</p>

      {hire.status === 'accepted' && (
        <p className="text-green-400">
          ✅ Вы приняли запрос.{' '}
          <Link
            href={`/chats?open=${hire.customer.id}`}
            className="underline text-emerald-300 hover:text-emerald-200"
          >
            Перейти в чат
          </Link>
        </p>
      )}

      {hire.status === 'pending' && (
        <div className="flex gap-3 mt-4">
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
            onClick={() => handleAction('accept')}
          >
            Принять
          </button>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            onClick={() => handleAction('reject')}
          >
            Отклонить
          </button>
        </div>
      )}

      {hire.status === 'rejected' && (
        <p className="text-red-400">❌ Запрос отклонен.</p>
      )}
    </div>
  )
}
