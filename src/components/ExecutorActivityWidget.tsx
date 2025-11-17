'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

interface ExecutorActivity {
	status: 'online' | 'recent' | 'away' | 'offline'
	message: string
	lastActivityAt: string | null
	lastMessageAt: string | null
	hasRecentMessages: boolean
	hasRecentUpdates: boolean
	recentMessages: Array<{
		id: string
		preview: string
		createdAt: string
	}>
	executorNote: string | null
	plannedStart: string | null
	plannedDeadline: string | null
}

interface ExecutorActivityWidgetProps {
	taskId: string
	executorId: string | null
	isCustomer: boolean
}

export default function ExecutorActivityWidget({
	taskId,
	executorId,
	isCustomer,
}: ExecutorActivityWidgetProps) {
	const { token } = useUser()
	const [activity, setActivity] = useState<ExecutorActivity | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!token || !isCustomer || !executorId) {
			setLoading(false)
			return
		}

		const fetchActivity = async () => {
			try {
				const res = await fetch(`/api/tasks/${taskId}/executor-activity`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (!res.ok) {
					throw new Error('Ошибка загрузки активности')
				}

				const data = await res.json()
				if (data.hasExecutor && data.activity) {
					setActivity(data.activity)
				}
			} catch (err) {
				console.error('Ошибка загрузки активности исполнителя:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchActivity()

		// Обновляем активность каждые 30 секунд
		const interval = setInterval(fetchActivity, 30000)

		return () => clearInterval(interval)
	}, [token, taskId, executorId, isCustomer])

	if (!isCustomer || !executorId || loading) {
		return null
	}

	if (!activity) {
		return null
	}

	const getStatusColor = () => {
		switch (activity.status) {
			case 'online':
				return 'bg-emerald-500'
			case 'recent':
				return 'bg-blue-500'
			case 'away':
				return 'bg-yellow-500'
			case 'offline':
				return 'bg-gray-500'
			default:
				return 'bg-gray-500'
		}
	}

	const getStatusTextColor = () => {
		switch (activity.status) {
			case 'online':
				return 'text-emerald-400'
			case 'recent':
				return 'text-blue-400'
			case 'away':
				return 'text-yellow-400'
			case 'offline':
				return 'text-gray-400'
			default:
				return 'text-gray-400'
		}
	}

	return (
		<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
			<h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
				<span>📊</span>
				Активность исполнителя
			</h3>

			{/* Статус активности */}
			<div className="mb-4">
				<div className="flex items-center gap-3 mb-2">
					<div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
					<span className={`font-medium ${getStatusTextColor()}`}>
						{activity.message}
					</span>
				</div>
				{activity.lastActivityAt && (
					<div className="text-sm text-gray-400 ml-6">
						Последняя активность:{' '}
						{new Date(activity.lastActivityAt).toLocaleString('ru-RU')}
					</div>
				)}
			</div>

			{/* Недавние сообщения */}
			{activity.hasRecentMessages && activity.recentMessages.length > 0 && (
				<div className="mb-4">
					<div className="text-sm font-medium text-emerald-300 mb-2">
						Недавние сообщения:
					</div>
					<div className="space-y-2">
						{activity.recentMessages.slice(0, 3).map(msg => (
							<div
								key={msg.id}
								className="bg-black/40 border border-emerald-700/30 rounded-lg p-3 text-sm"
							>
								<div className="text-gray-300 mb-1">
									{msg.preview.length > 100
										? msg.preview.substring(0, 100) + '...'
										: msg.preview}
								</div>
								<div className="text-xs text-gray-500">
									{new Date(msg.createdAt).toLocaleString('ru-RU')}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Заметка исполнителя */}
			{activity.executorNote && (
				<div className="mb-4">
					<div className="text-sm font-medium text-emerald-300 mb-2">
						Заметка исполнителя:
					</div>
					<div className="bg-black/40 border border-emerald-700/30 rounded-lg p-3 text-sm text-gray-300">
						{activity.executorNote}
					</div>
				</div>
			)}

			{/* Планируемые даты */}
			{(activity.plannedStart || activity.plannedDeadline) && (
				<div className="mb-4">
					<div className="text-sm font-medium text-emerald-300 mb-2">
						Планируемые даты:
					</div>
					<div className="space-y-1 text-sm text-gray-400">
						{activity.plannedStart && (
							<div>
								Начало:{' '}
								<span className="text-emerald-300">
									{new Date(activity.plannedStart).toLocaleDateString('ru-RU')}
								</span>
							</div>
						)}
						{activity.plannedDeadline && (
							<div>
								Дедлайн:{' '}
								<span className="text-emerald-300">
									{new Date(activity.plannedDeadline).toLocaleDateString('ru-RU')}
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Индикатор недавних обновлений */}
			{activity.hasRecentUpdates && (
				<div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
					<div className="text-sm text-blue-300 flex items-center gap-2">
						<span>🔄</span>
						Исполнитель недавно обновил задачу
					</div>
				</div>
			)}
		</div>
	)
}

