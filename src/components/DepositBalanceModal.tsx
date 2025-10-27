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
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
			<div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
				<div className='flex justify-between items-center mb-4'>
					<h2 className='text-xl font-bold text-gray-900'>Пополнить баланс</h2>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-gray-600'
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
					<div className='mb-4'>
						<label className='block text-sm font-medium text-gray-700 mb-2'>
							Сумма пополнения
						</label>
						<div className='relative'>
							<input
								type='text'
								value={amount}
								onChange={e => setAmount(e.target.value)}
								placeholder='Введите сумму'
								className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								disabled={loading}
								required
							/>
							<span className='absolute right-3 top-2 text-gray-500'>₽</span>
						</div>
					</div>

					<div className='mb-4'>
						<p className='text-sm text-gray-600 mb-2'>Быстрый выбор:</p>
						<div className='grid grid-cols-4 gap-2'>
							{quickAmounts.map(amt => (
								<button
									key={amt}
									type='button'
									onClick={() => setAmount(amt.toString())}
									className='px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors'
									disabled={loading}
								>
									{amt} ₽
								</button>
							))}
						</div>
					</div>

					{error && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
							<p className='text-sm text-red-600'>{error}</p>
						</div>
					)}

					<div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
						<p className='text-xs text-gray-600'>
							✅ Безопасная оплата через ЮKassa
							<br />
							💳 Принимаем карты Visa, Mastercard, МИР
							<br />
							🔒 Все данные защищены SSL-шифрованием
						</p>
					</div>

					<div className='flex gap-3'>
						<button
							type='button'
							onClick={onClose}
							className='flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
							disabled={loading}
						>
							Отмена
						</button>
						<button
							type='submit'
							className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400'
							disabled={loading}
						>
							{loading ? 'Создание...' : 'Перейти к оплате'}
						</button>
					</div>
				</form>

				<p className='text-xs text-gray-500 text-center mt-4'>
					Нажимая "Перейти к оплате", вы будете перенаправлены на безопасную
					страницу оплаты ЮKassa
				</p>
			</div>
		</div>
	)
}
