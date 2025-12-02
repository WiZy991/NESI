'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { DisputeForm } from './TaskDetailPageContent/DisputeForm'
import { DisputeStatus } from './TaskDetailPageContent/DisputeStatus'
import { TaskHeader } from './TaskDetailPageContent/TaskHeader'
import { TaskInfoPanel } from './TaskDetailPageContent/TaskInfoPanel'
import { TaskFiles } from './TaskDetailPageContent/TaskFiles'
import { ReviewSection } from './TaskDetailPageContent/ReviewSection'
import { ResponsesSection } from './TaskDetailPageContent/ResponsesSection'
import { TaskActionsSection } from './TaskDetailPageContent/TaskActionsSection'
import { ResponseFormSection } from './TaskDetailPageContent/ResponseFormSection'
import { ChatLinkButton } from './TaskDetailPageContent/ChatLinkButton'
import type { Task, DisputeInfo } from './TaskDetailPageContent/types'
import { TaskCardSkeleton, InfoPanelSkeleton } from './SkeletonLoader'
import ExecutorActivityWidget from './ExecutorActivityWidget'
import CancellationBanner from './CancellationBanner'

export default function TaskDetailPageContent({ taskId }: { taskId: string }) {
	const { token, user } = useUser()
	const [task, setTask] = useState<Task | null>(null)

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
	const [disputeInfo, setDisputeInfo] = useState<DisputeInfo | null>(null)
	const [showDisputeForm, setShowDisputeForm] = useState(false)

	const loadDispute = async () => {
		if (!token) return
		try {
			const { fetchWithRetry } = await import('@/lib/retry')
			const res = await fetchWithRetry(`/api/disputes/by-task/${taskId}`, {
				headers: { Authorization: `Bearer ${token}` },
				cache: 'no-store',
			}, {
				maxRetries: 2,
				retryDelay: 800,
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
				const { fetchWithRetry } = await import('@/lib/retry')
				const res = await fetchWithRetry(`/api/tasks/${taskId}`, {
					headers: { Authorization: `Bearer ${token}` },
				}, {
					maxRetries: 2,
					retryDelay: 1000,
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
				// Проверяем canTake вместо has - учитываем лимит по уровню
				if (!cancelled) setHasActive(!data?.canTake)
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
		return (
			<div className='max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8'>
				<TaskCardSkeleton />
				<InfoPanelSkeleton />
			</div>
		)

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

	const taskData: Task = task as Task

	return (
		<div className='max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in'>
			{/* Главная карточка задачи */}
			<TaskHeader task={taskData} currentUserId={user?.id} />

			{/* Плашка для исполнителя при запросе на отмену */}
			{isExecutor &&
				task.cancellationRequestedAt &&
				!hasDispute && (
					<CancellationBanner
						taskId={task.id}
						taskTitle={task.title}
						cancellationRequestedAt={task.cancellationRequestedAt}
						cancellationReason={task.cancellationReason}
						onResponse={() => {
							// Обновляем задачу после ответа
							const fetchTask = async () => {
								try {
									const { fetchWithRetry } = await import('@/lib/retry')
									const res = await fetchWithRetry(`/api/tasks/${taskId}`, {
										headers: { Authorization: `Bearer ${token}` },
									}, {
										maxRetries: 2,
										retryDelay: 1000,
									})
									const data = await res.json()
									setTask(data.task)
									loadDispute()
								} catch (err) {
									console.error('Ошибка загрузки задачи:', err)
								}
							}
							fetchTask()
						}}
						onDisputeClick={() => {
							// Открываем форму спора
							setShowDisputeForm(true)
						}}
					/>
				)}

			{/* Информационная панель */}
			<TaskInfoPanel task={taskData} />

			{/* Файлы */}
			{task.files && task.files.length > 0 && (
				<TaskFiles files={task.files} />
			)}

			{/* Действия - только для создателя задачи */}
			<TaskActionsSection task={taskData} isCustomer={isCustomer} disputeInfo={disputeInfo} />

			{/* Активность исполнителя - только для заказчика */}
			{isCustomer && task.executorId && (
				<ExecutorActivityWidget
					taskId={task.id}
					executorId={task.executorId}
					isCustomer={isCustomer}
				/>
			)}

			{/* 🟢 Блок отзывов */}
			<ReviewSection
				task={taskData}
				currentUserId={user?.id}
				isCustomer={isCustomer}
				isExecutor={isExecutor}
				disputeInfo={disputeInfo}
			/>

			{/* Форма отклика */}
			{user?.role === 'executor' &&
				task.status === 'open' &&
				!task.executorId && (
					<ResponseFormSection
						taskId={task.id}
						minPrice={minPrice}
						isCertified={isCertified}
						subcategoryId={subcategoryId}
						subcategoryName={subcategoryName}
						loadingActive={loadingActive}
						hasActive={hasActive}
						isCertChecking={isCertChecking}
					/>
				)}

			{/* Отклики */}
			<ResponsesSection
				task={taskData}
				currentUserId={user?.id}
				isCustomer={isCustomer}
			/>

			{/* Кнопка перехода в чат по задаче */}
			{canChat && (
				<ChatLinkButton taskId={task.id} isCustomer={isCustomer} />
			)}

			{/* ⚖️ Отображение статуса спора */}
			{hasDispute && disputeInfo && (
				<DisputeStatus disputeInfo={disputeInfo} />
			)}

		{/* 💥 Кнопка открытия спора */}
		{!hasDispute && (isCustomer || isExecutor) && task.status === 'in_progress' && (
			<div className='mt-6 bg-black/40 p-5 rounded-xl border border-red-800/40 hover:border-red-700/50 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]'>
				<h3 className='text-lg font-semibold text-red-400 mb-3 flex items-center gap-2'>
					<span className='text-xl'>⚠️</span>
					Возникла проблема?
				</h3>
				<p className='text-gray-400 text-sm mb-4'>
					Если возникли сложности с выполнением задачи, вы можете открыть
					спор. Администратор рассмотрит ситуацию и примет решение.
				</p>
				<DisputeForm
					taskId={task.id}
					onSuccess={() => {
						loadDispute()
						setShowDisputeForm(false)
					}}
					token={token!}
					forceOpen={showDisputeForm}
					onClose={() => setShowDisputeForm(false)}
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
