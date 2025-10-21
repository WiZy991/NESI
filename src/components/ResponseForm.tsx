'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'

export default function ResponseForm({
  taskId,
  minPrice = 0,
  isCertified = true,
  subcategoryId,
  subcategoryName,
}: {
  taskId: string
  minPrice?: number
  isCertified?: boolean
  subcategoryId?: string
  subcategoryName?: string
}) {
  const { token, user } = useUser()
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)

  // состояние отклика
  const [hasResponded, setHasResponded] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(true)

  // ====== Управление подсказкой (позиция как раньше — справа по центру) ======
  const [showTooltip, setShowTooltip] = useState(false)
  const [hoverTarget, setHoverTarget] = useState<'message' | 'price' | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  const safeShow = (target: 'message' | 'price') => {
    if (!isCertified) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setHoverTarget(target)
      setShowTooltip(true)
    }
  }
  const safeScheduleHide = () => {
    if (!isCertified) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setShowTooltip(false), 400)
    }
  }
  const tooltipEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setShowTooltip(true)
  }
  const tooltipLeave = () => {
    hideTimerRef.current = setTimeout(() => setShowTooltip(false), 300)
  }

  // ====== Проверка, есть ли уже отклик ======
  useEffect(() => {
    const checkResponse = async () => {
      if (!token || !user || user.role !== 'executor') {
        setLoadingCheck(false)
        return
      }
      try {
        const res = await fetch(`/api/tasks/${taskId}/my-response`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        setHasResponded(Boolean(data?.has))
      } catch (err) {
        console.error('Ошибка проверки отклика:', err)
      } finally {
        setLoadingCheck(false)
      }
    }
    checkResponse()
  }, [taskId, token, user])

  // ====== Отправка ======
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('Вы не авторизованы')
    if (!isCertified) return toast.error('Сначала пройдите сертификацию')
    if (!message || !price) return toast.error('Заполните сообщение и цену')

    const parsedPrice = parseInt(price)
    if (Number.isNaN(parsedPrice)) return toast.error('Некорректная цена')
    if (parsedPrice < minPrice)
      return toast.error(`Минимальная цена по категории — ${minPrice}₽`)

    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, price: parsedPrice }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return toast.error(data?.error || 'Ошибка при отклике')
      }

      toast.success('Отклик отправлен!')
      setHasResponded(true)
    } catch (err) {
      console.error('Ошибка сети:', err)
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  // ====== Рендер ======
  if (loadingCheck)
    return <div className="mt-4 text-sm text-gray-400">Проверка отклика...</div>

  if (hasResponded)
    return (
      <div className="mt-6 border-t border-gray-700 pt-4 text-center">
        <p className="text-emerald-400 font-semibold">✅ Вы откликнулись на задачу.</p>
      </div>
    )

  // компонент подсказки (позиция справа от активного поля)
  const Tooltip = () =>
    !isCertified &&
    showTooltip && (
      <div
        className="absolute top-1/2 left-full ml-2 -translate-y-1/2 w-72
                   bg-gray-900 border border-gray-700 text-gray-200 text-xs px-3 py-2
                   rounded shadow-lg z-20 transition-opacity duration-200"
        onMouseEnter={tooltipEnter}
        onMouseLeave={tooltipLeave}
      >
        Чтобы откликнуться на задачу, нужна сертификация по «{subcategoryName}». <br />
        <a
          href={`/cert?subcategoryId=${subcategoryId}`}
          className="underline text-blue-400 hover:text-blue-200"
        >
          Пройти тест →
        </a>
      </div>
    )

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t border-gray-700 pt-4 relative">
      <h2 className="text-lg font-semibold mb-2">Откликнуться</h2>

      {/* Комментарий */}
      <div
        className="relative inline-block w-full mb-2"
        onMouseEnter={() => safeShow('message')}
        onMouseLeave={safeScheduleHide}
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Комментарий"
          disabled={!isCertified}
          className={`w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm ${
            !isCertified ? 'cursor-not-allowed opacity-50' : ''
          }`}
        />
        {hoverTarget === 'message' && <Tooltip />}
      </div>

      {/* Цена */}
      <div
        className="relative inline-block w-full mb-2"
        onMouseEnter={() => safeShow('price')}
        onMouseLeave={safeScheduleHide}
      >
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Цена"
          disabled={!isCertified}
          className={`w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm ${
            !isCertified ? 'cursor-not-allowed opacity-50' : ''
          }`}
        />
        {hoverTarget === 'price' && <Tooltip />}
      </div>

      {minPrice > 0 && (
        <p className="text-sm text-gray-400 mb-2">
          💡 Минимальная цена по категории: <b>{minPrice}₽</b>
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !isCertified || (!!price && parseInt(price) < (minPrice || 0))}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Отправка...' : 'Откликнуться'}
      </button>
    </form>
  )
}
