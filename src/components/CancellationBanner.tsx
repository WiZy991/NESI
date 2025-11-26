'use client'

import { useUser } from '@/context/UserContext'
import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, X } from 'lucide-react'

interface CancellationBannerProps {
	taskId: string
	taskTitle: string
	cancellationRequestedAt: string
	cancellationReason?: string | null
	onResponse: () => void
	onDisputeClick?: () => void // Callback для открытия формы спора
}

export default function CancellationBanner({
	taskId,
	taskTitle,
	cancellationRequestedAt,
	cancellationReason,
	onResponse,
	onDisputeClick,
}: CancellationBannerProps) {
	const { token } = useUser()
	const [loading, setLoading] = useState(false)

	const handleResponse = async (action: 'accept' | 'dispute') => {
		if (!token) {
			toast.error('Необходима авторизация')
			return
		}

		if (action === 'dispute') {
			// При оспаривании просто открываем форму спора
			if (onDisputeClick) {
				onDisputeClick()
			} else {
				toast.error('Ошибка: форма спора недоступна')
			}
			return
		}

		// При согласии вызываем API
		setLoading(true)
		try {
			const res = await fetch(`/api/tasks/${taskId}/cancel/respond`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ action: 'accept' }),
			})

			const data = await res.json()

			if (!res.ok) {
				throw new Error(data.error || 'Ошибка при обработке запроса')
			}

			toast.success('Вы согласились с отменой задачи')
			onResponse()
			// Обновляем страницу через секунду
			setTimeout(() => {
				window.location.reload()
			}, 1000)
		} catch (err: any) {
			toast.error(err.message || 'Ошибка при обработке запроса')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='bg-gradient-to-r from-yellow-900/40 via-orange-900/30 to-red-900/40 border-2 border-yellow-500/50 rounded-2xl p-6 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.3)]'>
			<div className='flex items-start gap-4'>
				<div className='flex-shrink-0'>
					<div className='bg-yellow-500/20 p-3 rounded-xl'>
						<AlertTriangle className='w-6 h-6 text-yellow-400' />
					</div>
				</div>
				<div className='flex-1 min-w-0'>
					<h3 className='text-lg font-bold text-yellow-200 mb-2'>
						Заказчик запросил отмену задачи
					</h3>
					<p className='text-sm text-yellow-100/80 mb-1'>
						Заказчик хочет отменить задачу "{taskTitle}"
					</p>
					{cancellationReason && (
						<p className='text-xs text-yellow-200/60 mt-2 italic'>
							Причина: {cancellationReason}
						</p>
					)}
					<p className='text-xs text-yellow-200/50 mt-2'>
						Запрос отправлен:{' '}
						{new Date(cancellationRequestedAt).toLocaleString('ru-RU', {
							day: '2-digit',
							month: 'long',
							hour: '2-digit',
							minute: '2-digit',
						})}
					</p>

					<div className='flex flex-col sm:flex-row gap-3 mt-4'>
						<button
							onClick={() => handleResponse('accept')}
							disabled={loading}
							className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
						>
							<Check className='w-5 h-5' />
							<span>Согласиться с отменой</span>
						</button>
						<button
							onClick={() => handleResponse('dispute')}
							disabled={loading}
							className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
						>
							<X className='w-5 h-5' />
							<span>Оспорить отмену</span>
						</button>
					</div>
					<p className='text-xs text-yellow-200/50 mt-3'>
						Если вы оспорите отмену, будет создан спор, который рассмотрит администратор
					</p>
				</div>
			</div>
		</div>
	)
}

