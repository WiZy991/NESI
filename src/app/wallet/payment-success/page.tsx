'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PaymentSuccessPage() {
	const router = useRouter()
	const [countdown, setCountdown] = useState(5)

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
				<p className='text-gray-300 mb-6'>
					Средства поступят на ваш баланс в течение нескольких минут.
				</p>
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
