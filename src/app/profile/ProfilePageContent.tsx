'use client'

import BadgeIcon from '@/components/BadgeIcon'
import BadgesModal from '@/components/BadgesModal'
import EditProfileModal from '@/components/EditProfileModal'
import { LevelBadge } from '@/components/LevelBadge'
import { ProfileBackgroundSelector } from '@/components/ProfileBackgroundSelector'
import { useUser } from '@/context/UserContext'
import { getBackgroundById } from '@/lib/level/profileBackgrounds'
import { getLevelVisuals } from '@/lib/level/rewards'
import '@/styles/level-animations.css'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
	FaAward,
	FaCalendarAlt,
	FaCertificate,
	FaChartLine,
	FaChevronRight,
	FaCode,
	FaDatabase,
	FaEdit,
	FaGlobe,
	FaJs,
	FaPython,
	FaStar,
	FaTasks,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
	FaWallet,
} from 'react-icons/fa'

type Review = {
	id: string
	rating: number
	comment: string
	createdAt: string
	task: { title: string }
	fromUser: { fullName?: string; email: string }
}

type FullUser = {
	id: string
	fullName?: string
	email: string
	role: string
	isExecutor?: boolean
	description?: string
	location?: string
	skills?: string[]
	avatarUrl?: string
	balance?: number
	frozenBalance?: number
	xp?: number
	xpComputed?: number
	completedTasksCount?: number
	avgRating?: number
	level?: {
		id: string
		name: string
		description: string
		slug: string
	}
	badges?: Array<{
		id: string
		earnedAt: string
		badge: {
			id: string
			name: string
			description: string
			icon: string
		}
	}>
	certifications?: Array<{
		id: string
		level: string
		grantedAt: string
		subcategory: {
			id: string
			name: string
		}
	}>
	executedTasks?: Array<{
		id: string
		title: string
		description: string
		price?: number
		completedAt?: string
		customer: {
			id: string
			fullName?: string
			email: string
		}
		review?: {
			id: string
			rating: number
			comment: string
		}
	}>
	_count?: {
		executedTasks: number
		reviewsReceived: number
		responses: number
	}
	customerStats?: {
		createdTasks: number
		completedTasks: number
		totalSpent: number
		uniqueExecutors: number
	}
}

type Tab =
	| 'overview'
	| 'achievements'
	| 'reviews'
	| 'tasks'
	| 'wallet'
	| 'certifications'

const getSkillIcon = (skill: string) => {
	const lower = skill.toLowerCase()
	// Языки программирования
	if (lower.includes('python'))
		return <FaPython className='mr-1 text-emerald-400' />
	if (
		lower.includes('js') ||
		lower.includes('javascript') ||
		lower.includes('typescript')
	)
		return <FaJs className='mr-1 text-yellow-400' />
	if (lower.includes('java')) return <FaCode className='mr-1 text-orange-400' />
	if (
		lower.includes('c#') ||
		lower.includes('csharp') ||
		lower.includes('.net')
	)
		return <FaCode className='mr-1 text-purple-400' />
	if (lower.includes('php')) return <FaCode className='mr-1 text-indigo-400' />
	if (lower.includes('go') || lower.includes('golang'))
		return <FaCode className='mr-1 text-cyan-400' />
	if (lower.includes('rust')) return <FaCode className='mr-1 text-orange-500' />
	if (lower.includes('ruby')) return <FaCode className='mr-1 text-red-400' />
	// Фреймворки и библиотеки
	if (
		lower.includes('react') ||
		lower.includes('next.js') ||
		lower.includes('nextjs')
	)
		return <FaCode className='mr-1 text-blue-400' />
	if (lower.includes('vue') || lower.includes('vue.js'))
		return <FaCode className='mr-1 text-green-400' />
	if (lower.includes('angular')) return <FaCode className='mr-1 text-red-500' />
	if (
		lower.includes('node') ||
		lower.includes('nodejs') ||
		lower.includes('node.js')
	)
		return <FaCode className='mr-1 text-green-500' />
	if (
		lower.includes('django') ||
		lower.includes('flask') ||
		lower.includes('fastapi')
	)
		return <FaCode className='mr-1 text-emerald-500' />
	if (lower.includes('laravel') || lower.includes('symfony'))
		return <FaCode className='mr-1 text-red-500' />
	// Базы данных
	if (
		lower.includes('sql') ||
		lower.includes('db') ||
		lower.includes('database') ||
		lower.includes('postgresql') ||
		lower.includes('mysql') ||
		lower.includes('mongodb')
	)
		return <FaDatabase className='mr-1 text-blue-400' />
	// Сеть и инфраструктура
	if (
		lower.includes('dns') ||
		lower.includes('network') ||
		lower.includes('aws') ||
		lower.includes('azure') ||
		lower.includes('gcp') ||
		lower.includes('docker') ||
		lower.includes('kubernetes')
	)
		return <FaGlobe className='mr-1 text-indigo-400' />
	// Дизайн
	if (
		lower.includes('figma') ||
		lower.includes('ui/ux') ||
		lower.includes('design') ||
		lower.includes('photoshop') ||
		lower.includes('illustrator')
	)
		return <FaCode className='mr-1 text-pink-400' />
	// Контент
	if (
		lower.includes('seo') ||
		lower.includes('smm') ||
		lower.includes('marketing') ||
		lower.includes('копирайтинг') ||
		lower.includes('контент')
	)
		return <FaCode className='mr-1 text-yellow-500' />
	// 1С
	if (lower.includes('1с') || lower.includes('1c'))
		return <FaCode className='mr-1 text-blue-500' />
	// Общее
	return <FaToolbox className='mr-1 text-gray-400' />
}

