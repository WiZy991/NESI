'use client'

import { useState } from 'react'
import { clientLogger } from '@/lib/clientLogger'

interface DisputeFormProps {
	taskId: string
	onSuccess: () => void
	token: string
}

export function DisputeForm({ taskId, onSuccess, token }: DisputeFormProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [reason, setReason] = useState('')
	const [details, setDetails] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async () => {
		if (!reason.trim()) {
			setError('Укажите причину спора')
			return
		}
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/disputes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ taskId, reason, details }),
			})
			if (res.ok) {
				setIsOpen(false)
				setReason('')
				setDetails('')
				// Добавляем небольшую задержку перед обновлением состояния
				setTimeout(() => {
					onSuccess()
				}, 100)
			} else {
				const data = await res.json().catch(() => ({}))
				setError((data as any)?.error || 'Ошибка при создании спора')
			}
		} catch (err) {
			clientLogger.error('Ошибка создания спора', err instanceof Error ? err : new Error(String(err)), { taskId })
			setError('Ошибка соединения с сервером')
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen)
		return (
			<button
				onClick={() => setIsOpen(true)}
				className='flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-[1.02]'
			>
				<span className='text-lg'>⚖️</span>
				<span>Открыть спор</span>
			</button>
		)

	return (
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-red-300 mb-2'>
					<span className='flex items-center gap-2'>
						<span>📝</span>
						Причина спора
					</span>
				</label>
				<textarea
					placeholder='Опишите суть проблемы...'
					value={reason}
					onChange={e => setReason(e.target.value)}
					rows={3}
					className='w-full p-4 rounded-xl bg-black/60 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/30 outline-none transition-all duration-300 resize-none'
				/>
			</div>

			<div>
				<label className='block text-sm font-medium text-red-300 mb-2'>
					<span className='flex items-center gap-2'>
						<span>📄</span>
						Дополнительные детали (необязательно)
					</span>
				</label>
				<textarea
					placeholder='Добавьте любую дополнительную информацию...'
					value={details}
					onChange={e => setDetails(e.target.value)}
					rows={4}
					className='w-full p-4 rounded-xl bg-black/60 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/30 outline-none transition-all duration-300 resize-none'
				/>
			</div>

			{error && (
				<div className='bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm'>
					{error}
				</div>
			)}

			<div className='flex items-center gap-3'>
				<button
					onClick={handleSubmit}
					disabled={loading || !reason.trim()}
					className='flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none'
				>
					{loading ? 'Отправка...' : 'Отправить спор'}
				</button>
				<button
					onClick={() => {
						setIsOpen(false)
						setReason('')
						setDetails('')
						setError(null)
					}}
					className='px-5 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-white font-semibold transition-all duration-300'
				>
					Отмена
				</button>
			</div>
		</div>
	)
}

