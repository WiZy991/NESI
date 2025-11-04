'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BlockUserButtonProps {
	userId: string
	blocked: boolean
}

export default function BlockUserButton({ userId, blocked }: BlockUserButtonProps) {
	const [isBlocked, setIsBlocked] = useState(blocked)
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	const handleToggle = async () => {
		setLoading(true)
		try {
			const res = await fetch(`/api/admin/users`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: userId, blocked: !isBlocked }),
			})

			if (res.ok) {
				setIsBlocked(!isBlocked)
				router.refresh() // Обновляем страницу для отображения изменений
			}
		} catch (error) {
			console.error('Ошибка при блокировке пользователя:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<button
			onClick={handleToggle}
			disabled={loading}
			className={`px-3 py-1 rounded text-sm transition ${
				isBlocked
					? 'bg-green-700 hover:bg-green-800'
					: 'bg-red-700 hover:bg-red-800'
			} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
		>
			{loading ? 'Загрузка...' : isBlocked ? 'Разблокировать' : 'Заблокировать'}
		</button>
	)
}

