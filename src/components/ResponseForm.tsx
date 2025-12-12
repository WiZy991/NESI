'use client'

import { useUser } from '@/context/UserContext'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export default function ResponseForm({
	taskId,
	minPrice = 0,
	isCertified = true,
	subcategoryId,
	subcategoryName,
}: {
	taskId: string
	minPrice?: number
	isCertified?: boolean
	subcategoryId?: string
	subcategoryName?: string
}) {
	const { token, user } = useUser()
	const [message, setMessage] = useState('')
	const [price, setPrice] = useState('')
	const [loading, setLoading] = useState(false)

	// состояние отклика
	const [hasResponded, setHasResponded] = useState(false)
	const [loadingCheck, setLoadingCheck] = useState(true)

	// ====== Управление подсказкой (позиция как раньше — справа по центру) ======
	const [showTooltip, setShowTooltip] = useState(false)
	const [hoverTarget, setHoverTarget] = useState<'message' | 'price' | null>(
		null
	)
	const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
	const messageRef = useRef<HTMLTextAreaElement>(null)
	const priceRef = useRef<HTMLInputElement>(null)
	const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

	const safeShow = (target: 'message' | 'price') => {
		if (!isCertified) {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
			setHoverTarget(target)
			
			// Вычисляем позицию плашки относительно viewport
			const element = target === 'message' ? messageRef.current : priceRef.current
			if (element) {
				const rect = element.getBoundingClientRect()
				// Позиционируем справа от элемента
				setTooltipPosition({
					top: rect.top + rect.height / 2,
					left: rect.right + 12, // 12px = ml-3
				})
			}
			
			setShowTooltip(true)
		}
	}
	const safeScheduleHide = () => {
		if (!isCertified) {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
			hideTimerRef.current = setTimeout(() => setShowTooltip(false), 400)
		}
	}
	const tooltipEnter = () => {
		if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
		setShowTooltip(true)
	}
	const tooltipLeave = () => {
		hideTimerRef.current = setTimeout(() => setShowTooltip(false), 300)
	}

	// Обновление позиции плашки при скролле и изменении размера окна
	useEffect(() => {
		if (!showTooltip || !hoverTarget) return
		
		const updatePosition = () => {
			const element = hoverTarget === 'message' ? messageRef.current : priceRef.current
			if (element) {
				const rect = element.getBoundingClientRect()
				setTooltipPosition({
					top: rect.top + rect.height / 2,
					left: rect.right + 12,
				})
			}
		}
		
		window.addEventListener('scroll', updatePosition, true)
		window.addEventListener('resize', updatePosition)
		
		return () => {
			window.removeEventListener('scroll', updatePosition, true)
			window.removeEventListener('resize', updatePosition)
		}
	}, [showTooltip, hoverTarget])

	// ====== Проверка, есть ли уже отклик ======
	useEffect(() => {
		const checkResponse = async () => {
			if (!token || !user || user.role !== 'executor') {
				setLoadingCheck(false)
				return
			}
			try {
				const res = await fetch(`/api/tasks/${taskId}/my-response`, {
					headers: { Authorization: `Bearer ${token}` },
					cache: 'no-store',
				})
				const data = await res.json()
				setHasResponded(Boolean(data?.has))
			} catch (err) {
				console.error('Ошибка проверки отклика:', err)
			} finally {
				setLoadingCheck(false)
			}
		}
		checkResponse()
	}, [taskId, token, user])

	// ====== Отправка ======
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!token) return toast.error('Вы не авторизованы')
		if (!isCertified) return toast.error('Сначала пройдите сертификацию')
		if (!message || !price) return toast.error('Заполните сообщение и цену')

		const parsedPrice = parseInt(price)
		if (Number.isNaN(parsedPrice)) return toast.error('Некорректная цена')
		if (parsedPrice < minPrice)
			return toast.error(`Минимальная цена по категории — ${minPrice}₽`)

		setLoading(true)
		try {
			const { fetchWithRetry } = await import('@/lib/retry')
			const res = await fetchWithRetry(`/api/tasks/${taskId}/responses`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ message, price: parsedPrice }),
			}, {
				maxRetries: 2,
				retryDelay: 1000,
				shouldRetry: (error, attempt) => {
					// Повторяем только при сетевых ошибках или 5xx ошибках
					if (error instanceof Error) {
						return error.message.includes('fetch') || 
						       error.message.includes('network') ||
						       error.message.includes('Server error')
					}
					return false
				},
			})

			const data = await res.json().catch(() => null)
			if (!res.ok) {
				return toast.error(data?.error || 'Ошибка при отклике')
			}

			toast.success('Отклик отправлен!')
			setHasResponded(true)
		} catch (err) {
			console.error('Ошибка сети:', err)
			toast.error('Ошибка сети. Попробуйте еще раз.')
		} finally {
			setLoading(false)
		}
	}

	// ====== Рендер ======
	if (loadingCheck)
		return (
			<div className='flex items-center gap-3 text-gray-400'>
				<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
				<span>Проверка отклика...</span>
			</div>
		)

	if (hasResponded)
		return (
			<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]'>
				<div className='flex items-center justify-center gap-2 text-emerald-400 font-semibold text-lg'>
					<span className='text-2xl'>✅</span>
					<span>Вы откликнулись на эту задачу</span>
				</div>
				<p className='text-gray-400 text-sm mt-2'>
					Заказчик рассмотрит ваше предложение и свяжется с вами
				</p>
			</div>
		)

	// компонент подсказки (fixed позиционирование, не обрезается)
	const Tooltip = () => {
		if (!isCertified && showTooltip) {
			// Проверяем, не выходит ли плашка за правый край экрана
			const tooltipWidth = 288 // w-72 = 18rem = 288px
			const rightEdge = tooltipPosition.left + tooltipWidth
			const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
			const padding = 16 // отступ от края
			
			let finalLeft = tooltipPosition.left
			// Если плашка выходит за правый край, сдвигаем её влево
			if (rightEdge > viewportWidth - padding) {
				finalLeft = viewportWidth - tooltipWidth - padding
			}
			
			return (
				<div
					className='fixed w-72 bg-gradient-to-br from-gray-900 to-gray-800 border border-emerald-500/30 text-gray-200 text-xs px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] z-[9999] transition-opacity duration-200 backdrop-blur-sm'
					style={{
						top: `${tooltipPosition.top}px`,
						left: `${finalLeft}px`,
						transform: 'translateY(-50%)',
					}}
					onMouseEnter={tooltipEnter}
					onMouseLeave={tooltipLeave}
				>
					<p className='mb-2'>
						Чтобы откликнуться на задачу, нужна сертификация по «{subcategoryName}
						».
					</p>
					<a
						href={`/cert?subcategoryId=${subcategoryId}`}
						className='inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition'
					>
						<span>Пройти тест</span>
						<span>→</span>
					</a>
				</div>
			)
		}
		return null
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-5 relative'>
			{/* Комментарий */}
			<div
				className='relative'
				onMouseEnter={() => safeShow('message')}
				onMouseLeave={safeScheduleHide}
			>
				<label className='block text-sm font-medium text-emerald-300 mb-2'>
					<span className='flex items-center gap-2'>
						<span>💬</span>
						Комментарий
					</span>
				</label>
				<textarea
					ref={messageRef}
					value={message}
					onChange={e => setMessage(e.target.value)}
					placeholder='Расскажите, почему именно вы подходите для этой задачи...'
					disabled={!isCertified}
					rows={4}
					className={`w-full p-4 rounded-xl bg-black/60 border text-white placeholder-gray-500 focus:ring-2 outline-none transition-all duration-300 resize-none ${
						!isCertified
							? 'cursor-not-allowed opacity-50 border-gray-700'
							: 'border-emerald-700/50 focus:border-emerald-400 focus:ring-emerald-400/30 focus:scale-[1.01]'
					}`}
				/>
				<Tooltip />
			</div>

			{/* Цена */}
			<div
				className='relative'
				onMouseEnter={() => safeShow('price')}
				onMouseLeave={safeScheduleHide}
			>
				<label className='block text-sm font-medium text-emerald-300 mb-2'>
					<span className='flex items-center gap-2'>
						<span>💰</span>
						Ваша цена (₽)
					</span>
				</label>
				<input
					ref={priceRef}
					type='number'
					value={price}
					onChange={e => setPrice(e.target.value)}
					placeholder='Введите цену'
					disabled={!isCertified}
					className={`w-full p-4 rounded-xl bg-black/60 border text-white placeholder-gray-500 focus:ring-2 outline-none transition-all duration-300 ${
						!isCertified
							? 'cursor-not-allowed opacity-50 border-gray-700'
							: 'border-emerald-700/50 focus:border-emerald-400 focus:ring-emerald-400/30 focus:scale-[1.01]'
					}`}
				/>
				<Tooltip />
				{minPrice > 0 && (
					<p className='text-xs text-gray-400 mt-2 ml-1'>
						💡 Минимальная цена по категории:{' '}
						<b className='text-emerald-400'>{minPrice}₽</b>
					</p>
				)}
			</div>

			{/* Кнопка отправки */}
			<button
				type='submit'
				disabled={
					loading ||
					!isCertified ||
					(!!price && parseInt(price) < (minPrice || 0))
				}
				className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 transform ${
					loading ||
					!isCertified ||
					(!!price && parseInt(price) < (minPrice || 0))
						? 'bg-gray-600 cursor-not-allowed opacity-50'
						: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02]'
				}`}
			>
				{loading ? (
					<span className='flex items-center justify-center gap-2'>
						<span className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
						Отправка...
					</span>
				) : (
					<span className='flex items-center justify-center gap-2'>
						<span>📨</span>
						Отправить отклик
					</span>
				)}
			</button>
		</form>
	)
}
