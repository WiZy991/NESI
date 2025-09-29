// src/components/ResponseForm.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'

export default function ResponseForm({
  taskId,
  minPrice = 0,
  isCertified = true,
  subcategoryId,
}: {
  taskId: string
  minPrice?: number
  isCertified?: boolean
  subcategoryId?: string
}) {
  const { token } = useUser()
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) return toast.error('Вы не авторизованы')
    if (!isCertified) return toast.error('Сначала пройдите сертификацию')

    if (!message || !price) return toast.error('Заполните сообщение и цену')

    const parsedPrice = parseInt(price)
    if (Number.isNaN(parsedPrice)) return toast.error('Некорректная цена')
    if (parsedPrice < minPrice) return toast.error(`Минимальная цена по категории — ${minPrice}₽`)

    const payload = { message, price: parsedPrice }
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      if (!res.ok) {
        try {
          const data = JSON.parse(text)
          if (res.status === 403 && data?.error?.includes('сертификацию')) {
            toast.error('Для отклика требуется пройти сертификацию')
          } else {
            toast.error(data?.error || 'Ошибка при отклике')
          }
        } catch {
          toast.error('Ошибка при отклике')
        }
        return
      }

      toast.success('Отклик отправлен')
      window.location.reload()
    } catch (err) {
      console.error('Ошибка сети:', err)
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  // Текст для tooltip
  const tooltipText = !isCertified
    ? `Пройдите сертификацию: ${subcategoryId ? `/certifications/${subcategoryId}` : '/certifications'}`
    : ''

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t border-gray-700 pt-4">
      <h2 className="text-lg font-semibold mb-2">Откликнуться</h2>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Комментарий"
        disabled={!isCertified}
        title={tooltipText}
        className={`w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm mb-2 ${
          !isCertified ? 'cursor-not-allowed opacity-50' : ''
        }`}
      />

      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Цена"
        disabled={!isCertified}
        title={tooltipText}
        className={`w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm mb-1 ${
          !isCertified ? 'cursor-not-allowed opacity-50' : ''
        }`}
      />

      {minPrice > 0 && (
        <p className="text-sm text-gray-400 mb-2">
          💡 Минимальная цена по категории: <b>{minPrice}₽</b>
        </p>
      )}

      <button
        type="submit"
        disabled={
          loading ||
          !isCertified ||
          (!!price && parseInt(price) < (minPrice || 0))
        }
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Отправка...' : 'Откликнуться'}
      </button>
    </form>
  )
}
