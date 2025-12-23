'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaCreditCard, FaMobile, FaUniversity, FaWallet, FaPlus, FaTrash, FaStar } from 'react-icons/fa'

interface WithdrawalFormProps {
	balance: number
	frozenBalance: number
	onSuccess: () => void
	token: string
}

interface SbpBank {
	MemberId: string
	MemberName: string
	MemberNameRus: string
}

interface SavedCard {
	id: string
	cardId: string
	pan: string // маскированный номер карты
	expDate: string
	isDefault: boolean
}

// Список популярных банков для СБП (fallback)
const FALLBACK_BANKS: SbpBank[] = [
	{ MemberId: '100000000004', MemberName: 'Sberbank', MemberNameRus: 'Сбербанк' },
	{ MemberId: '100000000111', MemberName: 'Tinkoff', MemberNameRus: 'Т-Банк' },
	{ MemberId: '100000000007', MemberName: 'VTB', MemberNameRus: 'ВТБ' },
	{ MemberId: '100000000013', MemberName: 'Alfa-Bank', MemberNameRus: 'Альфа-Банк' },
	{ MemberId: '100000000015', MemberName: 'Raiffeisenbank', MemberNameRus: 'Райффайзенбанк' },
]

export default function WithdrawalForm({
	balance,
	frozenBalance,
	onSuccess,
	token,
}: WithdrawalFormProps) {
	const [amount, setAmount] = useState(100)
	const [method, setMethod] = useState<'sbp' | 'saved-card'>('sbp')
	const [phone, setPhone] = useState('')
	const [banks, setBanks] = useState<SbpBank[]>(FALLBACK_BANKS)
	const [selectedBank, setSelectedBank] = useState<string>('')
	const [loadingBanks, setLoadingBanks] = useState(false)
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpiry, setCardExpiry] = useState('')
	const [cardCvv, setCardCvv] = useState('')
	const [cardHolderName, setCardHolderName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	
	// Привязанные карты
	const [savedCards, setSavedCards] = useState<SavedCard[]>([])
	const [selectedCardId, setSelectedCardId] = useState<string>('')
	const [loadingCards, setLoadingCards] = useState(false)
	const [addingCard, setAddingCard] = useState(false)

	// Функция для загрузки карт
	const loadCards = useCallback(async () => {
		if (!token) return
		setLoadingCards(true)
		try {
			const response = await fetch('/api/wallet/tbank/cards', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			const data = await response.json()
			if (data.success && data.cards) {
				setSavedCards(data.cards)
				// Выбираем дефолтную карту
				const defaultCard = data.cards.find((c: SavedCard) => c.isDefault)
				if (defaultCard) {
					setSelectedCardId(defaultCard.cardId)
				} else if (data.cards.length > 0) {
					setSelectedCardId(data.cards[0].cardId)
				}
			}
		} catch (err) {
			console.error('Ошибка загрузки карт:', err)
		} finally {
			setLoadingCards(false)
		}
	}, [token])

	// Загружаем карты при монтировании
	useEffect(() => {
		loadCards()
	}, [loadCards])

	// Автоматическое обновление карт при возврате на страницу (после привязки)
	useEffect(() => {
		if (!token) return

		// Обновляем карты при фокусе на окне (возврат со страницы привязки)
		const handleFocus = () => {
			// Небольшая задержка, чтобы дать время webhook'у обработаться
			setTimeout(() => {
				loadCards()
			}, 1500)
		}

		// Обновляем при видимости страницы
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				setTimeout(() => {
					loadCards()
				}, 1500)
			}
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [token, loadCards])

	// Загружаем список банков при монтировании компонента
	useEffect(() => {
		const loadBanks = async () => {
			setLoadingBanks(true)
			try {
				const response = await fetch('/api/wallet/tbank/get-sbp-banks', {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				const data = await response.json()

				if (data.success && data.banks && data.banks.length > 0) {
					setBanks(data.banks)
					// Устанавливаем первый банк по умолчанию
					if (!selectedBank) {
						setSelectedBank(data.banks[0].MemberId)
					}
				} else if (data.banks && data.banks.length > 0) {
					// Используем fallback банки из ответа
					setBanks(data.banks)
					if (!selectedBank) {
						setSelectedBank(data.banks[0].MemberId)
					}
				} else {
					// Используем fallback банки
					setBanks(FALLBACK_BANKS)
					if (!selectedBank) {
						setSelectedBank(FALLBACK_BANKS[0].MemberId)
					}
				}
			} catch (err) {
				console.error('Ошибка загрузки списка банков:', err)
				// Используем fallback банки
				setBanks(FALLBACK_BANKS)
				if (!selectedBank) {
					setSelectedBank(FALLBACK_BANKS[0].MemberId)
				}
			} finally {
				setLoadingBanks(false)
			}
		}

		loadBanks()
	}, [token, selectedBank])

	// Добавление новой карты
	const handleAddCard = async () => {
		setAddingCard(true)
		setError(null)
		try {
			const response = await fetch('/api/wallet/tbank/add-card', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})
			const data = await response.json()
			
			if (data.success && data.paymentURL) {
				// Открываем страницу привязки карты T-Bank
				window.location.href = data.paymentURL
			} else {
				setError(data.error || 'Не удалось начать привязку карты')
			}
		} catch (err) {
			setError('Ошибка при привязке карты')
		} finally {
			setAddingCard(false)
		}
	}

	// Удаление карты
	const handleDeleteCard = async (cardId: string) => {
		if (!confirm('Удалить эту карту?')) return
		
		try {
			const response = await fetch(`/api/wallet/tbank/cards?cardId=${cardId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			const data = await response.json()
			
			if (data.success) {
				setSavedCards(cards => cards.filter(c => c.cardId !== cardId))
				if (selectedCardId === cardId) {
					const remaining = savedCards.filter(c => c.cardId !== cardId)
					setSelectedCardId(remaining[0]?.cardId || '')
				}
			} else {
				setError(data.error || 'Не удалось удалить карту')
			}
		} catch (err) {
			setError('Ошибка при удалении карты')
		}
	}

	// Установка дефолтной карты
	const handleSetDefaultCard = async (cardId: string) => {
		try {
			const response = await fetch('/api/wallet/tbank/cards', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ cardId }),
			})
			const data = await response.json()
			
			if (data.success) {
				setSavedCards(cards => cards.map(c => ({
					...c,
					isDefault: c.cardId === cardId,
				})))
			}
		} catch (err) {
			console.error('Ошибка установки дефолтной карты:', err)
		}
	}

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

			const phoneDigits = phone.replace(/\D/g, '')
			if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
				setError('Введите полный номер телефона (11 цифр)')
				return
			}

			if (!selectedBank) {
				setError('Выберите банк получателя')
				return
			}
		} else if (method === 'saved-card') {
			if (!selectedCardId) {
				setError('Выберите карту для вывода')
				return
			}
		}

			if (!cardHolderName.trim() || cardHolderName.trim().split(' ').length < 2) {
				setError('Укажите имя и фамилию держателя карты')
				return
			}
		}

		setLoading(true)

		try {
			const requestBody: any = {
				amount,
			}

			if (method === 'sbp') {
				// Извлекаем только цифры из форматированного телефона
				const phoneDigits = phone.replace(/\D/g, '')
				// Формат для API: 11 цифр начиная с 7
				const formattedPhone = phoneDigits.startsWith('7')
					? phoneDigits
					: `7${phoneDigits.slice(-10)}`

				requestBody.phone = formattedPhone
				requestBody.sbpMemberId = selectedBank
			} else if (method === 'saved-card') {
				// Используем привязанную карту
				requestBody.cardId = selectedCardId
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
				// Показываем понятное сообщение об ошибке
				let errorMessage = data.error || data.details || 'Не удалось создать выплату'
				
				// Если это ошибка о выводе на новую карту, предлагаем альтернативы
				if (errorMessage.includes('новая карта') || errorMessage.includes('CardData')) {
					errorMessage = 'Вывод на новую карту временно недоступен.\n\n' +
						'Доступные варианты:\n' +
						'• Привяжите карту заранее через кнопку "Привязать карту"\n' +
						'• Используйте вывод через СБП (Система быстрых платежей)'
				}
				
				setError(errorMessage)
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
							className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition text-sm ${
								method === 'sbp'
									? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
									: 'border-gray-600 text-gray-400 hover:border-gray-500'
							}`}
						>
							<FaMobile />
							СБП
						</button>
						<button
							type='button'
							onClick={() => {
								setMethod('saved-card')
								setError(null)
							}}
							className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition text-sm ${
								method === 'saved-card'
									? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
									: 'border-gray-600 text-gray-400 hover:border-gray-500'
							}`}
						>
							<FaCreditCard />
							Картой
							{savedCards.length > 0 && (
								<span className='bg-emerald-500/30 px-1.5 rounded text-xs'>
									{savedCards.length}
								</span>
							)}
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
								inputMode='tel'
								autoComplete='tel'
								value={phone}
								onChange={e => {
									// Убираем всё кроме цифр
									let digits = e.target.value.replace(/\D/g, '')
									
									// Если начинается с 8, заменяем на 7
									if (digits.startsWith('8')) {
										digits = '7' + digits.slice(1)
									}
									
									// Ограничиваем 11 цифрами
									digits = digits.slice(0, 11)
									
									// Форматируем: +7 (XXX) XXX-XX-XX
									let formatted = ''
									if (digits.length > 0) {
										formatted = '+7'
										if (digits.length > 1) {
											formatted += ' (' + digits.slice(1, 4)
										}
										if (digits.length >= 4) {
											formatted += ') ' + digits.slice(4, 7)
										}
										if (digits.length >= 7) {
											formatted += '-' + digits.slice(7, 9)
										}
										if (digits.length >= 9) {
											formatted += '-' + digits.slice(9, 11)
										}
									}
									
									setPhone(formatted)
									setError(null)
								}}
								placeholder='+7 (999) 123-45-67'
								className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition font-mono text-lg'
								disabled={loading}
								maxLength={18}
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Номер привязанный к счёту СБП
							</p>
						</div>

						{/* Выбор банка */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								<FaUniversity className='inline mr-2' />
								Банк получателя
								{loadingBanks && (
									<span className='ml-2 text-xs text-gray-400'>
										(загрузка...)
									</span>
								)}
							</label>
							{loadingBanks ? (
								<div className='text-center py-4 text-gray-400'>
									<span className='w-5 h-5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin inline-block' />
									<span className='ml-2'>Загрузка списка банков...</span>
								</div>
							) : (
								<>
									{/* Выпадающий список для выбора банка */}
									<select
										value={selectedBank}
										onChange={e => {
											setSelectedBank(e.target.value)
											setError(null)
										}}
										className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition mb-2'
										disabled={loading}
									>
										{banks.map(bank => (
											<option key={bank.MemberId} value={bank.MemberId}>
												{bank.MemberNameRus || bank.MemberName}
											</option>
										))}
									</select>
									<p className='text-xs text-gray-400'>
										Выберите банк, в который нужно вывести средства. Средства
										поступят на счет в выбранном банке, привязанный к указанному
										номеру телефона.
									</p>
								</>
							)}
						</div>
					</>
				)}

				{/* Форма для привязанных карт */}
				{method === 'saved-card' && (
					<div className='space-y-3'>
						{loadingCards ? (
							<div className='text-center py-4 text-gray-400'>
								<span className='w-5 h-5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin inline-block' />
								<span className='ml-2'>Загрузка карт...</span>
							</div>
						) : savedCards.length === 0 ? (
							<div className='bg-gray-800/50 rounded-lg p-4 text-center'>
								<p className='text-gray-400 mb-3'>У вас нет привязанных карт</p>
								<button
									type='button'
									onClick={handleAddCard}
									disabled={addingCard}
									className='inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition'
								>
									{addingCard ? (
										<span className='w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin' />
									) : (
										<FaPlus />
									)}
									Привязать карту
								</button>
							</div>
						) : (
							<>
								<div className='space-y-2'>
									{savedCards.map(card => (
										<div
											key={card.cardId}
											onClick={() => setSelectedCardId(card.cardId)}
											className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
												selectedCardId === card.cardId
													? 'border-emerald-400 bg-emerald-400/10'
													: 'border-gray-600 hover:border-gray-500'
											}`}
										>
											<div className='flex items-center gap-3'>
												<input
													type='radio'
													name='savedCard'
													checked={selectedCardId === card.cardId}
													onChange={() => setSelectedCardId(card.cardId)}
													className='w-4 h-4 text-emerald-400'
												/>
												<div>
													<div className='flex items-center gap-2'>
														<FaCreditCard className='text-gray-400' />
														<span className='font-mono text-white'>
															{card.pan}
														</span>
														{card.isDefault && (
															<FaStar className='text-yellow-400 text-xs' title='Карта по умолчанию' />
														)}
													</div>
													<span className='text-xs text-gray-400'>
														до {card.expDate.slice(0, 2)}/{card.expDate.slice(2)}
													</span>
												</div>
											</div>
											<div className='flex items-center gap-2'>
												{!card.isDefault && (
													<button
														type='button'
														onClick={(e) => {
															e.stopPropagation()
															handleSetDefaultCard(card.cardId)
														}}
														className='p-1.5 text-gray-400 hover:text-yellow-400 transition'
														title='Сделать основной'
													>
														<FaStar />
													</button>
												)}
												<button
													type='button'
													onClick={(e) => {
														e.stopPropagation()
														handleDeleteCard(card.cardId)
													}}
													className='p-1.5 text-gray-400 hover:text-red-400 transition'
													title='Удалить карту'
												>
													<FaTrash />
												</button>
											</div>
										</div>
									))}
								</div>
								<button
									type='button'
									onClick={handleAddCard}
									disabled={addingCard}
									className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/50 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400 transition'
								>
									{addingCard ? (
										<span className='w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin' />
									) : (
										<FaPlus />
									)}
									Привязать ещё карту
								</button>
							</>
						)}
					</div>
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
