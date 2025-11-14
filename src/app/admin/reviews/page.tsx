'use client'

import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

export default function AdminReviews() {
	const { confirm, Dialog } = useConfirm()
	const [reviews, setReviews] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState('all')

	useEffect(() => {
		const fetchReviews = async () => {
			const res = await fetch('/api/admin/reviews', { cache: 'no-store' })
			const data = await res.json()
			setReviews(data.reviews || [])
			setLoading(false)
		}
		fetchReviews()
	}, [])

	const handleDelete = async (id: string) => {
		await confirm({
			title: 'Удаление отзыва',
			message: 'Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.',
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
				if (res.ok) {
					toast.success('Отзыв удалён')
					location.reload()
				} else {
					toast.error('Ошибка при удалении отзыва')
				}
			},
		})
	}

	const filteredReviews =
		filter === 'all'
			? reviews
			: filter === 'high'
			? reviews.filter(r => r.rating >= 4)
			: filter === 'low'
			? reviews.filter(r => r.rating <= 2)
			: reviews.filter(r => r.rating === 3)

	if (loading)
		return <p className='text-gray-400 animate-pulse'>Загрузка отзывов...</p>

	return (
		<div>
			<div className='mb-6'>
				<h2 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2'>
					<span className='text-4xl'>⭐</span>
					Управление отзывами
				</h2>
				<p className='text-gray-400 text-sm'>Всего отзывов: {reviews.length}</p>
			</div>

			{/* Фильтры */}
			<div className='mb-6 flex gap-2 flex-wrap'>
				{[
					{ key: 'all', label: 'Все' },
					{ key: 'high', label: '4-5 ⭐' },
					{ key: 'medium', label: '3 ⭐' },
					{ key: 'low', label: '1-2 ⭐' },
				].map(({ key, label }) => (
					<button
						key={key}
						onClick={() => setFilter(key)}
						className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
							filter === key
								? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
								: 'bg-black/40 text-gray-400 border border-gray-700 hover:border-emerald-500/30 hover:text-emerald-400'
						}`}
					>
						{label}
					</button>
				))}
			</div>

			{/* Список отзывов */}
			<div className='space-y-4'>
				{filteredReviews.length === 0 ? (
					<div className='p-8 text-center text-gray-500 italic bg-black/40 border border-emerald-500/20 rounded-xl'>
						Нет отзывов для отображения
					</div>
				) : (
					filteredReviews.map(r => (
						<div
							key={r.id}
							className='bg-black/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/30 transition shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
						>
							<div className='flex items-start justify-between mb-3'>
								{/* Рейтинг */}
								<div className='flex items-center gap-2'>
									<div className='flex'>
										{[1, 2, 3, 4, 5].map(star => (
											<span
												key={star}
												className={`text-xl ${
													star <= r.rating ? 'text-yellow-400' : 'text-gray-600'
												}`}
											>
												⭐
											</span>
										))}
									</div>
									<span className='text-yellow-400 font-semibold text-lg'>
										{r.rating}/5
									</span>
								</div>

								{/* Дата */}
								<span className='text-xs text-gray-500'>
									{new Date(r.createdAt).toLocaleString('ru-RU')}
								</span>
							</div>

							{/* Комментарий */}
							<p className='text-gray-300 mb-4 leading-relaxed'>
								{r.comment || (
									<span className='text-gray-500 italic'>Без комментария</span>
								)}
							</p>

							{/* Инфо и действия */}
							<div className='flex items-center justify-between pt-3 border-t border-gray-700'>
								<div className='text-sm text-gray-400'>
									<span className='text-emerald-400'>От:</span>{' '}
									{r.fromUser?.fullName || r.fromUser?.email || 'Неизвестный'}
									{r.task && (
										<>
											{' '}
											<span className='text-gray-600'>→</span>{' '}
											<span className='text-emerald-400'>Задача:</span>{' '}
											{r.task.title}
										</>
									)}
								</div>

								<button
									onClick={() => handleDelete(r.id)}
									className='px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-xs transition flex items-center gap-1'
								>
									<span>🗑</span>
									Удалить
								</button>
							</div>
						</div>
					))
				)}
			</div>
			{Dialog}
		</div>
	)
}
