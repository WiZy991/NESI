'use client'

import { useState } from 'react'

interface DepositBalanceModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
}

export default function DepositBalanceModal({
	isOpen,
	onClose,
	onSuccess,
}: DepositBalanceModalProps) {
	const [amount, setAmount] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const amountNum = parseFloat(amount.replace(',', '.'))

			if (isNaN(amountNum) || amountNum < 1) {
				setError('Минимальная сумма пополнения: 1.00 ₽')
				setLoading(false)
				return
			}

			if (amountNum > 100000) {
				setError('Максимальная сумма пополнения: 100,000.00 ₽')
				setLoading(false)
				return
			}

			const response = await fetch('/api/wallet/create-payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: amountNum }),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Ошибка создания платежа')
			}

			// Редирект на страницу оплаты ЮKassa
			if (data.confirmationUrl) {
				window.location.href = data.confirmationUrl
			} else {
				throw new Error('URL оплаты не получен')
			}
		} catch (err: any) {
			setError(err.message)
			setLoading(false)
		}
	}

	const quickAmounts = [100, 500, 1000, 5000]

	if (!isOpen) return null

	return (
		<div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
			<div className='bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-6 max-w-md w-full border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)] relative overflow-hidden'>
				{/* Декоративный фон */}
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none' />

				<div className='relative z-10'>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-2xl font-bold text-emerald-400 flex items-center gap-2'>
							<span className='text-3xl'>💳</span>
							Пополнить баланс
						</h2>
						<button
							onClick={onClose}
							className='text-gray-400 hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-500/10 rounded-lg'
							disabled={loading}
						>
							<svg
								className='w-6 h-6'
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
						</button>
					</div>

					<form onSubmit={handleSubmit}>
						<div className='mb-5'>
							<label className='block text-sm font-medium text-emerald-300 mb-2'>
								Сумма пополнения
							</label>
							<div className='relative'>
								<input
									type='text'
									value={amount}
									onChange={e => setAmount(e.target.value)}
									placeholder='Введите сумму'
									className='w-full px-4 py-3 bg-black/40 border border-emerald-500/30 text-white rounded-xl 
									focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
									placeholder-gray-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]'
									disabled={loading}
									required
								/>
								<span className='absolute right-4 top-3 text-emerald-400 font-medium'>
									₽
								</span>
							</div>
						</div>

						<div className='mb-5'>
							<p className='text-sm text-gray-400 mb-3'>⚡ Быстрый выбор:</p>
							<div className='grid grid-cols-4 gap-2'>
								{quickAmounts.map(amt => (
									<button
										key={amt}
										type='button'
										onClick={() => setAmount(amt.toString())}
										className='px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 
										text-emerald-400 rounded-lg text-sm font-medium transition-all
										hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105'
										disabled={loading}
									>
										{amt}
									</button>
								))}
							</div>
						</div>

						{error && (
							<div className='mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm'>
								<p className='text-sm text-red-400 flex items-start gap-2'>
									<span className='text-lg'>⚠️</span>
									<span>{error}</span>
								</p>
							</div>
						)}

						<div className='mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl backdrop-blur-sm'>
							<p className='text-xs text-gray-300 leading-relaxed space-y-1'>
								<span className='flex items-center gap-2'>
									<span className='text-emerald-400'>✅</span>
									<span>Безопасная оплата через ЮKassa</span>
								</span>
								<span className='flex items-center gap-2'>
									<span className='text-emerald-400'>💳</span>
									<span>Принимаем карты Visa, Mastercard, МИР</span>
								</span>
								<span className='flex items-center gap-2'>
									<span className='text-emerald-400'>🔒</span>
									<span>Все данные защищены SSL-шифрованием</span>
								</span>
							</p>
						</div>

						<div className='flex gap-3'>
							<button
								type='button'
								onClick={onClose}
								className='flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl 
								hover:bg-gray-700/50 hover:border-gray-500 transition-all font-medium'
								disabled={loading}
							>
								Отмена
							</button>
							<button
								type='submit'
								className='flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 
								text-white rounded-xl hover:from-emerald-500 hover:to-emerald-400 
								transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium
								shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]
								disabled:shadow-none'
								disabled={loading}
							>
								{loading ? (
									<span className='flex items-center justify-center gap-2'>
										<span className='animate-spin'>⏳</span>
										Создание...
									</span>
								) : (
									'Перейти к оплате'
								)}
							</button>
						</div>
					</form>

					<p className='text-xs text-gray-500 text-center mt-4 leading-relaxed'>
						Нажимая "Перейти к оплате", вы будете перенаправлены на безопасную
						страницу оплаты ЮKassa
					</p>
				</div>
			</div>
		</div>
	)
}
