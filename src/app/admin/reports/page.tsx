'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import { AlertTriangle, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminReportsPage() {
	const { confirm, Dialog } = useConfirm()
	const [reports, setReports] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	// 🔹 Загружаем жалобы
	const fetchReports = async () => {
		try {
			const res = await fetch('/api/admin/reports', { cache: 'no-store' })
			const data = await res.json()

			if (!res.ok) throw new Error(data.error || 'Ошибка')
			setReports(data.reports || [])
		} catch (err: any) {
			console.error('Ошибка загрузки жалоб:', err)
			setError('Ошибка загрузки жалоб')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchReports()
	}, [])

	// 🔹 Удаление поста, комментария или задачи
	const handleDelete = async (report: any) => {
		const typeName = report.type === 'post' ? 'пост' : report.type === 'comment' ? 'комментарий' : 'задачу'
		
		// Определяем ID объекта
		let targetId = null
		if (report.type === 'post') {
			targetId = report.post?.id
		} else if (report.type === 'comment') {
			targetId = report.comment?.id
		} else if (report.type === 'task') {
			targetId = report.task?.id
		}

		console.log('🗑️ Удаление:', { type: report.type, id: targetId, report })

		if (!targetId) {
			toast.error(`Ошибка: не найден ID для ${typeName}`)
			return
		}

		await confirm({
			title: `Удаление ${typeName}`,
			message: `Вы уверены, что хотите удалить этот ${typeName}? Это действие нельзя отменить.`,
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				try {
					const res = await fetch('/api/admin/reports', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: report.type,
							id: targetId,
						}),
					})

					const data = await res.json()
					if (!res.ok) throw new Error(data.error || 'Ошибка удаления')

					toast.success(data.message || 'Удалено')
					await fetchReports()
				} catch (err: any) {
					toast.error('Ошибка при удалении: ' + err.message)
				}
			},
		})
	}

	if (loading)
		return <p className='text-gray-400 animate-pulse p-6'>Загрузка жалоб...</p>

	if (error) return <p className='text-red-500 p-6'>{error}</p>

	if (!reports.length)
		return (
			<div className='p-6 text-gray-400'>
				Жалоб пока нет — значит всё спокойно 😎
			</div>
		)

	return (
		<div className='text-gray-100'>
			<div className='mb-6'>
				<h2 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2'>
					<AlertTriangle className='w-8 h-8 text-emerald-400' /> Жалобы
					пользователей
				</h2>
				<p className='text-gray-400 text-sm'>Всего жалоб: {reports.length}</p>
			</div>

			<div className='space-y-4'>
				{reports.map(r => (
					<Card
						key={r.id}
						className={`bg-black/40 border shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition ${
							r.type === 'task' 
								? 'border-orange-500/20 hover:border-orange-500/30' 
								: 'border-emerald-500/20 hover:border-emerald-500/30'
						}`}
					>
						<CardContent className='p-4 space-y-2'>
							<div className='flex justify-between items-start'>
								<span className={`font-semibold ${
									r.type === 'task' ? 'text-orange-400' : 'text-emerald-300'
								}`}>
									{r.type === 'post' ? '📄 Пост' : r.type === 'comment' ? '💬 Комментарий' : '📋 Задача'}
								</span>
								<span className='text-xs text-gray-400'>
									{new Date(r.createdAt).toLocaleString('ru-RU')}
								</span>
							</div>

							{/* Информация о задаче */}
							{r.type === 'task' && r.task && (
								<div className='bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-1'>
									<p className='text-white font-medium'>{r.task.title}</p>
									<p className='text-xs text-gray-400'>
										Автор: {r.task.customer?.fullName || r.task.customer?.email || 'Неизвестно'}
									</p>
									<p className='text-xs text-gray-500'>
										Статус: <span className='text-emerald-400'>{r.task.status}</span>
									</p>
								</div>
							)}

							<p className='text-gray-200'>
								<b>Причина:</b> {r.reason}
							</p>

							{r.description && (
								<p className='text-gray-400 text-sm'>
									<b>Описание:</b> {r.description}
								</p>
							)}

							{/* 🔗 Переход на объект жалобы */}
							{r.targetLink && (
								<a
									href={r.targetLink}
									target='_blank'
									rel='noopener noreferrer'
									className='flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 underline'
								>
									<ExternalLink className='w-4 h-4' /> Перейти →
								</a>
							)}

							<div className='flex justify-between items-center pt-2 border-t border-gray-800 mt-2'>
								<p className='text-sm text-gray-400'>
									От: {r.reporter?.fullName || 'Неизвестный пользователь'} (
									{r.reporter?.email})
								</p>

								{/* 🗑 Кнопка удаления */}
								<button
									onClick={() => handleDelete(r)}
									className='flex items-center gap-1 text-red-400 hover:text-red-300 text-sm'
								>
									<Trash2 className='w-4 h-4' /> Удалить
								</button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			{Dialog}
		</div>
	)
}