export default function ProfilePageContent() {
	const { user, token, loading, login } = useUser()
	const [reviews, setReviews] = useState<Review[]>([])
	const [profile, setProfile] = useState<FullUser | null>(null)
	const [loadingProfile, setLoadingProfile] = useState(true)
	const [activeTab, setActiveTab] = useState<Tab>('overview')
	const [customerCompletedTasks, setCustomerCompletedTasks] = useState<any[]>(
		[]
	)
	const [loadingCustomerTasks, setLoadingCustomerTasks] = useState(false)

	const [transactions, setTransactions] = useState<any[]>([])
	const [transactionsLoaded, setTransactionsLoaded] = useState(false)
	const [amount, setAmount] = useState(100)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [withdrawError, setWithdrawError] = useState<string | null>(null)
	const [withdrawLoading, setWithdrawLoading] = useState(false)

	// Состояния для пополнения баланса
	const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
	const [depositAmount, setDepositAmount] = useState(1000)
	const [depositLoading, setDepositLoading] = useState(false)
	const [depositError, setDepositError] = useState<string | null>(null)
	const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
	const [checkingPayment, setCheckingPayment] = useState(false)
	const [checkingBadges, setCheckingBadges] = useState(false)
	const [badgesModalOpen, setBadgesModalOpen] = useState(false)
	const [lockedBadges, setLockedBadges] = useState<any[]>([])
	const [backgroundSelectorOpen, setBackgroundSelectorOpen] = useState(false)
	const [profileBackground, setProfileBackground] = useState<string | null>(
		null
	)
	const [userLevel, setUserLevel] = useState(1)

	const fetchProfile = async () => {
		if (!token) return
		try {
			const res = await fetch('/api/profile', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error('Ошибка загрузки профиля')
			const data = await res.json()
			console.log('Профиль загружен:', {
				skills: data.user?.skills,
				role: data.user?.role,
			})
			setProfile(data.user)
			login(data.user, token)

			// Загружаем фон профиля
			const bgRes = await fetch('/api/profile/background', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (bgRes.ok) {
				const bgData = await bgRes.json()
				setProfileBackground(bgData.backgroundId || 'default')
			}

			// Получаем уровень через API (так как getLevelFromXP использует Prisma и работает только на сервере)
			const levelRes = await fetch('/api/users/me/level', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (levelRes.ok) {
				const levelData = await levelRes.json()
				setUserLevel(levelData.level || 1)
			} else {
				// Fallback: используем уровень из профиля или дефолтный
				setUserLevel(parseInt(data.user?.level?.slug || '1') || 1)
			}
		} catch (err) {
			console.error('Ошибка загрузки профиля:', err)
		} finally {
			setLoadingProfile(false)
		}
	}

	// Ленивая загрузка транзакций только при открытии вкладки wallet
	useEffect(() => {
		const fetchTransactions = async () => {
			if (!token || activeTab !== 'wallet' || transactionsLoaded) return
			try {
				const txRes = await fetch('/api/wallet/transactions', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (txRes.ok) {
					const txData = await txRes.json()
					setTransactions(txData.transactions || [])
					setTransactionsLoaded(true)
				}
			} catch (txErr) {
				console.error('Ошибка загрузки транзакций:', txErr)
			}
		}
		fetchTransactions()
	}, [token, activeTab, transactionsLoaded])

	useEffect(() => {
		fetchProfile()
		// Восстанавливаем последний PaymentId из localStorage
		const savedPaymentId = localStorage.getItem('lastTBankPaymentId')
		if (savedPaymentId) {
			setLastPaymentId(savedPaymentId)
		}
	}, [token])

	// Функция для ручной проверки платежа
	const handleCheckPayment = async () => {
		if (!lastPaymentId) {
			alert('Нет сохраненного ID платежа')
			return
		}

		setCheckingPayment(true)
		try {
			const res = await fetch('/api/wallet/tbank/check-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ paymentId: lastPaymentId }),
			})

			const data = await res.json()

			if (!res.ok) {
				alert(data.error || 'Ошибка при проверке платежа')
				return
			}

			if (data.alreadyProcessed) {
				alert('Платеж уже обработан ранее')
			} else if (data.success) {
				alert(`✅ Средства начислены! Новый баланс: ${data.newBalance} ₽`)
				await fetchProfile()
				localStorage.removeItem('lastTBankPaymentId')
				setLastPaymentId(null)
			} else {
				alert(`Платеж в статусе: ${data.status || 'неизвестно'}`)
			}
		} catch (err: any) {
			alert('Ошибка при проверке платежа: ' + err.message)
		} finally {
			setCheckingPayment(false)
		}
	}

	// Загружаем отзывы только когда открыта вкладка reviews (ленивая загрузка)
	useEffect(() => {
		const fetchReviews = async () => {
			if (!user || activeTab !== 'reviews' || reviews.length > 0) return
			try {
				const res = await fetch('/api/reviews/me', {
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				})
				const data = await res.json()
				setReviews(data.reviews || [])
			} catch (err) {
				console.error('Ошибка загрузки отзывов:', err)
			}
		}

		fetchReviews()
	}, [user, token, activeTab])

	// Загружаем завершенные задачи для заказчика
	useEffect(() => {
		const fetchCustomerTasks = async () => {
			if (!user || user.role !== 'customer' || activeTab !== 'tasks') return
			if (loadingCustomerTasks) return // Предотвращаем повторные запросы
			try {
				setLoadingCustomerTasks(true)
				const res = await fetch('/api/tasks?mine=true&status=completed', {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
				if (res.ok) {
					const data = await res.json()
					setCustomerCompletedTasks(data.tasks || [])
				}
			} catch (err) {
				console.error('Ошибка загрузки задач заказчика:', err)
			} finally {
				setLoadingCustomerTasks(false)
			}
		}

		fetchCustomerTasks()
	}, [user, token, activeTab])

	// Автоматическая проверка достижений при открытии вкладки (как у исполнителей на странице /level)
	useEffect(() => {
		if (activeTab === 'achievements' && token && !checkingBadges) {
			const checkBadges = async () => {
				setCheckingBadges(true)
				try {
					await fetch('/api/badges/check', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
					})
					// Обновляем профиль после проверки
					fetchProfile()
				} catch (badgeError) {
					console.error('Ошибка проверки достижений:', badgeError)
				} finally {
					setCheckingBadges(false)
				}
			}
			checkBadges()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, token])

	// Загрузка скрытых достижений при открытии вкладки достижений
	useEffect(() => {
		if (activeTab === 'achievements' && token) {
			const fetchLockedBadges = async () => {
				try {
					const res = await fetch('/api/badges/all', {
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
					})
					if (res.ok) {
						const data = await res.json()
						setLockedBadges(data.locked || [])
					}
				} catch (err) {
					console.error('Ошибка загрузки скрытых достижений:', err)
				}
			}
			fetchLockedBadges()
		}
	}, [activeTab, token])

	const handleDeposit = async () => {
		if (!depositAmount || depositAmount < 1) {
			setDepositError('Минимальная сумма пополнения: 1 ₽')
			return
		}

		if (depositAmount > 300000) {
			setDepositError('Максимальная сумма пополнения: 300,000 ₽')
			return
		}

		setDepositError(null)
		setDepositLoading(true)

		try {
			const res = await fetch('/api/wallet/tbank/create-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ amount: depositAmount }),
			})

			const data = await res.json()

			if (!res.ok) {
				setDepositError(data.error || 'Не удалось создать платеж')
				return
			}

			// Сохраняем PaymentId для возможной ручной проверки
			if (data.paymentId) {
				setLastPaymentId(data.paymentId)
				// Сохраняем в localStorage на случай перезагрузки страницы
				localStorage.setItem('lastTBankPaymentId', data.paymentId)
			}

			// Перенаправляем на страницу оплаты Т-Банка
			if (data.paymentUrl) {
				window.location.href = data.paymentUrl
			} else {
				setDepositError('Не получена ссылка на оплату')
			}
		} catch (err: any) {
			setDepositError(err.message || 'Ошибка при создании платежа')
		} finally {
			setDepositLoading(false)
		}
	}

	const handleWithdraw = async () => {
		if (!amount || amount <= 0) {
			setWithdrawError('Укажите сумму для вывода')
			return
		}

		if (amount < 100) {
			setWithdrawError('Минимальная сумма вывода: 100 ₽')
			return
		}

		setWithdrawError(null)
		setWithdrawLoading(true)

		try {
			// Используем новый API для вывода через Т-Банк
			// Примечание: для вывода нужен DealId от предыдущего пополнения
			// В реальной системе нужно сохранять DealId при пополнении
			const res = await fetch('/api/wallet/tbank/create-withdrawal', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					amount,
					// TODO: добавить выбор способа выплаты (карта, СБП)
					// cardId, phone, sbpMemberId
				}),
			})

			const data = await res.json()

			if (!res.ok) {
				setWithdrawError(
					data.error || data.details || 'Не удалось вывести средства'
				)
				return
			}

			await fetchProfile()
			setAmount(100)
			setWithdrawError(null)

			// Показываем успешное сообщение
			alert(
				'Заявка на вывод средств создана. Средства поступят в течение нескольких минут.'
			)
		} catch (err: any) {
			setWithdrawError(err.message || 'Ошибка при выводе средств')
		} finally {
			setWithdrawLoading(false)
		}
	}

	const handleProfileUpdateSuccess = () => {
		fetchProfile()
	}

	if (loading || !user || loadingProfile || !profile) {
		return (
			<div className='flex items-center justify-center min-h-[60vh]'>
				<div className='text-center'>
					<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4' />
					<p className='text-gray-400'>Загрузка профиля...</p>
				</div>
			</div>
		)
	}

	const avatarSrc = profile.avatarUrl
		? profile.avatarUrl.startsWith('http')
			? profile.avatarUrl
			: `${typeof window !== 'undefined' ? window.location.origin : ''}${
					profile.avatarUrl
			  }`
		: null

	const tabs: Array<{
		id: Tab
		label: string
		icon: React.ReactNode
		count?: number
	}> = [
		{ id: 'overview', label: 'Обзор', icon: <FaUserCircle /> },
		{
			id: 'achievements',
			label: 'Достижения',
			icon: <FaTrophy />,
			count: profile.badges?.length,
		},
		{
			id: 'reviews',
			label: 'Отзывы',
			icon: <FaStar />,
			count: profile._count?.reviewsReceived,
		},
		{
			id: 'tasks',
			label: 'Задачи',
			icon: <FaTasks />,
			count:
				user.role === 'executor' ? profile.executedTasks?.length : undefined,
		},
		...(user.role === 'executor'
			? [
					{
						id: 'certifications' as Tab,
						label: 'Сертификации',
						icon: <FaCertificate />,
						count: profile.certifications?.length,
					},
			  ]
			: []),
		{ id: 'wallet', label: 'Кошелёк', icon: <FaWallet /> },
	]

	// Получаем градиент фона
	const background = profileBackground
		? getBackgroundById(profileBackground)
		: null
	const backgroundStyle = background
		? { background: background.gradient }
		: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }

	// Определяем, нужна ли анимация (для премиум фонов уровня 5+)
	const shouldAnimate = background?.isPremium && background?.unlockLevel >= 5
	const backgroundClass = shouldAnimate ? 'level-legendary-gradient' : ''

	// Добавляем декоративные элементы для всех фонов
	const decorativeClass = background?.id ? `${background.id}-background` : ''

	return (
		<div className='max-w-7xl mx-auto p-4 sm:p-6'>
			{/* Компактный Header профиля */}
			<div
				className={`rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] p-6 mb-6 relative overflow-hidden ${backgroundClass} ${decorativeClass}`}
				style={backgroundStyle}
			>
				{/* Overlay для читаемости текста (более прозрачный для премиум фонов) */}
				<div
					className={`absolute inset-0 pointer-events-none z-[2] ${
						shouldAnimate ? 'bg-black/30' : 'bg-black/40'
					}`}
				/>
				<div className='relative z-10'>
					<div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
						{/* Аватар */}
						<div className='relative'>
							{(() => {
								const visuals =
									userLevel > 0 ? getLevelVisuals(userLevel) : null
								const borderClass =
									visuals?.borderClass || 'border-emerald-500/50'
								return avatarSrc ? (
									<Image
										src={avatarSrc}
										alt='Аватар'
										width={80}
										height={80}
										className={`w-20 h-20 rounded-full border-2 ${borderClass} shadow-[0_0_15px_rgba(16,185,129,0.5)] object-cover`}
									/>
								) : (
									<div
										className={`w-20 h-20 rounded-full border-2 ${borderClass} bg-gray-800 flex items-center justify-center`}
									>
										<FaUserCircle className='text-4xl text-gray-600' />
									</div>
								)
							})()}
						</div>

						{/* Основная информация */}
						<div className='flex-1 min-w-0'>
							<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
								<div>
									<div className='flex items-center gap-2 flex-wrap mb-1'>
										<h1 className='text-2xl sm:text-3xl font-bold text-white truncate'>
											{profile.fullName || 'Без имени'}
										</h1>
										{userLevel > 0 && (
											<LevelBadge level={userLevel} size='md' />
										)}
									</div>
									<p className='text-gray-400 text-sm truncate'>
										{profile.email}
									</p>
									{profile.location && (
										<p className='text-emerald-300 text-sm mt-1'>
											📍 {profile.location}
										</p>
									)}
								</div>
								<div className='flex gap-2'>
									{/* Кнопка изменения фона только для исполнителей */}
									{user.role === 'executor' && (
										<button
											onClick={() => setBackgroundSelectorOpen(true)}
											className='flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black transition font-semibold text-sm whitespace-nowrap'
											title='Выбрать фон профиля'
										>
											🎨 Фон
										</button>
									)}
									<button
										onClick={() => setIsEditModalOpen(true)}
										className='flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold text-sm whitespace-nowrap'
									>
										<FaEdit />
										Редактировать
									</button>
								</div>
							</div>

							{/* Быстрая статистика */}
							{user.role === 'executor' && (
								<div className='flex flex-wrap gap-4 mt-4'>
									<div className='flex items-center gap-2 text-sm'>
										<FaChartLine className='text-emerald-400' />
										<span className='text-gray-300'>
											{profile.xpComputed ?? profile.xp ?? 0} XP
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaTasks className='text-blue-400' />
										<span className='text-gray-300'>
											{profile._count?.executedTasks || 0} задач
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaStar className='text-yellow-400' />
										<span className='text-gray-300'>
											{profile.avgRating != null
												? Number(profile.avgRating).toFixed(1)
												: '—'}{' '}
											/ 5
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaWallet className='text-green-400' />
										<span className='text-gray-300'>
											{Number(profile.balance ?? 0).toFixed(2)} ₽
										</span>
									</div>
								</div>
							)}
							{/* Быстрая статистика для заказчиков */}
							{user.role === 'customer' && (
								<div className='flex flex-wrap gap-4 mt-4'>
									{profile.avgRating && (
										<div className='flex items-center gap-2 text-sm'>
											<FaStar className='text-yellow-400' />
											<span className='text-gray-300'>
												{Number(profile.avgRating).toFixed(1)} / 5 (
												{profile._count?.reviewsReceived || 0} отзывов)
											</span>
										</div>
									)}
									{profile.customerStats && (
										<>
											<div className='flex items-center gap-2 text-sm'>
												<FaTasks className='text-blue-400' />
												<span className='text-gray-300'>
													{profile.customerStats.completedTasks || 0} завершено
												</span>
											</div>
											<div className='flex items-center gap-2 text-sm'>
												<FaWallet className='text-green-400' />
												<span className='text-gray-300'>
													{Number(profile.balance ?? 0).toFixed(2)} ₽
												</span>
											</div>
										</>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Табы */}
			<div className='flex gap-2 mb-6 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
				{tabs.map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
							activeTab === tab.id
								? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
								: 'bg-black/40 border border-gray-700/50 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400'
						}`}
					>
						{tab.icon}
						{tab.label}
						{tab.count !== undefined && tab.count > 0 && (
							<span className='bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-xs font-semibold'>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Контент табов */}
			<div className='space-y-6'>
				{/* Обзор */}
				{activeTab === 'overview' && (
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						{/* Левая колонка */}
						<div className='lg:col-span-1 space-y-4'>
							{/* Описание */}
							{profile.description && (
								<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
									<h3 className='text-lg font-semibold text-emerald-400 mb-2'>
										О себе
									</h3>
									<p className='text-gray-300 text-sm leading-relaxed'>
										{profile.description}
									</p>
								</div>
							)}

							{/* Навыки - только для исполнителей */}
							{user.role === 'executor' &&
								profile.skills &&
								Array.isArray(profile.skills) &&
								profile.skills.length > 0 && (
									<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
										<h3 className='text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2'>
											<FaToolbox />
											Навыки
										</h3>
										<div className='flex flex-wrap gap-2'>
											{profile.skills
												.filter(skill => skill && skill.trim())
												.map((skill, index) => (
													<div
														key={index}
														className='flex items-center px-3 py-1.5 rounded-full text-xs border border-emerald-500/40 bg-black/60'
													>
														{getSkillIcon(skill)}
														<span>{skill.trim()}</span>
													</div>
												))}
										</div>
									</div>
								)}

							{/* Быстрые действия */}
							<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
								<h3 className='text-lg font-semibold text-emerald-400 mb-3'>
									⚡ Быстрые действия
								</h3>
								<div className='space-y-2'>
									<Link
										href='/analytics'
										className='flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:border-purple-400/50 transition group'
									>
										<div className='flex items-center gap-3'>
											<span className='text-xl'>📊</span>
											<span className='text-white font-medium'>Аналитика</span>
										</div>
										<FaChevronRight className='text-gray-400 group-hover:text-purple-400 transition' />
									</Link>
									{/* Портфолио - только для исполнителей */}
									{user.role === 'executor' && (
										<Link
											href='/portfolio'
											className='flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:border-blue-400/50 transition group'
										>
											<div className='flex items-center gap-3'>
												<span className='text-xl'>💼</span>
												<span className='text-white font-medium'>
													Портфолио
												</span>
											</div>
											<FaChevronRight className='text-gray-400 group-hover:text-blue-400 transition' />
										</Link>
									)}
									{profile.isExecutor && (
										<Link
											href='/level'
											className='flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:border-indigo-400/50 transition group'
										>
											<div className='flex items-center gap-3'>
												<span className='text-xl'>⭐</span>
												<span className='text-white font-medium'>
													Мой уровень
												</span>
											</div>
											<FaChevronRight className='text-gray-400 group-hover:text-indigo-400 transition' />
										</Link>
									)}
								</div>
							</div>
						</div>

						{/* Правая колонка */}
						<div className='lg:col-span-2 space-y-4'>
							{/* Статистика для исполнителей */}
							{user.role === 'executor' && (
								<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
									<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
										<FaChartLine />
										Статистика
									</h3>
									<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
										<div className='text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20'>
											<div className='text-2xl font-bold text-emerald-300'>
												{profile._count?.executedTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Задач выполнено
											</div>
										</div>
										<div className='text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20'>
											<div className='text-2xl font-bold text-blue-300'>
												{profile._count?.reviewsReceived || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Отзывов</div>
										</div>
										<div className='text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20'>
											<div className='text-2xl font-bold text-yellow-300'>
												{profile.avgRating != null
													? Number(profile.avgRating).toFixed(1)
													: '—'}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Рейтинг</div>
										</div>
										<div className='text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20'>
											<div className='text-2xl font-bold text-purple-300'>
												{profile._count?.responses || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Откликов</div>
										</div>
									</div>
								</div>
							)}

							{/* Статистика для заказчиков */}
							{user.role === 'customer' && profile.customerStats && (
								<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
									<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
										<FaChartLine />
										Статистика
									</h3>
									<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
										{profile.avgRating && (
											<div className='text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20'>
												<div className='text-2xl font-bold text-yellow-300'>
													{Number(profile.avgRating).toFixed(1)}
												</div>
												<div className='text-xs text-gray-400 mt-1'>
													Рейтинг
												</div>
											</div>
										)}
										<div className='text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20'>
											<div className='text-2xl font-bold text-blue-300'>
												{profile._count?.reviewsReceived || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Отзывов</div>
										</div>
										<div className='text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20'>
											<div className='text-2xl font-bold text-emerald-300'>
												{profile.customerStats.createdTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Созданных задач
											</div>
										</div>
										<div className='text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20'>
											<div className='text-2xl font-bold text-purple-300'>
												{profile.customerStats.completedTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Завершено
											</div>
										</div>
										<div className='text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20'>
											<div className='text-2xl font-bold text-orange-300'>
												{profile.customerStats.totalSpent
													? Math.round(
															profile.customerStats.totalSpent
													  ).toLocaleString('ru-RU')
													: 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Потрачено ₽
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Достижения */}
				{activeTab === 'achievements' && (
					<div>
						{checkingBadges && (
							<div className='mb-4 text-center py-2'>
								<div className='inline-flex items-center gap-2 text-emerald-400 text-sm'>
									<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
									<span>Проверка достижений...</span>
								</div>
							</div>
						)}

						{profile.badges &&
						Array.isArray(profile.badges) &&
						profile.badges.length > 0 ? (
							<div className='space-y-6'>
								<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
									{profile.badges.map(userBadge => (
										<div
											key={userBadge.id}
											className='group relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] cursor-default'
										>
											{/* Декоративный фон */}
											<div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
											<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>

											<div className='relative z-10'>
												<div className='flex items-start gap-4 mb-4'>
													{/* Игровая иконка бейджа */}
													<div className='flex-shrink-0'>
														<BadgeIcon
															icon={userBadge.badge.icon}
															name={userBadge.badge.name}
															size='md'
															className='group-hover:scale-110'
														/>
													</div>

													{/* Название и дата */}
													<div className='flex-1 min-w-0 pt-1'>
														<h4 className='font-bold text-white text-base mb-1 group-hover:text-emerald-300 transition line-clamp-2'>
															{userBadge.badge.name}
														</h4>
														<p className='text-xs text-gray-400'>
															{new Date(userBadge.earnedAt).toLocaleDateString(
																'ru-RU',
																{
																	day: 'numeric',
																	month: 'long',
																	year: 'numeric',
																}
															)}
														</p>
													</div>
												</div>

												{/* Описание */}
												<div className='bg-black/30 border border-gray-800/50 rounded-lg p-3'>
													<p className='text-xs text-gray-300 leading-relaxed'>
														{userBadge.badge.description}
													</p>
												</div>
											</div>

											{/* Блестящий эффект сверху */}
											<div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
										</div>
									))}
								</div>

								{/* Кнопка показать скрытые достижения */}
								{lockedBadges.length > 0 && (
									<button
										onClick={() => setBadgesModalOpen(true)}
										className='w-full py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-base font-semibold flex items-center justify-center gap-2'
									>
										<span>🔒</span>
										<span>
											Показать скрытые достижения ({lockedBadges.length})
										</span>
									</button>
								)}
							</div>
						) : (
							<div className='space-y-4'>
								<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
									<FaTrophy className='text-6xl text-gray-600 mx-auto mb-4' />
									<p className='text-gray-400'>Пока нет достижений</p>
									{user.role === 'customer' && (
										<p className='text-gray-500 text-sm mt-2'>
											Создавайте задачи, завершайте их и получайте достижения!
										</p>
									)}
									{user.role === 'executor' && (
										<p className='text-gray-500 text-sm mt-2'>
											Выполняйте задачи и получайте достижения!
										</p>
									)}
								</div>

								{/* Кнопка показать скрытые достижения */}
								{lockedBadges.length > 0 && (
									<button
										onClick={() => setBadgesModalOpen(true)}
										className='w-full py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-base font-semibold flex items-center justify-center gap-2'
									>
										<span>🔒</span>
										<span>
											Показать скрытые достижения ({lockedBadges.length})
										</span>
									</button>
								)}
							</div>
						)}
					</div>
				)}

				{/* Отзывы */}
				{activeTab === 'reviews' && (
					<div>
						{reviews.length > 0 ? (
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{reviews.map(review => (
									<div
										key={review.id}
										className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'
									>
										<div className='flex justify-between items-center mb-3'>
											<h4 className='font-semibold text-white text-sm'>
												{review.task?.title || 'Без названия'}
											</h4>
											<div className='flex items-center gap-1'>
												{[...Array(5)].map((_, i) => (
													<FaStar
														key={i}
														className={`text-xs ${
															i < review.rating
																? 'text-yellow-400'
																: 'text-gray-600'
														}`}
													/>
												))}
											</div>
										</div>
										<p className='text-gray-300 text-sm italic mb-3'>
											"{review.comment?.trim() || 'Без комментария'}"
										</p>
										<div className='flex justify-between text-xs text-gray-400'>
											<span>
												{review.fromUser?.fullName || review.fromUser?.email}
											</span>
											<span>
												{new Date(review.createdAt).toLocaleDateString('ru-RU')}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaStar className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет отзывов</p>
							</div>
						)}
					</div>
				)}

				{/* Сертификации */}
				{activeTab === 'certifications' && (
					<div>
						{profile.certifications && profile.certifications.length > 0 ? (
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{profile.certifications.map(cert => (
									<div
										key={cert.id}
										className='bg-gradient-to-br from-black/40 via-emerald-900/20 to-black/40 p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
									>
										<div className='flex items-center gap-3 mb-3'>
											<div className='w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 border border-yellow-400/30 flex items-center justify-center'>
												<FaAward className='text-2xl text-yellow-400' />
											</div>
											<div className='flex-1 min-w-0'>
												<h4 className='font-bold text-emerald-300 text-base truncate'>
													{cert.subcategory.name}
												</h4>
												<p className='text-xs text-gray-400'>
													Уровень: {cert.level}
												</p>
											</div>
										</div>
										<div className='pt-3 border-t border-emerald-500/20'>
											<div className='flex items-center gap-2 text-xs text-gray-400'>
												<FaCalendarAlt className='text-emerald-400' />
												<span>
													Получено:{' '}
													{new Date(cert.grantedAt).toLocaleDateString(
														'ru-RU',
														{
															day: 'numeric',
															month: 'long',
															year: 'numeric',
														}
													)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-16 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaCertificate className='text-6xl text-gray-600 mx-auto mb-4 opacity-50' />
								<p className='text-gray-400 text-lg font-medium'>
									Пока нет сертификаций
								</p>
								<p className='text-gray-500 text-sm mt-2'>
									Пройдите тесты по категориям, чтобы получить сертификацию
								</p>
							</div>
						)}
					</div>
				)}

				{/* Задачи */}
				{activeTab === 'tasks' && (
					<div>
						{user.role === 'executor' ? (
							// Для исполнителя - выполненные задачи
							profile.executedTasks && profile.executedTasks.length > 0 ? (
								<div className='space-y-3'>
									{profile.executedTasks.map(task => (
										<Link
											key={task.id}
											href={`/tasks/${task.id}`}
											className='block bg-black/40 p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all'
										>
											<div className='flex justify-between items-start mb-2'>
												<h4 className='font-semibold text-white'>
													{task.title}
												</h4>
												{task.price && (
													<span className='text-emerald-300 font-semibold text-sm'>
														{task.price} ₽
													</span>
												)}
											</div>
											<p className='text-gray-300 text-sm mb-3 line-clamp-2'>
												{task.description}
											</p>
											<div className='flex justify-between items-center text-xs text-gray-400'>
												<span>
													Заказчик:{' '}
													{task.customer.fullName || task.customer.email}
												</span>
												{task.completedAt && (
													<span className='flex items-center gap-1'>
														<FaCalendarAlt />
														{new Date(task.completedAt).toLocaleDateString()}
													</span>
												)}
											</div>
										</Link>
									))}
								</div>
							) : (
								<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
									<FaTasks className='text-6xl text-gray-600 mx-auto mb-4' />
									<p className='text-gray-400'>Пока нет выполненных задач</p>
									<Link
										href='/tasks'
										className='mt-4 inline-block text-emerald-400 hover:text-emerald-300 underline'
									>
										Перейти к задачам
									</Link>
								</div>
							)
						) : // Для заказчика - завершенные задачи
						loadingCustomerTasks ? (
							<div className='text-center py-12'>
								<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4' />
								<p className='text-gray-400'>Загрузка задач...</p>
							</div>
						) : customerCompletedTasks.length > 0 ? (
							<div className='space-y-3'>
								{customerCompletedTasks.map((task: any) => (
									<Link
										key={task.id}
										href={`/tasks/${task.id}`}
										className='block bg-black/40 p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all'
									>
										<div className='flex justify-between items-start mb-2'>
											<h4 className='font-semibold text-white'>{task.title}</h4>
											{task.price && (
												<span className='text-emerald-300 font-semibold text-sm'>
													{Number(task.price).toFixed(2)} ₽
												</span>
											)}
										</div>
										<p className='text-gray-300 text-sm mb-3 line-clamp-2'>
											{task.description}
										</p>
										<div className='flex justify-between items-center text-xs text-gray-400'>
											<span>
												Исполнитель:{' '}
												{task.executor?.fullName ||
													task.executor?.email ||
													'Не назначен'}
											</span>
											{task.completedAt && (
												<span className='flex items-center gap-1'>
													<FaCalendarAlt />
													{new Date(task.completedAt).toLocaleDateString()}
												</span>
											)}
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaTasks className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет завершенных задач</p>
								<Link
									href='/tasks'
									className='mt-4 inline-block text-emerald-400 hover:text-emerald-300 underline'
								>
									Перейти к задачам
								</Link>
							</div>
						)}
					</div>
				)}

				{/* Кошелёк */}
				{activeTab === 'wallet' && (
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						<div className='lg:col-span-2 space-y-4'>
							{/* Баланс */}
							<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
								<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
									<FaWallet />
									Баланс
								</h3>
								<div className='mb-4'>
									<p className='text-3xl font-bold text-emerald-300 mb-2'>
										{Number(profile.balance ?? 0).toFixed(2)} ₽
									</p>
									{profile.frozenBalance &&
										Number(profile.frozenBalance) > 0 && (
											<div className='text-sm text-gray-400 space-y-1'>
												<div className='text-yellow-400'>
													🔒 Заморожено:{' '}
													{Number(profile.frozenBalance).toFixed(2)} ₽
												</div>
												<div className='text-emerald-400'>
													✓ Доступно:{' '}
													{(
														Number(profile.balance ?? 0) -
														Number(profile.frozenBalance)
													).toFixed(2)}{' '}
													₽
												</div>
											</div>
										)}
								</div>

								{/* Кнопка пополнения */}
								<div className='mb-4 space-y-2'>
									<button
										onClick={() => setIsDepositModalOpen(true)}
										className='w-full px-4 py-2 rounded border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition text-sm font-medium'
									>
										💳 Пополнить баланс через Т-Банк
									</button>

									{/* Кнопка проверки платежа (если есть сохраненный PaymentId) */}
									{lastPaymentId && (
										<button
											onClick={handleCheckPayment}
											disabled={checkingPayment}
											className='w-full px-4 py-2 rounded border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
										>
											{checkingPayment ? (
												<span className='flex items-center justify-center gap-2'>
													<span className='w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin' />
													Проверка...
												</span>
											) : (
												'🔍 Проверить платеж (если деньги не поступили)'
											)}
										</button>
									)}
								</div>

								<div className='flex gap-2'>
									<input
										type='number'
										value={amount}
										onChange={e => {
											setAmount(parseInt(e.target.value))
											if (withdrawError) setWithdrawError(null)
										}}
										className='flex-1 bg-black/60 border border-emerald-500/30 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm'
										placeholder='Сумма'
										disabled={withdrawLoading}
									/>
									<button
										onClick={handleWithdraw}
										disabled={withdrawLoading}
										className='px-4 py-2 rounded border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
									>
										{withdrawLoading ? (
											<span className='flex items-center gap-2'>
												<span className='w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin' />
												Обработка...
											</span>
										) : (
											'Вывести'
										)}
									</button>
								</div>
								{withdrawError && (
									<div className='mt-3 bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400'>
										<span className='font-semibold'>⚠️ Ошибка:</span>{' '}
										{withdrawError}
									</div>
								)}
							</div>

							{/* История транзакций */}
							<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
								<h3 className='text-lg font-semibold text-emerald-400 mb-4'>
									История транзакций
								</h3>
								{transactions.length === 0 ? (
									<p className='text-gray-500 text-sm text-center py-4'>
										Пока нет транзакций
									</p>
								) : (
									<div className='space-y-2 max-h-96 overflow-y-auto'>
										{transactions.map(t => (
											<div
												key={t.id}
												className='flex justify-between items-center p-3 bg-black/60 rounded-lg border border-emerald-500/10'
											>
												<div className='flex-1 min-w-0'>
													<p className='text-sm text-gray-300 truncate'>
														{t.reason}
													</p>
													<p className='text-xs text-gray-500'>
														{new Date(t.createdAt).toLocaleDateString('ru-RU')}
													</p>
												</div>
												<span
													className={`font-semibold text-sm ml-3 ${
														t.amount > 0 ? 'text-green-400' : 'text-red-400'
													}`}
												>
													{t.amount > 0 ? '+' : ''}
													{t.amount} ₽
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Модальное окно редактирования профиля */}
			{token && (
				<EditProfileModal
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					user={profile}
					token={token}
					onSuccess={handleProfileUpdateSuccess}
				/>
			)}

			{/* Модальное окно выбора фона профиля - только для исполнителей */}
			{backgroundSelectorOpen && user.role === 'executor' && (
				<ProfileBackgroundSelector
					currentLevel={userLevel}
					onClose={() => {
						setBackgroundSelectorOpen(false)
						// Обновляем фон после выбора
						if (token) {
							fetch('/api/profile/background', {
								headers: { Authorization: `Bearer ${token}` },
							})
								.then(res => res.json())
								.then(data =>
									setProfileBackground(data.backgroundId || 'default')
								)
								.catch(() => {})
						}
					}}
				/>
			)}

			{/* Модальное окно всех достижений */}
			{token && (
				<BadgesModal
					isOpen={badgesModalOpen}
					onClose={() => setBadgesModalOpen(false)}
					earnedBadges={
						profile?.badges?.map(ub => ({
							id: ub.badge.id,
							name: ub.badge.name,
							description: ub.badge.description,
							icon: ub.badge.icon,
							earned: true,
						})) || []
					}
				/>
			)}

			{/* Модальное окно пополнения баланса */}
			{isDepositModalOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
					<div className='bg-[#001410] border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full'>
						<h3 className='text-xl font-bold text-emerald-400 mb-4'>
							Пополнение баланса
						</h3>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm text-gray-300 mb-2'>
									Сумма пополнения (₽)
								</label>
								<input
									type='number'
									value={depositAmount}
									onChange={e => {
										const value = parseInt(e.target.value) || 0
										setDepositAmount(value)
										if (depositError) setDepositError(null)
									}}
									className='w-full bg-black/60 border border-emerald-500/30 text-white p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400'
									placeholder='1000'
									min={1}
									max={300000}
								/>
								<p className='text-xs text-gray-400 mt-1'>
									Минимум: 1 ₽, Максимум: 300,000 ₽
								</p>
							</div>
							{depositError && (
								<div className='bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400'>
									<span className='font-semibold'>⚠️ Ошибка:</span>{' '}
									{depositError}
								</div>
							)}
							<div className='flex gap-3'>
								<button
									onClick={handleDeposit}
									disabled={depositLoading}
									className='flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed'
								>
									{depositLoading ? (
										<span className='flex items-center justify-center gap-2'>
											<span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
											Обработка...
										</span>
									) : (
										'Продолжить'
									)}
								</button>
								<button
									onClick={() => {
										setIsDepositModalOpen(false)
										setDepositError(null)
									}}
									className='px-4 py-2 border border-gray-600 text-gray-400 rounded hover:bg-gray-800 transition'
								>
									Отмена
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
