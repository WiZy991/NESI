'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import {
	MessageSquare,
	CheckCircle,
	Clock,
	Tag,
	Eye,
	EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

interface Feedback {
	id: string
	name: string
	email: string | null
	message: string
	type: string
	status: string
	createdAt: string
	reviewedAt: string | null
	notes: string | null
}

export default function FeedbackPage() {
	const { user, token } = useUser()
	const router = useRouter()
	const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
	const [showNotes, setShowNotes] = useState(false)
	const [notes, setNotes] = useState('')

	useEffect(() => {
		if (!user || user.role !== 'admin') {
			router.push('/login')
			return
		}
		fetchFeedbacks()
	}, [user, router])

	const fetchFeedbacks = async () => {
		try {
			const res = await fetch('/api/admin/feedback', {
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await res.json()
			console.log('Ответ от API:', data)
			
			if (res.ok) {
				setFeedbacks(data.feedbacks || [])
				console.log('Загружено отзывов:', data.feedbacks?.length || 0)
			} else {
				toast.error(`Ошибка: ${data.error || 'Неизвестная ошибка'}`)
				console.error('Ошибка API:', data)
			}
		} catch (error) {
			console.error('Ошибка при загрузке обратной связи:', error)
			toast.error('Не удалось загрузить обратную связь')
		} finally {
			setLoading(false)
		}
	}

	const markAsReviewed = async (id: string) => {
		try {
			const res = await fetch('/api/admin/feedback/reviewed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ id }),
			})

			if (res.ok) {
				toast.success('Отмечено как просмотрено')
				fetchFeedbacks()
			}
		} catch (error) {
			toast.error('Ошибка при обновлении статуса')
		}
	}

	const addNotes = async (id: string) => {
		try {
			const res = await fetch('/api/admin/feedback/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ id, notes }),
			})

			if (res.ok) {
				toast.success('Заметки сохранены')
				setShowNotes(false)
				setNotes('')
				fetchFeedbacks()
			}
		} catch (error) {
			toast.error('Ошибка при сохранении заметок')
		}
	}

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'bug':
				return '🐛'
			case 'feature':
				return '💡'
			case 'complaint':
				return '⚠️'
			case 'praise':
				return '⭐'
			default:
				return '💬'
		}
	}

	const getTypeColor = (type: string) => {
		switch (type) {
			case 'bug':
				return 'bg-red-500/20 text-red-400 border-red-500/30'
			case 'feature':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
			case 'complaint':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
			case 'praise':
				return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
			default:
				return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
		}
	}

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-emerald-400 text-xl'>Загрузка...</div>
			</div>
		)
	}

	const newFeedbacks = feedbacks.filter((f) => f.status === 'new')
	const reviewedFeedbacks = feedbacks.filter((f) => f.status === 'reviewed')

	return (
		<div className='max-w-7xl mx-auto px-4 py-8'>
			<div className='mb-8'>
				<h1 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-3'>
					<MessageSquare className='w-8 h-8' />
					Обратная связь
				</h1>
				<p className='text-gray-400'>
					Управление отзывами и предложениями пользователей
				</p>
			</div>

			{/* Статистика */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
				<div className='bg-gray-900 border border-emerald-500/30 rounded-xl p-6'>
					<div className='flex items-center justify-between mb-2'>
						<span className='text-gray-400'>Новых</span>
						<Clock className='w-5 h-5 text-blue-400' />
					</div>
					<div className='text-3xl font-bold text-blue-400'>
						{newFeedbacks.length}
					</div>
				</div>

				<div className='bg-gray-900 border border-emerald-500/30 rounded-xl p-6'>
					<div className='flex items-center justify-between mb-2'>
						<span className='text-gray-400'>Просмотрено</span>
						<CheckCircle className='w-5 h-5 text-green-400' />
					</div>
					<div className='text-3xl font-bold text-green-400'>
						{reviewedFeedbacks.length}
					</div>
				</div>

				<div className='bg-gray-900 border border-emerald-500/30 rounded-xl p-6'>
					<div className='flex items-center justify-between mb-2'>
						<span className='text-gray-400'>Всего</span>
						<Tag className='w-5 h-5 text-emerald-400' />
					</div>
					<div className='text-3xl font-bold text-emerald-400'>
						{feedbacks.length}
					</div>
				</div>
			</div>

			{/* Новые */}
			{newFeedbacks.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold text-white mb-4'>
						Новые отзывы ({newFeedbacks.length})
					</h2>
					<div className='space-y-4'>
						{newFeedbacks.map((feedback) => (
							<div
								key={feedback.id}
								className='bg-gray-900 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition-all'
							>
								<div className='flex items-start justify-between mb-4'>
									<div className='flex items-center gap-3'>
										<span className='text-2xl'>
											{getTypeIcon(feedback.type)}
										</span>
										<div>
											<p className='font-semibold text-white'>
												{feedback.name}
											</p>
											{feedback.email && (
												<p className='text-sm text-gray-400'>
													{feedback.email}
												</p>
											)}
										</div>
									</div>
									<span
										className={`px-3 py-1 rounded-full text-xs border ${getTypeColor(
											feedback.type
										)}`}
									>
										{feedback.type}
									</span>
								</div>

								<p className='text-gray-300 mb-4 whitespace-pre-wrap'>
									{feedback.message}
								</p>

								<div className='flex items-center justify-between text-sm text-gray-400'>
									<span>{formatDate(feedback.createdAt)}</span>
									<button
										onClick={() => markAsReviewed(feedback.id)}
										className='px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors'
									>
										Отметить как просмотрено
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Просмотренные */}
			{reviewedFeedbacks.length > 0 && (
				<div>
					<h2 className='text-xl font-semibold text-white mb-4'>
						Просмотренные отзывы ({reviewedFeedbacks.length})
					</h2>
					<div className='space-y-4'>
						{reviewedFeedbacks.map((feedback) => (
							<div
								key={feedback.id}
								className='bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all opacity-75'
							>
								<div className='flex items-start justify-between mb-4'>
									<div className='flex items-center gap-3'>
										<span className='text-2xl'>
											{getTypeIcon(feedback.type)}
										</span>
										<div>
											<p className='font-semibold text-white'>
												{feedback.name}
											</p>
											{feedback.email && (
												<p className='text-sm text-gray-400'>
													{feedback.email}
												</p>
											)}
										</div>
									</div>
									<span
										className={`px-3 py-1 rounded-full text-xs border ${getTypeColor(
											feedback.type
										)}`}
									>
										{feedback.type}
									</span>
								</div>

								<p className='text-gray-300 mb-4 whitespace-pre-wrap'>
									{feedback.message}
								</p>

								{feedback.notes && (
									<div className='mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg'>
										<p className='text-sm text-emerald-400 font-semibold mb-1'>
											Заметки:
										</p>
										<p className='text-sm text-gray-300 whitespace-pre-wrap'>
											{feedback.notes}
										</p>
									</div>
								)}

								<div className='flex items-center justify-between text-sm text-gray-400'>
									<span>{formatDate(feedback.createdAt)}</span>
									<span>
										Просмотрено: {formatDate(feedback.reviewedAt || feedback.createdAt)}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{feedbacks.length === 0 && (
				<div className='text-center py-16'>
					<MessageSquare className='w-16 h-16 text-gray-600 mx-auto mb-4' />
					<p className='text-gray-400 text-lg'>
						Нет отзывов пока
					</p>
				</div>
			)}
		</div>
	)
}

