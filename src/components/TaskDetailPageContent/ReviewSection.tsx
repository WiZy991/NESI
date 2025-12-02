'use client'

import ReviewForm from '../ReviewForm'
import type { Task } from './types'

type ReviewSectionProps = {
	task: Task
	currentUserId?: string
	isCustomer: boolean
	isExecutor: boolean
	disputeInfo?: {
		status: 'open' | 'resolved' | 'rejected'
		adminDecision?: 'customer' | 'executor'
		resolution?: string | null
	} | null
}

export function ReviewSection({
	task,
	currentUserId,
	isCustomer,
	isExecutor,
	disputeInfo,
}: ReviewSectionProps) {
	if (task.status !== 'completed') {
		return null
	}

	// Проверяем, есть ли решенный спор
	const hasResolvedDispute = disputeInfo?.status === 'resolved'

	return (
		<div className='space-y-6'>
			{/* ==== Уже оставленный отзыв (только тот, который адресован текущему пользователю) ==== */}
			{task.review
				?.filter((r) => r.toUserId === currentUserId)
				.map((review) => (
					<div
						key={review.id}
						className='bg-gradient-to-br from-black/50 to-zinc-900/30 rounded-xl p-4 md:p-6 border border-yellow-400/25 hover:border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-all duration-300'
					>
						<div className='flex items-center gap-3 mb-3'>
							<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 flex items-center justify-center'>
								<span className='text-sm text-black'>⭐</span>
							</div>
							<h3 className='text-lg font-semibold text-emerald-300'>
								Отзыв{' '}
								{review.fromUserId === task.customerId
									? 'заказчика'
									: 'исполнителя'}
							</h3>
						</div>

						<div className='space-y-3'>
							<div className='flex items-center gap-2'>
								<span className='text-xl text-yellow-400'>⭐</span>
								<span className='text-lg font-bold text-yellow-400'>
									{review.rating}
								</span>
								<span className='text-gray-400 text-sm'>/ 5</span>
							</div>

							<p className='text-gray-200 text-base leading-relaxed italic'>
								"{review.comment || 'Без комментария'}"
							</p>

							<div className='flex items-center justify-between text-sm text-gray-500'>
								<span>
									📅{' '}
									{new Date(review.createdAt).toLocaleDateString('ru-RU')}
								</span>
								<span className='text-emerald-400'>
									👤 {review.fromUser?.fullName || 'Пользователь'}
								</span>
							</div>
						</div>
					</div>
				))}

			{/* ==== Форма: заказчик -> отзыв исполнителю ==== */}
			{isCustomer &&
				!task.review?.some((r) => r.fromUserId === currentUserId) &&
				!hasResolvedDispute && (
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
				!task.review?.some((r) => r.fromUserId === currentUserId) &&
				!hasResolvedDispute && (
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

			{/* ==== Сообщение о недоступности отзыва из-за спора ==== */}
			{hasResolvedDispute &&
				!task.review?.some((r) => r.fromUserId === currentUserId) && (
					<div className='bg-gradient-to-br from-red-900/20 to-black/40 rounded-xl p-4 md:p-6 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'>
						<div className='flex items-center gap-3 mb-2'>
							<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/80 to-red-600/80 flex items-center justify-center'>
								<span className='text-sm'>⚠️</span>
							</div>
							<h3 className='text-lg font-semibold text-red-300'>
								Отзыв недоступен
							</h3>
						</div>
						<p className='text-red-200 text-sm'>
							По задачам, по которым был решен спор, нельзя оставлять отзывы.
						</p>
					</div>
				)}
		</div>
	)
}

