'use client'

import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import { useState } from 'react'

export default function CancelExecutorButton({
	taskId,
	onCancelled,
}: {
	taskId: string
	onCancelled?: () => void
}) {
	const { token } = useUser()
	const { confirm, Dialog } = useConfirm()
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	async function onClick() {
		if (!token) {
			setErr('Нет авторизации')
			return
		}
		await confirm({
			title: 'Отмена исполнителя',
			message: 'Вы уверены, что хотите отменить исполнителя и вернуть средства? Это действие нельзя отменить.',
			type: 'warning',
			confirmText: 'Отменить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				setLoading(true)
				setErr(null)
				try {
					const res = await fetch(`/api/tasks/${taskId}/cancel`, {
						method: 'POST',
						headers: { Authorization: `Bearer ${token}` },
					})
					const data = await res.json().catch(() => ({}))
					if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`)

					toast.success('Исполнитель отменён, средства возвращены')
					onCancelled?.()
				} catch (e: any) {
					setErr(e.message || 'Не удалось отменить')
					toast.error(e.message || 'Не удалось отменить')
				} finally {
					setLoading(false)
				}
			},
		})
	}

	return (
		<div>
			<button
				onClick={onClick}
				disabled={loading}
				className='flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
			>
				{loading ? (
					<>
						<span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
						<span>Отмена...</span>
					</>
				) : (
					<>
						<span className='text-lg'>❌</span>
						<span>Отменить исполнителя</span>
					</>
				)}
			</button>
			{err && (
				<p className='mt-2 text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2'>
					{err}
				</p>
			)}
			{Dialog}
		</div>
	)
}
