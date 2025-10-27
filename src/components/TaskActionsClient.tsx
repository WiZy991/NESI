'use client'

import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
	taskId: string
	authorId: string
	status: string
}

export default function TaskActionsClient({ taskId, authorId, status }: Props) {
	const { user, token } = useUser()
	const router = useRouter()

	const handleDelete = async () => {
		const confirmDelete = confirm(
			'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.'
		)
		if (!confirmDelete) return

		try {
			const res = await fetch(`/api/tasks/${taskId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})

			if (res.ok) {
				toast.success('Задача успешно удалена')
				router.push('/tasks')
			} else {
				const data = await res.json().catch(() => ({}))
				toast.error(data?.error || 'Ошибка удаления')
			}
		} catch {
			toast.error('Сетевая ошибка')
		}
	}

	// Только для автора задачи в статусе "open"
	const isCustomer = user?.id === authorId && status === 'open'
	if (!user || !isCustomer) return null

	return (
		<div className='flex flex-wrap gap-3'>
			<button
				onClick={() => router.push(`/tasks/${taskId}/edit`)}
				className='group flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-[1.02]'
			>
				<span className='text-lg'>✏️</span>
				<span>Редактировать</span>
			</button>

			<button
				onClick={handleDelete}
				className='group flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-[1.02]'
			>
				<span className='text-lg'>🗑️</span>
				<span>Удалить</span>
			</button>
		</div>
	)
}
