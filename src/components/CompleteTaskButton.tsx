'use client'

import { useUser } from '@/context/UserContext'
import { useState } from 'react'
import { toast } from 'sonner'

export default function CompleteTaskButton({
	taskId,
	authorId,
}: {
	taskId: string
	authorId: string
}) {
	const { user, token } = useUser()
	const [loading, setLoading] = useState(false)

	if (!user || user.id !== authorId) return null

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
				toast.success('Задача завершена')
				window.location.reload()
			}
		} catch {
			toast.error('Ошибка сети')
		} finally {
			setLoading(false)
		}
	}

	return (
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
	)
}
