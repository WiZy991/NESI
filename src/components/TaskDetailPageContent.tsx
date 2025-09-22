'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import AssignExecutorButton from './AssignExecutorButton'
import TaskActionsClient from './TaskActionsClient'
import CompleteTaskButton from './CompleteTaskButton'
import ResponseForm from './ResponseForm'
import ChatBox from './ChatBox'
import ReviewForm from './ReviewForm'

// Цвета статусов
const statusColors: Record<string, string> = {
  open: 'bg-emerald-900/40 border border-emerald-500/50 text-emerald-300',
  in_progress: 'bg-yellow-900/40 border border-yellow-500/50 text-yellow-300',
  completed: 'bg-blue-900/40 border border-blue-500/50 text-blue-300',
  cancelled: 'bg-red-900/40 border border-red-500/50 text-red-300',
}

// Названия статусов
function getStatusName(status: string) {
  switch (status) {
    case 'open':
      return 'Открыта'
    case 'in_progress':
      return 'В работе'
    case 'completed':
      return 'Выполнена'
    case 'cancelled':
      return 'Отменена'
    default:
      return status
  }
}

// Профиль
function getUserProfileLink(currentUserId: string | undefined, targetUserId: string) {
  return currentUserId === targetUserId ? '/profile' : `/users/${targetUserId}`
}

