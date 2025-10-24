'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import AssignExecutorButton from './AssignExecutorButton'
import CancelExecutorButton from './CancelExecutorButton'
import ChatBox from './ChatBox'
import CompleteTaskButton from './CompleteTaskButton'
import ResponseForm from './ResponseForm'
import ReviewForm from './ReviewForm'
import TaskActionsClient from './TaskActionsClient'

function DisputeForm({
	taskId,
	onSuccess,
	token,
}: {
	taskId: string
	onSuccess: () => void
	token: string
}) {
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
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ taskId, reason, details }),
			})
			if (res.ok) {
				setIsOpen(false)
				setReason('')
				setDetails('')
				// Добавляем небольшую задержку перед обновлением состояния
				setTimeout(() => {
					onSuccess()
				}, 100)
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
				className='px-4 py-2 bg-red-700 hover:bg-red-800 rounded text-white transition'
			>
				⚖️ Открыть спор
			</button>
		)

	return (
		<div>
			<textarea
				placeholder='Причина спора...'
				value={reason}
				onChange={e => setReason(e.target.value)}
				className='w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2'
			/>
			<textarea
				placeholder='Дополнительные детали (опционально)'
				value={details}
				onChange={e => setDetails(e.target.value)}
				className='w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-3'
			/>
			{error && <p className='text-red-400 text-sm mb-2'>{error}</p>}
			<div className='flex gap-2'>
				<button
					onClick={handleSubmit}
					disabled={loading}
					className='px-4 py-2 bg-green-700 hover:bg-green-800 rounded text-white disabled:opacity-50'
				>
					{loading ? 'Отправка...' : 'Отправить'}
				</button>
				<button
					onClick={() => setIsOpen(false)}
					className='px-4 py-2 bg-gray-700 hover:bg-gray-800 rounded text-gray-200'
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

// Профиль
function getUserProfileLink(
	currentUserId: string | undefined,
	targetUserId: string
) {
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
	// ✅ Спор
	const [hasDispute, setHasDispute] = useState(false)
	const [disputeInfo, setDisputeInfo] = useState<any>(null)

	const loadDispute = async () => {
		if (!token) return
		try {
			const res = await fetch(`/api/disputes/by-task/${taskId}`, {
				headers: { Authorization: `Bearer ${token}` },
				cache: 'no-store',
			})
			if (res.ok) {
				const data = await res.json()
				setHasDispute(Boolean(data?.dispute))
				setDisputeInfo(data?.dispute)
			}
		} catch (err) {
			console.error('Ошибка загрузки спора:', err)
		}
	}

	useEffect(() => {
		loadDispute()
	}, [taskId, token])

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

	if (!task)
		return <p className='text-center mt-10 text-gray-400'>Загрузка задачи...</p>

	const isExecutor = user?.id === task.executorId
	const isCustomer = user?.id === task.customerId
	const canChat = task.executor && (isExecutor || isCustomer)

	const needCertification = Boolean(
		task?.subcategory?.id || task?.subcategoryId
	)
	const subcategoryId: string | undefined =
		task?.subcategory?.id || task?.subcategoryId
	const subcategoryName: string | undefined = task?.subcategory?.name
	const minPrice: number = task?.subcategory?.minPrice ?? 0

	return (
		<div className='max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in'>
			{/* Главная карточка задачи */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-sm hover:shadow-[0_0_60px_rgba(16,185,129,0.4)] transition-all duration-500 group'>
				{/* Декоративные элементы */}
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700' />
				<div className='absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-700' />

				<div className='relative p-6 md:p-8 space-y-4 md:space-y-6'>
					{/* Заголовок с иконкой */}
					<div className='flex items-start gap-4'>
						<div className='flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg'>
							<span className='text-2xl'>📋</span>
						</div>
						<div className='flex-1'>
							<h1 className='text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight'>
								{task.title}
							</h1>
							<div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400'>
								<div className='flex items-center gap-2'>
									<span className='w-2 h-2 rounded-full bg-emerald-400'></span>
									<span>Автор</span>
									<Link
										href={getUserProfileLink(user?.id, task.customer.id)}
										className='text-emerald-400 hover:text-emerald-300 font-medium transition-colors'
									>
										{task.customer?.fullName || 'Без имени'}
									</Link>
								</div>
								<div className='flex items-center gap-2'>
									<span className='text-gray-500'>•</span>
									<span>
										📅 {new Date(task.createdAt).toLocaleDateString('ru-RU')}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Описание */}
					<div className='bg-black/30 rounded-xl p-4 md:p-6 border border-gray-700/50'>
						<h3 className='text-base md:text-lg font-semibold text-emerald-300 mb-3 flex items-center gap-2'>
							<span>📝</span>
							Описание задачи
						</h3>
						<p className='text-gray-200 text-base md:text-lg leading-relaxed'>
							{task.description}
						</p>
					</div>
				</div>
			</div>

			{/* Информационная панель */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{/* Статус */}
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] group'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
							<span className='text-sm'>📊</span>
						</div>
						<h3 className='text-lg font-semibold text-emerald-300'>Статус</h3>
					</div>
					<span
						className={`inline-block px-4 py-2 text-sm rounded-full font-medium ${
							statusColors[task.status] || ''
						}`}
					>
						{getStatusName(task.status)}
					</span>
				</div>

				{/* Подкатегория */}
				{subcategoryName && (
					<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] group'>
						<div className='flex items-center gap-3 mb-3'>
							<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center'>
								<span className='text-sm'>🏷️</span>
							</div>
							<h3 className='text-lg font-semibold text-blue-300'>Категория</h3>
						</div>
						<p className='text-gray-200 font-medium mb-2'>{subcategoryName}</p>
						{minPrice > 0 && (
							<p className='text-emerald-400 font-semibold text-sm'>
								💰 Мин. ставка: {minPrice} ₽
							</p>
						)}
					</div>
				)}

				{/* Исполнитель */}
				{task.executor && (
					<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(147,51,234,0.2)] group'>
						<div className='flex items-center gap-3 mb-3'>
							<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center'>
								<span className='text-sm'>👤</span>
							</div>
							<h3 className='text-lg font-semibold text-purple-300'>
								Исполнитель
							</h3>
						</div>
						<Link
							href={getUserProfileLink(user?.id, task.executor.id)}
							className='text-emerald-400 hover:text-emerald-300 font-medium transition-colors'
						>
							{task.executor.fullName || task.executor.email}
						</Link>
					</div>
				)}
			</div>

			{/* Файлы */}
			{task.files?.length > 0 && (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-gray-500/20 hover:border-gray-400/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(107,114,128,0.1)]'>
					<div className='flex items-center gap-3 mb-4'>
						<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center'>
							<span className='text-sm'>📎</span>
						</div>
						<h3 className='text-lg font-semibold text-gray-300'>
							Прикрепленные файлы
						</h3>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{task.files.map((file: any) => {
							const isImage = file.mimetype?.startsWith('image/')
							return (
								<div
									key={file.id}
									className='bg-black/30 rounded-lg p-3 md:p-4 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg'
								>
									{isImage ? (
										<div className='space-y-3'>
											<img
												src={`/api/files/${file.id}`}
												alt={file.filename}
												className='w-full max-h-48 object-cover rounded-lg border border-gray-600/50'
											/>
											<p className='text-sm text-gray-300 font-medium'>
												{file.filename}
											</p>
										</div>
									) : (
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
												<span className='text-lg'>📄</span>
											</div>
											<div className='flex-1'>
												<a
													href={`/api/files/${file.id}`}
													download={file.filename}
													className='text-emerald-300 hover:text-emerald-200 font-medium transition-colors block'
												>
													{file.filename}
												</a>
												<p className='text-xs text-gray-400'>
													{Math.round(file.size / 1024)} КБ
												</p>
											</div>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* Действия */}
			<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
						<span className='text-sm'>⚡</span>
					</div>
					<h3 className='text-lg font-semibold text-emerald-300'>Действия</h3>
				</div>
				<div className='space-y-4'>
					<TaskActionsClient
						taskId={task.id}
						authorId={task.customerId}
						status={task.status}
					/>

					{task.status === 'in_progress' && isCustomer && (
						<div className='flex flex-wrap gap-3'>
							<CompleteTaskButton taskId={task.id} authorId={task.customerId} />
							<CancelExecutorButton taskId={task.id} />
						</div>
					)}
				</div>
			</div>

{/* 🟢 Блок отзывов */}
{task.status === 'completed' && (
  <div className='space-y-6'>

    {/* ==== Уже оставленный отзыв (только тот, который адресован текущему пользователю) ==== */}
    {task.review
      ?.filter((r: any) => r.toUserId === user?.id)
      .map((review: any) => (
        <div
          key={review.id}
          className='bg-gradient-to-br from-black/50 to-zinc-900/30 rounded-xl p-4 md:p-6 border border-yellow-400/25 hover:border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-all duration-300'
        >
          <div className='flex items-center gap-3 mb-3'>
            <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 flex items-center justify-center'>
              <span className='text-sm text-black'>⭐</span>
            </div>
            <h3 className='text-lg font-semibold text-emerald-300'>
              Отзыв {review.fromUserId === task.customerId ? 'заказчика' : 'исполнителя'}
            </h3>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xl text-yellow-400'>⭐</span>
              <span className='text-lg font-bold text-yellow-400'>{review.rating}</span>
              <span className='text-gray-400 text-sm'>/ 5</span>
            </div>

            <p className='text-gray-200 text-base leading-relaxed italic'>
              “{review.comment || 'Без комментария'}”
            </p>

            <div className='flex items-center justify-between text-sm text-gray-500'>
              <span>📅 {new Date(review.createdAt).toLocaleDateString('ru-RU')}</span>
              <span className='text-emerald-400'>
                👤 {review.fromUser?.fullName || 'Пользователь'}
              </span>
            </div>
          </div>
        </div>
      ))}

    {/* ==== Форма: заказчик -> отзыв исполнителю ==== */}
    {isCustomer &&
      !task.review?.some((r: any) => r.fromUserId === user?.id) && (
        <div className='bg-gradient-to-br from-black/50 to-zinc-900/30 rounded-xl p-4 md:p-6 border border-yellow-400/25 hover:border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-all duration-300'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 flex items-center justify-center'>
              <span className='text-sm text-black'>⭐</span>
            </div>
            <h3 className='text-lg font-semibold text-emerald-300'>
              Оставить отзыв исполнителю
            </h3>
          </div>
          <ReviewForm taskId={task.id} />
        </div>
      )}

    {/* ==== Форма: исполнитель -> отзыв заказчику ==== */}
    {isExecutor &&
      !isCustomer &&
      !task.review?.some((r: any) => r.fromUserId === user?.id) && (
        <div className='bg-gradient-to-br from-black/50 to-zinc-900/30 rounded-xl p-4 md:p-6 border border-yellow-400/25 hover:border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-all duration-300'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 flex items-center justify-center'>
              <span className='text-sm text-black'>⭐</span>
            </div>
            <h3 className='text-lg font-semibold text-emerald-300'>
              Оставить отзыв заказчику
            </h3>
          </div>
          <ReviewForm taskId={task.id} />
        </div>
      )}
  </div>
)}





			{/* Форма отклика */}
			{user?.role === 'executor' &&
				task.status === 'open' &&
				!task.executorId && (
					<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
								<span className='text-sm'>✍️</span>
							</div>
							<h3 className='text-lg font-semibold text-emerald-300'>
								Откликнуться на задачу
							</h3>
						</div>

						{loadingActive ? (
							<div className='flex items-center gap-3 text-gray-400'>
								<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
								<span>Проверка доступности отклика…</span>
							</div>
						) : hasActive ? (
							<div className='bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4'>
								<div className='flex items-center gap-3 text-yellow-300'>
									<span className='text-lg'>⚠️</span>
									<span>
										У вас уже есть активная задача. Завершите её, чтобы
										откликнуться на новые.
									</span>
								</div>
							</div>
						) : isCertChecking ? (
							<div className='flex items-center gap-3 text-gray-400'>
								<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
								<span>Проверка сертификации…</span>
							</div>
						) : (
							<ResponseForm
								taskId={task.id}
								minPrice={minPrice}
								isCertified={isCertified}
								subcategoryId={subcategoryId}
								subcategoryName={subcategoryName}
							/>
						)}
					</div>
				)}

			{/* Отклики */}
			{isCustomer && (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
							<span className='text-sm'>💬</span>
						</div>
						<h3 className='text-lg font-semibold text-emerald-300'>
							Отклики исполнителей
						</h3>
						<span className='bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full text-sm font-medium'>
							{task.responses.length}
						</span>
					</div>

					{task.responses.length === 0 ? (
						<div className='text-center py-8'>
							<div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center'>
								<span className='text-2xl text-gray-500'>💭</span>
							</div>
							<p className='text-gray-500 text-lg'>Пока нет откликов</p>
							<p className='text-gray-600 text-sm mt-1'>
								Исполнители смогут откликнуться на вашу задачу
							</p>
						</div>
					) : (
						<div className='space-y-4'>
							{task.responses.map((response: any) => (
								<div
									key={response.id}
									className='bg-black/30 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:scale-[1.02]'
								>
									<div className='flex items-start justify-between mb-4'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
												<span className='text-lg'>👤</span>
											</div>
											<div>
												<Link
													href={getUserProfileLink(user?.id, response.user.id)}
													className='text-emerald-400 hover:text-emerald-300 font-semibold text-lg transition-colors'
												>
													{response.user.fullName || response.user.email}
												</Link>
												<p className='text-sm text-gray-400'>
													📅{' '}
													{new Date(response.createdAt).toLocaleDateString(
														'ru-RU'
													)}
												</p>
											</div>
										</div>
										{response.price && (
											<div className='bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-semibold'>
												💰 {response.price} ₽
											</div>
										)}
									</div>

									{response.message && (
										<div className='bg-black/20 rounded-lg p-3 md:p-4 mb-4'>
											<p className='text-gray-200 leading-relaxed'>
												{response.message}
											</p>
										</div>
									)}

									{task.status === 'open' && isCustomer && (
										<div className='flex justify-end'>
											<AssignExecutorButton
												taskId={task.id}
												executorId={response.userId}
												currentUserId={user?.id}
											/>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Чат по задаче */}
			{canChat && (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
					<div className='flex items-center gap-3 mb-4'>
						<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
							<span className='text-sm'>💬</span>
						</div>
						<h3 className='text-lg font-semibold text-emerald-300'>
							Чат по задаче
						</h3>
					</div>
					<ChatBox taskId={task.id} />
				</div>
			)}

			{/* ⚖️ Отображение статуса спора */}
			{hasDispute && disputeInfo?.status === 'open' && (
				<div className='mt-6 p-5 rounded-xl bg-yellow-900/20 border border-yellow-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.1)]'>
					<h2 className='text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2'>
						⚖️ Спор на рассмотрении
					</h2>
					<p className='text-gray-300 leading-relaxed'>
						Администратор изучает материалы по задаче. Пожалуйста, ожидайте
						решения — как только оно будет принято, вы увидите его здесь.
					</p>
				</div>
			)}

			{hasDispute && disputeInfo?.status === 'resolved' && (
				<div className='mt-6 p-5 rounded-xl bg-emerald-900/20 border border-emerald-600/40 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.25)]'>
					<h2 className='text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2'>
						✅ Решение администратора
					</h2>
					<p className='text-gray-200 mb-1'>
						Спор решён{' '}
						<span className='font-semibold text-emerald-400'>
							{disputeInfo.adminDecision === 'customer'
								? 'в пользу заказчика'
								: 'в пользу исполнителя'}
						</span>
					</p>
					{disputeInfo.resolution ? (
						<blockquote className='text-gray-300 italic border-l-4 border-emerald-500/60 pl-3 mt-2'>
							«{disputeInfo.resolution}»
						</blockquote>
					) : (
						<p className='text-gray-500 italic mt-2'>
							Комментарий администратора отсутствует.
						</p>
					)}
					<p className='text-xs text-gray-500 mt-3 italic'>
						Система автоматически обновила статус задачи на основании решения
						администратора.
					</p>
				</div>
			)}

			{hasDispute && disputeInfo?.status === 'rejected' && (
				<div className='mt-6 p-5 rounded-xl bg-red-900/20 border border-red-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]'>
					<h2 className='text-lg font-semibold text-red-400 mb-2 flex items-center gap-2'>
						❌ Спор отклонён
					</h2>
					<p className='text-gray-300 leading-relaxed'>
						Администратор отклонил спор. Решение считается окончательным.
					</p>
				</div>
			)}

			{/* 💥 Кнопка открытия спора */}
			{!hasDispute &&
				task.status === 'completed' &&
				(isCustomer || isExecutor) && (
					<div className='mt-6 bg-black/40 p-5 rounded-xl border border-red-800/40'>
						<h3 className='text-lg font-semibold text-red-400 mb-3'>
							Возникла проблема?
						</h3>
						<DisputeForm
							taskId={task.id}
							onSuccess={loadDispute}
							token={token!}
						/>
					</div>
				)}

			{/* Навигация */}
			<div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-6 border-t border-gray-700/50'>
				<Link
					href='/tasks'
					className='inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors group'
				>
					<span className='group-hover:-translate-x-1 transition-transform'>
						←
					</span>
					<span>Назад к задачам</span>
				</Link>

				<div className='text-sm text-gray-500'>
					ID задачи:{' '}
					<span className='font-mono text-emerald-400'>{task.id}</span>
				</div>
			</div>
		</div>
	)
}
