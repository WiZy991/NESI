'use client'

import { useUser } from '@/lib/auth'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PaymentReturnPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { token } = useUser()
	const [status, setStatus] = useState<
		'checking' | 'success' | 'failed' | 'pending'
	>('checking')
	const [message, setMessage] = useState('Проверяем статус платежа...')
	const [paymentId, setPaymentId] = useState<string | null>(null)

	useEffect(() => {
		if (!token) {
			setStatus('failed')
			setMessage('Необходима авторизация')
			return
		}

		const paymentIdParam =
			searchParams.get('PaymentId') || searchParams.get('paymentId')

		if (!paymentIdParam) {
			setStatus('failed')
			setMessage('Не указан ID платежа')
			return
		}

		setPaymentId(paymentIdParam)
		checkPaymentStatus(paymentIdParam)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, token])

	const checkPaymentStatus = async (id: string) => {
		if (!token) {
			setStatus('failed')
			setMessage('Необходима авторизация')
			return
		}

		try {
			console.log('🔍 Проверка статуса платежа:', id)

			const res = await fetch('/api/tbank/payment/check-status', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ paymentId: id }),
			})

			const data = await res.json()

			console.log('📊 Результат проверки статуса:', data)

			if (!res.ok) {
				setStatus('failed')
				setMessage(data.error || 'Ошибка при проверке статуса платежа')
				return
			}

			// Если баланс был обновлен
			if (data.balanceUpdated) {
				setStatus('success')
				setMessage(`Баланс успешно пополнен на ${data.amount} ₽`)

				// Обновляем профиль через 2 секунды
				setTimeout(() => {
					router.push('/profile')
				}, 2000)
				return
			}

			// Если платеж подтвержден, но баланс еще не начислен (webhook еще не пришел)
			if (data.status === 'CONFIRMED' || data.status === 'AUTHORIZED') {
				setStatus('pending')
				setMessage('Платеж подтвержден. Ожидаем обработки...')

				// Повторяем проверку через 3 секунды
				setTimeout(() => {
					checkPaymentStatus(id)
				}, 3000)
				return
			}

			// Если платеж еще не подтвержден
			if (data.status === 'NEW' || data.status === 'FORM_SHOWED') {
				setStatus('pending')
				setMessage('Платеж обрабатывается. Пожалуйста, подождите...')

				// Повторяем проверку через 5 секунд
				setTimeout(() => {
					checkPaymentStatus(id)
				}, 5000)
				return
			}

			// Если платеж отклонен
			if (data.status === 'REJECTED' || data.status === 'CANCELED') {
				setStatus('failed')
				setMessage('Платеж был отклонен или отменен')
				return
			}

			// Неизвестный статус
			setStatus('pending')
			setMessage(
				`Статус платежа: ${data.status || 'неизвестен'}. Ожидаем обработки...`
			)

			// Повторяем проверку через 5 секунд
			setTimeout(() => {
				checkPaymentStatus(id)
			}, 5000)
		} catch (error: any) {
			console.error('❌ Ошибка проверки статуса платежа:', error)
			setStatus('failed')
			setMessage(
				'Ошибка при проверке статуса платежа. Попробуйте обновить страницу.'
			)
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4 text-white'>
			<motion.div
				initial={{ opacity: 0, scale: 0.9, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ duration: 0.7, ease: 'easeOut' }}
				className='bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-10 max-w-md w-full backdrop-blur-md text-center'
			>
				{status === 'checking' && (
					<>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							className='text-5xl mb-4'
						>
							⏳
						</motion.div>
						<h1 className='text-2xl font-bold mb-4 text-emerald-400'>
							Проверка платежа
						</h1>
						<p className='text-gray-300 mb-6'>{message}</p>
						{paymentId && (
							<p className='text-xs text-gray-500'>ID: {paymentId}</p>
						)}
					</>
				)}

				{status === 'success' && (
					<>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.3, duration: 0.6 }}
							className='text-6xl mb-4'
						>
							✅
						</motion.div>
						<h1 className='text-2xl font-bold mb-4 text-emerald-400'>
							Платеж успешно обработан!
						</h1>
						<p className='text-gray-300 mb-6'>{message}</p>
						<motion.div
							animate={{
								opacity: [1, 0.7, 1],
							}}
							transition={{
								duration: 1.6,
								repeat: Infinity,
							}}
							className='text-emerald-400 font-medium'
						>
							Переходим в профиль...
						</motion.div>
					</>
				)}

				{status === 'pending' && (
					<>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							className='text-5xl mb-4'
						>
							⏳
						</motion.div>
						<h1 className='text-2xl font-bold mb-4 text-yellow-400'>
							Обработка платежа
						</h1>
						<p className='text-gray-300 mb-6'>{message}</p>
						<p className='text-xs text-gray-500 mb-4'>
							Это может занять несколько секунд
						</p>
						<button
							onClick={() => router.push('/profile')}
							className='px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors'
						>
							Вернуться в профиль
						</button>
					</>
				)}

				{status === 'failed' && (
					<>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.3, duration: 0.6 }}
							className='text-6xl mb-4'
						>
							❌
						</motion.div>
						<h1 className='text-2xl font-bold mb-4 text-red-400'>
							Ошибка обработки платежа
						</h1>
						<p className='text-gray-300 mb-6'>{message}</p>
						<div className='flex gap-4 justify-center'>
							<button
								onClick={() => router.push('/profile')}
								className='px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors'
							>
								Вернуться в профиль
							</button>
							{paymentId && (
								<button
									onClick={() => checkPaymentStatus(paymentId)}
									className='px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors'
								>
									Проверить снова
								</button>
							)}
						</div>
					</>
				)}
			</motion.div>
		</div>
	)
}
