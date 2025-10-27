'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function PaymentResultContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [status, setStatus] = useState<'checking' | 'success' | 'failed'>(
		'checking'
	)
	const [amount, setAmount] = useState<number>(0)

	useEffect(() => {
		const checkPayment = async () => {
			// Получаем payment_id из URL параметров ЮKassa
			const paymentId =
				searchParams.get('payment_id') || searchParams.get('paymentId')

			if (!paymentId) {
				setStatus('failed')
				return
			}

			try {
				const response = await fetch(
					`/api/wallet/check-payment?paymentId=${paymentId}`
				)
				const data = await response.json()

				if (data.paid && data.processed) {
					setStatus('success')
					setAmount(data.amount)
				} else {
					setStatus('failed')
				}
			} catch (error) {
				console.error('Ошибка проверки платежа:', error)
				setStatus('failed')
			}
		}

		checkPayment()
	}, [searchParams])

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
			<div className='max-w-md w-full bg-white rounded-lg shadow-lg p-8'>
				{status === 'checking' && (
					<div className='text-center'>
						<div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4'></div>
						<h2 className='text-xl font-semibold text-gray-900 mb-2'>
							Проверяем статус платежа...
						</h2>
						<p className='text-gray-600'>Пожалуйста, подождите</p>
					</div>
				)}

				{status === 'success' && (
					<div className='text-center'>
						<div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
							<svg
								className='w-8 h-8 text-green-600'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M5 13l4 4L19 7'
								/>
							</svg>
						</div>
						<h2 className='text-2xl font-bold text-gray-900 mb-2'>
							Оплата прошла успешно!
						</h2>
						<p className='text-gray-600 mb-1'>Ваш баланс пополнен на</p>
						<p className='text-3xl font-bold text-green-600 mb-6'>
							{amount.toFixed(2)} ₽
						</p>
						<div className='space-y-3'>
							<button
								onClick={() => router.push('/profile')}
								className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
							>
								Перейти в профиль
							</button>
							<button
								onClick={() => router.push('/tasks')}
								className='w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
							>
								Смотреть задачи
							</button>
						</div>
					</div>
				)}

				{status === 'failed' && (
					<div className='text-center'>
						<div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
							<svg
								className='w-8 h-8 text-red-600'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M6 18L18 6M6 6l12 12'
								/>
							</svg>
						</div>
						<h2 className='text-2xl font-bold text-gray-900 mb-2'>
							Ошибка оплаты
						</h2>
						<p className='text-gray-600 mb-6'>
							К сожалению, платеж не был завершен. Средства не списаны с вашей
							карты.
						</p>
						<div className='space-y-3'>
							<button
								onClick={() => router.push('/profile')}
								className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
							>
								Попробовать снова
							</button>
							<button
								onClick={() => router.push('/')}
								className='w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
							>
								На главную
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default function PaymentResultPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen flex items-center justify-center bg-gray-50'>
					<div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600'></div>
				</div>
			}
		>
			<PaymentResultContent />
		</Suspense>
	)
}
