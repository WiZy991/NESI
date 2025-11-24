'use client'

import { useState } from 'react'
import { FaCreditCard, FaMobile, FaUniversity, FaWallet } from 'react-icons/fa'

interface WithdrawalFormProps {
	balance: number
	frozenBalance: number
	onSuccess: () => void
	token: string
}

// Список популярных банков для СБП
const SBP_BANKS = [
	{ id: '100000000004', name: 'Т-Банк', icon: '🏦' },
	{ id: '100000000111', name: 'Сбербанк', icon: '🟢' },
	{ id: '100000000005', name: 'ВТБ', icon: '🔵' },
	{ id: '100000000008', name: 'Альфа-Банк', icon: '🔴' },
	{ id: '100000000015', name: 'Райффайзенбанк', icon: '🟡' },
	{ id: '100000000012', name: 'Газпромбанк', icon: '⚪' },
]

export default function WithdrawalForm({
	balance,
	frozenBalance,
	onSuccess,
	token,
}: WithdrawalFormProps) {
	const [amount, setAmount] = useState(100)
	const [method, setMethod] = useState<'sbp' | 'card'>('sbp')
	const [phone, setPhone] = useState('')
	const [selectedBank, setSelectedBank] = useState(SBP_BANKS[0].id)
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpiry, setCardExpiry] = useState('')
	const [cardCvv, setCardCvv] = useState('')
	const [cardHolderName, setCardHolderName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	const availableBalance = balance - frozenBalance
	const minAmount = 1
	const maxAmount = availableBalance

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setSuccess(false)

		// Валидация
		if (amount < minAmount) {
			setError(`Минимальная сумма вывода: ${minAmount} ₽`)
			return
		}

		if (amount > maxAmount) {
			setError(
				`Недостаточно средств. Доступно: ${availableBalance.toFixed(2)} ₽`
			)
			return
		}

		if (method === 'sbp') {
			if (!phone.trim()) {
				setError('Укажите номер телефона')
				return
			}

			const phoneDigits = phone.trim().replace(/\D/g, '')
			if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
				setError('Номер должен быть в формате +7XXXXXXXXXX (11 цифр)')
				return
			}
		} else if (method === 'card') {
			// Валидация данных карты
			const cleanCardNumber = cardNumber.replace(/\D/g, '')
			if (cleanCardNumber.length < 16 || cleanCardNumber.length > 19) {
				setError('Номер карты должен содержать от 16 до 19 цифр')
				return
			}

			if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
				setError('Срок действия должен быть в формате MM/YY')
				return
			}

			if (cardCvv.length < 3 || cardCvv.length > 4) {
				setError('CVV должен содержать 3 или 4 цифры')
				return
			}

			if (!cardHolderName.trim()) {
				setError('Укажите имя держателя карты')
				return
			}
		}

		setLoading(true)

		try {
			const requestBody: any = {
				amount,
			}

			if (method === 'sbp') {
				const phoneDigits = phone.trim().replace(/\D/g, '')
				const formattedPhone = phoneDigits.startsWith('7')
					? phoneDigits
					: `7${phoneDigits.slice(-10)}`

				requestBody.phone = formattedPhone
				requestBody.sbpMemberId = selectedBank
			} else if (method === 'card') {
				// Для выплаты на карту передаем данные карты
				// PaymentRecipientId - это телефон или номер карты
				const cleanCardNumber = cardNumber.replace(/\D/g, '')
				requestBody.cardNumber = cleanCardNumber
				requestBody.cardExpiry = cardExpiry
				requestBody.cardCvv = cardCvv
				requestBody.cardHolderName = cardHolderName.trim()
				// PaymentRecipientId - последние 4 цифры номера карты или полный номер
				requestBody.paymentRecipientId = cleanCardNumber.slice(-4)
			}

			const response = await fetch('/api/wallet/tbank/create-withdrawal', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(requestBody),
			})

			const data = await response.json()

			if (!response.ok) {
				setError(data.error || data.details || 'Не удалось создать выплату')
				return
			}

			setSuccess(true)
			setAmount(100)
			setPhone('')
			setCardNumber('')
			setCardExpiry('')
			setCardCvv('')
			setCardHolderName('')
			onSuccess()

			// Показываем успешное сообщение
			setTimeout(() => setSuccess(false), 5000)
		} catch (err: any) {
			setError(err.message || 'Ошибка при выводе средств')
		} finally {
			setLoading(false)
		}
	}

	const handleQuickAmount = (value: number) => {
		setAmount(Math.min(value, maxAmount))
		setError(null)
	}

	return (
		<div className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 space-y-4'>
			<div className='flex items-center justify-between mb-4'>
				<h3 className='text-xl font-semibold text-emerald-400 flex items-center gap-2'>
					<FaWallet />
					Вывод средств
				</h3>
				<div className='text-right'>
					<p className='text-sm text-gray-400'>Доступно:</p>
					<p className='text-lg font-bold text-emerald-300'>
						{availableBalance.toFixed(2)} ₽
					</p>
				</div>
			</div>

			{/* Уведомления */}
			{success && (
				<div className='bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-4 text-emerald-400 animate-pulse'>
					<p className='font-semibold'>✅ Выплата создана!</p>
					<p className='text-sm text-emerald-300 mt-1'>
						Средства поступят на указанный номер в течение нескольких минут
					</p>
				</div>
			)}

			{error && (
				<div className='bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-400'>
					<p className='font-semibold'>⚠️ Ошибка:</p>
					<p className='text-sm mt-1 whitespace-pre-wrap'>{error}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className='space-y-4'>
				{/* Способ выплаты */}
				<div>
					<label className='block text-sm font-medium text-gray-300 mb-2'>
						Способ выплаты
					</label>
					<div className='grid grid-cols-2 gap-2'>
						<button
							type='button'
							onClick={() => setMethod('sbp')}
							className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition ${
								method === 'sbp'
									? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
									: 'border-gray-600 text-gray-400 hover:border-gray-500'
							}`}
						>
							<FaMobile />
							СБП (быстро)
						</button>
						<button
							type='button'
							onClick={() => {
								setMethod('card')
								setError(null)
							}}
							className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition ${
								method === 'card'
									? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
									: 'border-gray-600 text-gray-400 hover:border-gray-500'
							}`}
						>
							<FaCreditCard />
							На карту
						</button>
					</div>
				</div>

				{/* Форма для СБП */}
				{method === 'sbp' && (
					<>
						{/* Номер телефона */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								<FaMobile className='inline mr-2' />
								Номер телефона
							</label>
							<input
								type='tel'
								value={phone}
								onChange={e => {
									setPhone(e.target.value)
									setError(null)
								}}
								placeholder='+79991234567'
								className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition'
								disabled={loading}
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Введите номер в формате +7XXXXXXXXXX (11 цифр)
							</p>
						</div>

						{/* Выбор банка */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								<FaUniversity className='inline mr-2' />
								Банк получателя
							</label>
							<div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
								{SBP_BANKS.map(bank => (
									<button
										key={bank.id}
										type='button'
										onClick={() => setSelectedBank(bank.id)}
										className={`px-3 py-2 rounded-lg border text-sm transition ${
											selectedBank === bank.id
												? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
												: 'border-gray-600 text-gray-400 hover:border-gray-500'
										}`}
									>
										{bank.icon} {bank.name}
									</button>
								))}
							</div>
						</div>
					</>
				)}

				{/* Форма для выплаты на карту */}
				{method === 'card' && (
					<>
						{/* Номер карты */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								<FaCreditCard className='inline mr-2' />
								Номер карты
							</label>
							<input
								type='text'
								value={cardNumber}
								onChange={e => {
									// Форматируем номер карты с пробелами
									const value = e.target.value.replace(/\D/g, '').slice(0, 19)
									const formatted = value.replace(/(.{4})/g, '$1 ').trim()
									setCardNumber(formatted)
									setError(null)
								}}
								placeholder='0000 0000 0000 0000'
								className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition font-mono'
								disabled={loading}
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Введите 16-19 цифр номера карты
							</p>
						</div>

						{/* Срок действия и CVV */}
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Срок действия
								</label>
								<input
									type='text'
									value={cardExpiry}
									onChange={e => {
										let value = e.target.value.replace(/\D/g, '').slice(0, 4)
										if (value.length >= 2) {
											value = value.slice(0, 2) + '/' + value.slice(2)
										}
										setCardExpiry(value)
										setError(null)
									}}
									placeholder='MM/YY'
									className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition font-mono'
									disabled={loading}
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									CVV
								</label>
								<input
									type='text'
									value={cardCvv}
									onChange={e => {
										const value = e.target.value.replace(/\D/g, '').slice(0, 4)
										setCardCvv(value)
										setError(null)
									}}
									placeholder='123'
									className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition font-mono'
									disabled={loading}
									maxLength={4}
								/>
							</div>
						</div>

						{/* Имя держателя карты */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								Имя держателя карты
							</label>
							<input
								type='text'
								value={cardHolderName}
								onChange={e => {
									setCardHolderName(e.target.value.toUpperCase())
									setError(null)
								}}
								placeholder='IVAN PETROV'
								className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition uppercase'
								disabled={loading}
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Как указано на карте (латиница)
							</p>
						</div>
					</>
				)}

				{/* Сумма */}
				<div>
					<label className='block text-sm font-medium text-gray-300 mb-2'>
						Сумма вывода
					</label>
					<div className='relative'>
						<input
							type='number'
							value={amount}
							onChange={e => {
								const value = parseInt(e.target.value) || 0
								setAmount(value)
								setError(null)
							}}
							min={minAmount}
							max={maxAmount}
							step={100}
							className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-lg font-semibold'
							disabled={loading}
						/>
						<span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg'>
							₽
						</span>
					</div>

					{/* Быстрый выбор суммы */}
					<div className='flex gap-2 mt-2 flex-wrap'>
						{[100, 500, 1000, 5000].map(value => (
							<button
								key={value}
								type='button'
								onClick={() => handleQuickAmount(value)}
								disabled={value > maxAmount || loading}
								className='px-3 py-1 text-sm rounded border border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition disabled:opacity-30 disabled:cursor-not-allowed'
							>
								{value} ₽
							</button>
						))}
						<button
							type='button'
							onClick={() => handleQuickAmount(maxAmount)}
							disabled={maxAmount <= 0 || loading}
							className='px-3 py-1 text-sm rounded border border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition disabled:opacity-30 disabled:cursor-not-allowed'
						>
							Всё ({availableBalance.toFixed(0)} ₽)
						</button>
					</div>

					<div className='text-xs text-gray-400 mt-2 space-y-1'>
						<p>• Минимум: {minAmount} ₽</p>
						<p>• Комиссия: 0%</p>
						<p>• Время зачисления: 1-5 минут</p>
					</div>
				</div>

				{/* Кнопка вывода */}
				<button
					type='submit'
					disabled={loading || availableBalance < minAmount}
					className='w-full px-6 py-4 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
				>
					{loading ? (
						<span className='flex items-center justify-center gap-2'>
							<span className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
							Обработка...
						</span>
					) : (
						`Вывести ${amount} ₽`
					)}
				</button>
			</form>

			{/* Информация */}
			<div className='bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300'>
				<p className='font-semibold mb-1'>ℹ️ Важная информация:</p>
				<ul className='text-xs space-y-1 ml-4 list-disc text-blue-200'>
					<li>Выплаты обрабатываются через Систему быстрых платежей (СБП)</li>
					<li>
						Укажите номер телефона, привязанный к вашему банковскому счету
					</li>
					<li>Средства поступят на счет в течение нескольких минут</li>
					<li>Для вывода необходимо сначала пополнить баланс через Т-Банк</li>
				</ul>
			</div>
		</div>
	)
}
