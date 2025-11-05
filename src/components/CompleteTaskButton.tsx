'use client'

import { useUser } from '@/context/UserContext'
import { useState } from 'react'
import { toast } from 'sonner'
import { BadgeUnlockedModal, BadgeData } from './BadgeUnlockedModal'

export default function CompleteTaskButton({
	taskId,
	authorId,
}: {
	taskId: string
	authorId: string
}) {
	const { user, token } = useUser()
	const [loading, setLoading] = useState(false)
	const [currentBadge, setCurrentBadge] = useState<BadgeData | null>(null)
	const [badgeQueue, setBadgeQueue] = useState<BadgeData[]>([])

	if (!user || user.id !== authorId) return null

	const showNextBadge = () => {
		if (badgeQueue.length > 0) {
			setCurrentBadge(badgeQueue[0])
			setBadgeQueue(prev => prev.slice(1))
		} else {
			setCurrentBadge(null)
		}
	}

	const handleBadgeClose = () => {
		setCurrentBadge(null)
		// Показываем следующее достижение после небольшой задержки
		setTimeout(() => {
			if (badgeQueue.length > 0) {
				showNextBadge()
			}
		}, 300)
	}

	const handleClick = async () => {
		setLoading(true)
		try {
			const res = await fetch(`/api/tasks/${taskId}/complete`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (!res.ok) {
				const data = await res.json()
				toast.error(data.error || 'Ошибка завершения задачи')
			} else {
				const data = await res.json()
				toast.success('Задача завершена')
				
				// Показываем достижения заказчика
				if (data.awardedBadges?.customer && data.awardedBadges.customer.length > 0) {
					setBadgeQueue(data.awardedBadges.customer)
					showNextBadge()
				}
				
				// Перезагружаем страницу после показа всех достижений
				setTimeout(() => {
					window.location.reload()
				}, 6000) // Даем время на показ всех достижений
			}
		} catch {
			toast.error('Ошибка сети')
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<button
				onClick={handleClick}
				disabled={loading}
				className='flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
			>
				{loading ? (
					<>
						<span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
						<span>Завершаем...</span>
					</>
				) : (
					<>
						<span className='text-lg'>✅</span>
						<span>Завершить задачу</span>
					</>
				)}
			</button>
			
			{currentBadge && (
				<BadgeUnlockedModal badge={currentBadge} onClose={handleBadgeClose} />
			)}
		</>
	)
}
