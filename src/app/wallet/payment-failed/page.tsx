'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PaymentFailedPage() {
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
			<div className='max-w-md w-full bg-black/40 border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]'>
				<div className='text-6xl mb-4'>❌</div>
				<h1 className='text-2xl font-bold text-red-400 mb-4'>Ошибка оплаты</h1>
				<p className='text-gray-300 mb-6'>
					Платёж не был завершён. Попробуйте ещё раз или свяжитесь с поддержкой.
				</p>
				<p className='text-sm text-gray-400 mb-6'>
					Автоматический переход через {countdown} сек...
				</p>
				<div className='flex gap-3 justify-center'>
					<Link
						href='/profile'
						className='px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition'
					>
						Вернуться в профиль
					</Link>
					<button
						onClick={() => router.back()}
						className='px-6 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition'
					>
						Попробовать снова
					</button>
				</div>
			</div>
		</div>
	)
}