export default function TaskDetailPageContent({ taskId }: { taskId: string }) {
  const { token, user } = useUser()
  const [task, setTask] = useState<any>(null)

  // Сертификация
  const [isCertChecking, setIsCertChecking] = useState(false)
  const [isCertified, setIsCertified] = useState(false)

  // 🔒 Флаг «есть активная задача у исполнителя»
  const [hasActive, setHasActive] = useState(false)
  const [loadingActive, setLoadingActive] = useState(true)

  // Управление плашкой сертификации
  const [hintOpen, setHintOpen] = useState(false)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const openHint = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setHintOpen(true)
  }
  const scheduleCloseHint = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setHintOpen(false), 350)
  }

  useEffect(() => {
    if (!token) return
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setTask(data.task)
      } catch (err) {
        console.error('Ошибка загрузки задачи:', err)
      }
    }
    fetchTask()
  }, [token, taskId])

  // Проверка наличия активной задачи у исполнителя
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token || !user || user.role !== 'executor') {
        setHasActive(false)
        setLoadingActive(false)
        return
      }
      setLoadingActive(true)
      try {
        const res = await fetch('/api/me/active-task', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        if (!cancelled) setHasActive(Boolean(data?.has))
      } catch {
        if (!cancelled) setHasActive(false)
      } finally {
        if (!cancelled) setLoadingActive(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token, user])

  // Проверка сертификации
  useEffect(() => {
    const check = async () => {
      if (!token || !user || user.role !== 'executor') return
      const subId = task?.subcategory?.id || task?.subcategoryId
      if (!subId) {
        setIsCertified(true)
        return
      }
      setIsCertChecking(true)
      try {
        const res = await fetch(`/api/cert/status?subcategoryId=${subId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setIsCertified(Boolean(data?.certified))
      } catch {
        setIsCertified(false)
      } finally {
        setIsCertChecking(false)
      }
    }
    check()
  }, [task, token, user])

  if (!task) return <p className="text-center mt-10 text-gray-400">Загрузка задачи...</p>

  const isExecutor = user?.id === task.executorId
  const isCustomer = user?.id === task.customerId
  const canChat = task.executor && (isExecutor || isCustomer)

  const needCertification = Boolean(task?.subcategory?.id || task?.subcategoryId)
  const subcategoryId: string | undefined = task?.subcategory?.id || task?.subcategoryId
  const subcategoryName: string | undefined = task?.subcategory?.name
  const minPrice: number = task?.subcategory?.minPrice ?? 0

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      {/* Заголовок */}
      <h1 className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
        {task.title}
      </h1>

      {/* Описание */}
      <p className="text-gray-300 text-lg">{task.description}</p>

      {/* Автор */}
      <p className="text-sm text-gray-400">
        Автор{' '}
        <Link
          href={getUserProfileLink(user?.id, task.customer.id)}
          className="text-emerald-400 hover:underline"
        >
          {task.customer?.fullName || 'Без имени'}
        </Link>{' '}
        — {new Date(task.createdAt).toLocaleDateString()}
      </p>

      {/* Статус */}
      <span
        className={`inline-block px-3 py-1 text-sm rounded-full shadow-md ${
          statusColors[task.status] || ''
        }`}
      >
        Статус: {getStatusName(task.status)}
      </span>

      {/* Подкатегория */}
      {subcategoryName && (
        <p className="text-sm text-gray-400">
          Подкатегория: <span className="font-medium text-gray-200">{subcategoryName}</span>
          {minPrice > 0 && (
            <> • минимальная ставка: <span className="text-emerald-400 font-semibold">{minPrice} ₽</span></>
          )}
        </p>
      )}

      {/* Исполнитель */}
      {task.executor && (
        <p className="text-sm text-emerald-300">
          Исполнитель{' '}
          <Link
            href={getUserProfileLink(user?.id, task.executor.id)}
            className="hover:underline font-medium"
          >
            {task.executor.fullName || task.executor.email}
          </Link>
        </p>
      )}

      {/* Кнопки действий */}
      <TaskActionsClient taskId={task.id} authorId={task.customerId} status={task.status} />

      {task.status === 'in_progress' && (
        <CompleteTaskButton taskId={task.id} authorId={task.customerId} />
      )}

      {/* Отзыв */}
      {task.status === 'completed' && task.review && (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <h2 className="text-lg font-semibold mb-2 text-emerald-300">Отзыв заказчика</h2>
          <p className="text-yellow-400 font-bold">⭐ {task.review.rating}</p>
          <p className="text-gray-200">{task.review.comment}</p>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(task.review.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {task.status === 'completed' && isCustomer && !task.review && (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-emerald-500/30">
          <h2 className="text-lg font-semibold mb-2 text-emerald-300">Оставить отзыв</h2>
          <ReviewForm taskId={task.id} />
        </div>
      )}

      {/* ====== ФОРМА ОТКЛИКА / ГЕЙТ СЕРТИФИКАЦИИ ====== */}
      {user?.role === 'executor' && task.status === 'open' && !task.executorId && (
        <>
          {loadingActive ? (
            <div className="mt-4 text-sm text-gray-400">Проверка доступности отклика…</div>
          ) : hasActive ? (
            <div className="mt-2 rounded border border-yellow-700 bg-yellow-900/30 text-yellow-300 px-3 py-2">
              У вас уже есть активная задача. Завершите её, чтобы откликнуться на новые.
            </div>
          ) : (
            <>
              {needCertification ? (
                isCertChecking ? (
                  <div className="mt-4 text-sm text-gray-400">Проверка сертификации…</div>
                ) : isCertified ? (
                  <ResponseForm taskId={task.id} minPrice={minPrice} />
                ) : (
                  <div
                    className="relative mt-2 inline-block"
                    onMouseEnter={openHint}
                    onMouseLeave={scheduleCloseHint}
                  >
                    <div className="opacity-60 select-none pointer-events-none">
                      <ResponseForm taskId={task.id} minPrice={minPrice} />
                    </div>
                    <div
                      className="absolute inset-0 z-10 cursor-not-allowed"
                      aria-hidden
                      onMouseEnter={openHint}
                      onMouseLeave={scheduleCloseHint}
                    />
                    {hintOpen && (
                      <div
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-20"
                        style={{ minWidth: 260 }}
                      >
                        <div className="rounded border border-gray-700 bg-gray-900 text-white text-sm px-3 py-2 shadow-lg">
                          Для отклика по этой задаче нужна сертификация
                          {subcategoryName ? <> по «{subcategoryName}»</> : ''}.
                          {subcategoryId && (
                            <>
                              {' '}
                              <Link
                                href={`/cert?subcategoryId=${subcategoryId}`}
                                className="text-blue-400 underline"
                              >
                                Пройти тест
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <ResponseForm taskId={task.id} minPrice={minPrice} />
              )}
            </>
          )}
        </>
      )}
      {/* ====== /ФОРМА ОТКЛИКА ====== */}

      {/* Отклики */}
      {isCustomer && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-emerald-300 mb-4">Отклики</h2>
          {task.responses.length === 0 ? (
            <p className="text-gray-500 italic">Пока нет откликов</p>
          ) : (
            task.responses.map((response: any) => {
              const reviews = response.user?.reviewsReceived || []
              const avgRating =
                reviews.length > 0
                  ? (
                      reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
                    ).toFixed(1)
                  : null

              return (
                <div
                  key={response.id}
                  className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition"
                >
                  <p className="font-semibold text-emerald-400">
                    <Link
                      href={getUserProfileLink(user?.id, response.user.id)}
                      className="hover:underline"
                    >
                      {response.user.fullName || response.user.email}
                    </Link>
                  </p>
                  {avgRating ? (
                    <p className="text-sm text-yellow-400">⭐ Рейтинг: {avgRating}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Нет отзывов</p>
                  )}
                  <p className="text-sm text-gray-400">
                    Отклик: {new Date(response.createdAt).toLocaleDateString()}
                  </p>
                  {response.price && (
                    <p className="text-sm text-emerald-300 font-medium">💰 {response.price} ₽</p>
                  )}
                  {response.message && <p className="text-gray-200 mt-1">{response.message}</p>}
                  {task.status === 'open' && isCustomer && (
                    <AssignExecutorButton
                      taskId={task.id}
                      executorId={response.userId}
                      currentUserId={user?.id}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Чат */}
      {canChat && (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <h2 className="text-lg font-semibold text-emerald-300 mb-2">Чат по задаче</h2>
          <ChatBox taskId={task.id} />
        </div>
      )}

      <Link href="/tasks" className="mt-6 inline-block text-emerald-400 hover:underline">
        ← Назад к задачам
      </Link>
    </div>
  )
}
