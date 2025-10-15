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
import CancelExecutorButton from './CancelExecutorButton'

/* 💥 Форма открытия спора */
function DisputeForm({ taskId, onSuccess }: { taskId: string; onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Укажите причину спора')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, reason, details }),
      })
      if (res.ok) {
        setIsOpen(false)
        setReason('')
        setDetails('')
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as any)?.error || 'Ошибка при создании спора')
      }
    } catch (err) {
      console.error(err)
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen)
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded text-white transition"
      >
        ⚖️ Открыть спор
      </button>
    )

  return (
    <div>
      <textarea
        placeholder="Причина спора..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2"
      />
      <textarea
        placeholder="Дополнительные детали (опционально)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-3"
      />
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 rounded text-white disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 rounded text-gray-200"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

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

// Ссылка на профиль
function getUserProfileLink(currentUserId: string | undefined, targetUserId: string) {
  return currentUserId === targetUserId ? '/profile' : `/users/${targetUserId}`
}

export default function TaskDetailPageContent({ taskId }: { taskId: string }) {
  const { token, user } = useUser()
  const [task, setTask] = useState<any>(null)
  const [isCertChecking, setIsCertChecking] = useState(false)
  const [isCertified, setIsCertified] = useState(false)
  const [hasActive, setHasActive] = useState(false)
  const [loadingActive, setLoadingActive] = useState(true)
  const [hintOpen, setHintOpen] = useState(false)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 💥 Спор
  const [hasDispute, setHasDispute] = useState(false)
  const [disputeInfo, setDisputeInfo] = useState<any>(null)

  const openHint = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setHintOpen(true)
  }
  const scheduleCloseHint = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setHintOpen(false), 350)
  }

  // Загружаем задачу
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

  // Проверяем спор по задаче
  useEffect(() => {
    if (!token) return
    const checkDispute = async () => {
      try {
        const res = await fetch(`/api/disputes/by-task/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setHasDispute(Boolean(data?.dispute))
        setDisputeInfo(data?.dispute || null)
      } catch (err) {
        console.error('Ошибка проверки спора:', err)
      }
    }
    checkDispute()
  }, [token, taskId])

  // Проверяем сертификацию и активную задачу (остальное без изменений)
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
  const subcategoryId: string | undefined = task?.subcategory?.id || task?.subcategoryId
  const subcategoryName: string | undefined = task?.subcategory?.name
  const minPrice: number = task?.subcategory?.minPrice ?? 0

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
        {task.title}
      </h1>

      <p className="text-gray-300 text-lg">{task.description}</p>

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

      {task.files?.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {task.files.map((file: any) => {
            const isImage = file.mimetype?.startsWith('image/')
            return (
              <div key={file.id}>
                {isImage ? (
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.filename}
                    className="max-w-xs max-h-64 rounded border border-gray-700"
                  />
                ) : (
                  <a
                    href={`/api/files/${file.id}`}
                    download={file.filename}
                    className="text-emerald-300 hover:underline"
                  >
                    📎 {file.filename} ({Math.round(file.size / 1024)} КБ)
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      <span
        className={`inline-block px-3 py-1 text-sm rounded-full shadow-md ${
          statusColors[task.status] || ''
        }`}
      >
        Статус: {getStatusName(task.status)}
      </span>

      {subcategoryName && (
        <p className="text-sm text-gray-400">
          Подкатегория:{' '}
          <span className="font-medium text-gray-200">{subcategoryName}</span>
          {minPrice > 0 && (
            <>
              {' '}
              • минимальная ставка:{' '}
              <span className="text-emerald-400 font-semibold">{minPrice} ₽</span>
            </>
          )}
        </p>
      )}

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

      <TaskActionsClient taskId={task.id} authorId={task.customerId} status={task.status} />

      {task.status === 'in_progress' && isCustomer && (
        <>
          <CompleteTaskButton taskId={task.id} authorId={task.customerId} />
          <CancelExecutorButton taskId={task.id} />
        </>
      )}

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

      {user?.role === 'executor' && task.status === 'open' && !task.executorId && (
        <>
          {loadingActive ? (
            <div className="mt-4 text-sm text-gray-400">Проверка доступности отклика…</div>
          ) : hasActive ? (
            <div className="mt-2 rounded border border-yellow-700 bg-yellow-900/30 text-yellow-300 px-3 py-2">
              У вас уже есть активная задача. Завершите её, чтобы откликнуться на новые.
            </div>
          ) : isCertChecking ? (
            <div className="mt-4 text-sm text-gray-400">Проверка сертификации…</div>
          ) : (
            <ResponseForm
              taskId={task.id}
              minPrice={minPrice}
              isCertified={isCertified}
              subcategoryId={subcategoryId}
              subcategoryName={subcategoryName}
            />
          )}
        </>
      )}

      {isCustomer && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-emerald-300 mb-4">Отклики</h2>
          {task.responses.length === 0 ? (
            <p className="text-gray-500 italic">Пока нет откликов</p>
          ) : (
            task.responses.map((response: any) => (
              <div
                key={response.id}
                className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <p className="font-semibold text-emerald-400">
                  <Link
                    href={getUserProfileLink(user?.id, response.user.id)}
                    className="hover:underline"
                  >
                    {response.user.fullName || response.user.email}
                  </Link>
                </p>
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
            ))
          )}
        </div>
      )}

      {canChat && (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <h2 className="text-lg font-semibold text-emerald-300 mb-2">Чат по задаче</h2>
          <ChatBox taskId={task.id} />
        </div>
      )}

      {/* ⚖️ Отображение статуса спора */}
{hasDispute && disputeInfo?.status === "open" && (
  <div className="mt-6 p-5 rounded-xl bg-yellow-900/20 border border-yellow-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.1)]">
    <h2 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
      ⚖️ Спор на рассмотрении
    </h2>
    <p className="text-gray-300 leading-relaxed">
      Администратор изучает материалы по задаче.  
      Пожалуйста, ожидайте решения — как только оно будет принято, вы увидите его здесь.
    </p>
  </div>
)}

{hasDispute && disputeInfo?.status === "resolved" && (
  <div className="mt-6 p-5 rounded-xl bg-emerald-900/20 border border-emerald-600/40 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.25)]">
    <h2 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
      ✅ Решение администратора
    </h2>

    <p className="text-gray-200 mb-1">
      Спор решён{" "}
      <span className="font-semibold text-emerald-400">
        {disputeInfo.adminDecision === "customer"
          ? "в пользу заказчика"
          : "в пользу исполнителя"}
      </span>
    </p>

    {disputeInfo.resolution ? (
      <blockquote className="text-gray-300 italic border-l-4 border-emerald-500/60 pl-3 mt-2">
        «{disputeInfo.resolution}»
      </blockquote>
    ) : (
      <p className="text-gray-500 italic mt-2">
        Комментарий администратора отсутствует.
      </p>
    )}

    <p className="text-xs text-gray-500 mt-3 italic">
      Система автоматически обновила статус задачи на основании решения администратора.
    </p>
  </div>
)}

{hasDispute && disputeInfo?.status === "rejected" && (
  <div className="mt-6 p-5 rounded-xl bg-red-900/20 border border-red-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]">
    <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
      ❌ Спор отклонён
    </h2>
    <p className="text-gray-300 leading-relaxed">
      Администратор отклонил спор.  
      Решение считается окончательным.
    </p>
  </div>
)}


      <Link href="/tasks" className="mt-6 inline-block text-emerald-400 hover:underline">
        ← Назад к задачам
      </Link>
    </div>
  )
}
