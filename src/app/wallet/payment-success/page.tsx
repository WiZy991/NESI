'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function PaymentSuccessContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { token } = useUser()
	const [countdown, setCountdown] = useState(5)
	const [checkingPayment, setCheckingPayment] = useState(false)
	const [checkResult, setCheckResult] = useState<string | null>(null)

	// Пытаемся получить PaymentId из URL или localStorage
	const paymentIdFromUrl = searchParams.get('PaymentId')
	const paymentIdFromStorage =
		typeof window !== 'undefined'
			? localStorage.getItem('lastTBankPaymentId')
			: null
	const paymentId = paymentIdFromUrl || paymentIdFromStorage

	// Автоматически проверяем платеж при загрузке страницы
	useEffect(() => {
		if (paymentId && token && !checkResult) {
			checkPaymentStatus()
		}
	}, [paymentId, token])

	const checkPaymentStatus = async () => {
		if (!paymentId || !token) return

		setCheckingPayment(true)
		try {
			const res = await fetch('/api/wallet/tbank/check-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ paymentId }),
			})

			const data = await res.json()

			if (data.success && !data.alreadyProcessed) {
				setCheckResult('success')
				// Очищаем localStorage
				if (typeof window !== 'undefined') {
					localStorage.removeItem('lastTBankPaymentId')
				}
			} else if (data.alreadyProcessed) {
				setCheckResult('already_processed')
			} else {
				setCheckResult('failed')
			}
		} catch (err: any) {
			console.error('Ошибка проверки платежа:', err)
			setCheckResult('error')
		} finally {
			setCheckingPayment(false)
		}
	}

	useEffect(() => {
		// Автоматический редирект через 5 секунд
		const timer = setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					router.push('/profile')
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [router])

	return (
		<div className='min-h-screen flex items-center justify-center px-4 bg-[#0a0f0e]'>
			<div className='max-w-md w-full bg-black/40 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-[0_0_30px_rgba(16,185,129,0.3)]'>
				<div className='text-6xl mb-4'>✅</div>
				<h1 className='text-2xl font-bold text-emerald-400 mb-4'>
					Платеж успешно обработан!
				</h1>

				{/* Статус проверки платежа */}
				{checkingPayment && (
					<div className='mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg'>
						<p className='text-yellow-400 text-sm'>
							🔍 Проверяем статус платежа...
						</p>
					</div>
				)}

				{checkResult === 'success' && (
					<div className='mb-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg'>
						<p className='text-emerald-400 text-sm font-semibold'>
							✅ Средства успешно начислены на баланс!
						</p>
					</div>
				)}

				{checkResult === 'already_processed' && (
					<div className='mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg'>
						<p className='text-blue-400 text-sm'>
							ℹ️ Платеж уже был обработан ранее
						</p>
					</div>
				)}

				{checkResult === 'failed' && (
					<div className='mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg'>
						<p className='text-red-400 text-sm'>
							⚠️ Платеж еще не подтвержден. Средства поступят автоматически.
						</p>
					</div>
				)}

				{checkResult === 'error' && (
					<div className='mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg'>
						<p className='text-red-400 text-sm'>
							❌ Ошибка при проверке. Проверьте баланс в профиле или обратитесь
							в поддержку.
						</p>
					</div>
				)}

				{!checkResult && !checkingPayment && (
					<p className='text-gray-300 mb-6'>
						Средства поступят на ваш баланс в течение нескольких минут.
					</p>
				)}

				{paymentId && (
					<p className='text-xs text-gray-500 mb-4'>PaymentId: {paymentId}</p>
				)}

				<p className='text-sm text-gray-400 mb-6'>
					Автоматический переход через {countdown} сек...
				</p>
				<div className='flex gap-3 justify-center'>
					<Link
						href='/profile'
						className='px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition'
					>
						Вернуться в профиль
					</Link>
					<Link
						href='/tasks'
						className='px-6 py-3 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition'
					>
						К задачам
					</Link>
				</div>
			</div>
		</div>
	)
}

export default function PaymentSuccessPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen flex items-center justify-center px-4 bg-[#0a0f0e]'>
					<div className='max-w-md w-full bg-black/40 border border-emerald-500/30 rounded-2xl p-8 text-center'>
						<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4' />
						<p className='text-gray-400'>Загрузка...</p>
					</div>
				</div>
			}
		>
			<PaymentSuccessContent />
		</Suspense>
	)
}
