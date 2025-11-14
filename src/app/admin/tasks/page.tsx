'use client'

import Link from 'next/link'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

const statusColors: Record<string, string> = {
	open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
	in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
	completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
	cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function AdminTasks() {
	const { confirm, Dialog } = useConfirm()
	const [tasks, setTasks] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState('all')

	useEffect(() => {
		const fetchTasks = async () => {
			const res = await fetch('/api/admin/tasks', { cache: 'no-store' })
			const data = await res.json()
			setTasks(data.tasks || [])
			setLoading(false)
		}
		fetchTasks()
	}, [])

	const handleDelete = async (id: string) => {
		await confirm({
			title: 'Удаление задачи',
			message: 'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
				if (res.ok) {
					toast.success('Задача удалена')
					location.reload()
				} else {
					toast.error('Ошибка при удалении задачи')
				}
			},
		})
	}

	const filteredTasks =
		filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

	if (loading)
		return <p className='text-gray-400 animate-pulse'>Загрузка задач...</p>

	return (
		<div>
			<div className='mb-6'>
				<h2 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2'>
					<span className='text-4xl'>📋</span>
					Управление задачами
				</h2>
				<p className='text-gray-400 text-sm'>Всего задач: {tasks.length}</p>
			</div>

			{/* Фильтры */}
			<div className='mb-6 flex gap-2 flex-wrap'>
				{['all', 'open', 'in_progress', 'completed', 'cancelled'].map(
					status => (
						<button
							key={status}
							onClick={() => setFilter(status)}
							className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
								filter === status
									? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
									: 'bg-black/40 text-gray-400 border border-gray-700 hover:border-emerald-500/30 hover:text-emerald-400'
							}`}
						>
							{status === 'all'
								? 'Все'
								: status === 'open'
								? 'Открыты'
								: status === 'in_progress'
								? 'В работе'
								: status === 'completed'
								? 'Завершены'
								: 'Отменены'}
						</button>
					)
				)}
			</div>

			{/* Таблица */}
			<div className='bg-black/40 border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
				<div className='overflow-x-auto'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='bg-emerald-900/20 border-b border-emerald-500/20'>
								<th className='p-4 text-left text-emerald-400 font-semibold'>
									ID
								</th>
								<th className='p-4 text-left text-emerald-400 font-semibold'>
									Название
								</th>
								<th className='p-4 text-center text-emerald-400 font-semibold'>
									Статус
								</th>
								<th className='p-4 text-left text-emerald-400 font-semibold'>
									Автор
								</th>
								<th className='p-4 text-center text-emerald-400 font-semibold'>
									Действия
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredTasks.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className='p-8 text-center text-gray-500 italic'
									>
										Нет задач для отображения
									</td>
								</tr>
							) : (
								filteredTasks.map(t => (
									<tr
										key={t.id}
										className='border-t border-gray-800 hover:bg-emerald-500/5 transition'
									>
										<td className='p-4 text-gray-400 font-mono text-xs'>
											{t.id.slice(0, 8)}...
										</td>
										<td className='p-4'>
											<Link
												href={`tasks/${t.id}`}
												className='text-gray-200 hover:text-emerald-400 transition font-medium'
											>
												{t.title}
											</Link>
										</td>
										<td className='p-4 text-center'>
											<span
												className={`inline-block px-3 py-1 rounded-lg text-xs font-medium border ${
													statusColors[t.status] ||
													'bg-gray-500/20 text-gray-400 border-gray-500/30'
												}`}
											>
												{t.status === 'open'
													? 'Открыта'
													: t.status === 'in_progress'
													? 'В работе'
													: t.status === 'completed'
													? 'Завершена'
													: 'Отменена'}
											</span>
										</td>
										<td className='p-4 text-gray-300 text-sm'>
											{t.customer?.email || '—'}
										</td>
										<td className='p-4 text-center space-x-2'>
											<Link
												href={`tasks/${t.id}`}
												className='inline-block px-3 py-1 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-xs transition'
											>
												👁 Открыть
											</Link>
											<button
												onClick={() => handleDelete(t.id)}
												className='px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-xs transition'
											>
												🗑 Удалить
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
			{Dialog}
		</div>
	)
}
