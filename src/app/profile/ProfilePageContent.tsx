'use client'

import EditProfileModal from '@/components/EditProfileModal'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
	FaAward,
	FaCalendarAlt,
	FaCertificate,
	FaChartLine,
	FaDatabase,
	FaGlobe,
	FaJs,
	FaPython,
	FaStar,
	FaTasks,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
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
}

const getSkillIcon = (skill: string) => {
	const lower = skill.toLowerCase()
	if (lower.includes('python'))
		return <FaPython className='mr-1 text-emerald-400' />
	if (lower.includes('js') || lower.includes('javascript'))
		return <FaJs className='mr-1 text-yellow-400' />
	if (lower.includes('sql') || lower.includes('db'))
		return <FaDatabase className='mr-1 text-blue-400' />
	if (lower.includes('dns') || lower.includes('network'))
		return <FaGlobe className='mr-1 text-indigo-400' />
	return <FaToolbox className='mr-1 text-gray-400' />
}

export default function ProfilePageContent() {
	const { user, token, loading, login } = useUser()
	const [reviews, setReviews] = useState<Review[]>([])
	const [profile, setProfile] = useState<FullUser | null>(null)
	const [loadingProfile, setLoadingProfile] = useState(true)

	const [transactions, setTransactions] = useState<any[]>([])
	const [amount, setAmount] = useState(100)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [withdrawError, setWithdrawError] = useState<string | null>(null)
	const [withdrawLoading, setWithdrawLoading] = useState(false)

	const fetchProfile = async () => {
		if (!token) return
		try {
			const res = await fetch('/api/profile', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error('Ошибка загрузки профиля')
			const data = await res.json()
			setProfile(data.user)
			login(data.user, token)

			// Баланс
			const txRes = await fetch('/api/wallet/transactions', {
				headers: { Authorization: `Bearer ${token}` },
			})
			const txData = await txRes.json()
			setTransactions(txData.transactions || [])
		} catch (err) {
			console.error('Ошибка загрузки профиля:', err)
		} finally {
			setLoadingProfile(false)
		}
	}

	useEffect(() => {
		fetchProfile()
	}, [token])

	useEffect(() => {
		const fetchReviews = async () => {
			if (!user) return
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
	}, [user, token])

	const handleWithdraw = async () => {
		if (!amount || amount <= 0) {
			setWithdrawError('Укажите сумму для вывода')
			return
		}

		setWithdrawError(null)
		setWithdrawLoading(true)

		try {
			const res = await fetch('/api/wallet/withdraw', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ amount }),
			})

			const data = await res.json()

			if (!res.ok) {
				// Показываем ошибку пользователю
				setWithdrawError(data.error || 'Не удалось вывести средства')
				return
			}

			// Успешно - обновляем профиль
			await fetchProfile()
			setAmount(100)
			setWithdrawError(null)
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
		return <div className='p-6 text-gray-400'>Загрузка профиля...</div>
	}

	// Корректируем URL для аватара
	const avatarSrc = profile.avatarUrl
		? profile.avatarUrl.startsWith('http')
			? profile.avatarUrl
			: `${typeof window !== 'undefined' ? window.location.origin : ''}${
					profile.avatarUrl
			  }`
		: null

	return (
		<div className='p-6 max-w-6xl mx-auto space-y-8'>
			<h1 className='text-4xl font-bold text-emerald-400 mb-6 flex items-center gap-3'>
				<FaUserCircle className='text-3xl' />
				{profile.isExecutor ? 'Профиль исполнителя' : 'Профиль заказчика'}
			</h1>

			{/* Основная информация */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Левая колонка - основная информация */}
				<div className='lg:col-span-1 space-y-6'>
					{/* Аватар и основная инфа */}
					<div
						className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                          shadow-[0_0_15px_rgba(16,185,129,0.2)] text-center'
					>
						{avatarSrc ? (
							<img
								src={avatarSrc}
								alt='Avatar'
								className='w-32 h-32 rounded-full border-2 border-emerald-500 
                           shadow-[0_0_20px_rgba(16,185,129,0.5)] mx-auto mb-4 object-cover'
							/>
						) : (
							<FaUserCircle className='text-gray-600 w-32 h-32 mx-auto mb-4' />
						)}

						<h2 className='text-2xl font-bold text-white mb-2'>
							{profile.fullName || 'Без имени'}
						</h2>
						<p className='text-gray-400 mb-1'>{profile.email}</p>
						{profile.location && (
							<p className='text-emerald-300 mb-4'>📍 {profile.location}</p>
						)}

						{/* Уровень и опыт */}
						{profile.level && (
							<div className='bg-emerald-500/20 p-3 rounded-lg mb-4'>
								<div className='flex items-center justify-center gap-2 mb-1'>
									<FaTrophy className='text-yellow-400' />
									<span className='font-semibold text-emerald-300'>
										{profile.level.name}
									</span>
								</div>
								<p className='text-sm text-gray-300'>
									{profile.level.description}
								</p>
								<div className='mt-2 flex items-center justify-center gap-2'>
									<FaChartLine className='text-blue-400' />
									<span className='text-blue-300 font-medium'>
										{profile.xp || 0} XP
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Статистика */}
					{user.role === 'executor' && (
						<div
							className='bg-black/40 p-4 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaChartLine />
								Статистика
							</h3>
							<div className='space-y-3'>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Выполнено задач:</span>
									<span className='text-emerald-300 font-semibold'>
										{profile._count?.executedTasks || 0}
									</span>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Отзывов получено:</span>
									<span className='text-emerald-300 font-semibold'>
										{profile._count?.reviewsReceived || 0}
									</span>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Средний рейтинг:</span>
									<div className='flex items-center gap-1'>
										<FaStar className='text-yellow-400' />
										<span className='text-yellow-300 font-semibold'>
											{profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
										</span>
									</div>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Откликов отправлено:</span>
									<span className='text-emerald-300 font-semibold'>
										{profile._count?.responses || 0}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Баланс */}
					<div
						className='bg-black/40 p-4 rounded-xl border border-emerald-500/30 
                          shadow-[0_0_15px_rgba(16,185,129,0.2)]'
					>
						<h3 className='text-lg font-semibold text-emerald-400 mb-3'>
							💰 Баланс
						</h3>
						<div className='mb-4'>
							<p className='text-2xl font-bold text-emerald-300'>
								{Number(profile.balance ?? 0).toFixed(2)} ₽
							</p>
							{profile.frozenBalance && Number(profile.frozenBalance) > 0 && (
								<div className='text-xs text-gray-400 mt-1'>
									<span className='text-yellow-400'>
										🔒 Заморожено: {Number(profile.frozenBalance).toFixed(2)} ₽
									</span>
									<br />
									<span className='text-emerald-400'>
										✓ Доступно:{' '}
										{(
											Number(profile.balance ?? 0) -
											Number(profile.frozenBalance)
										).toFixed(2)}{' '}
										₽
									</span>
								</div>
							)}
						</div>
						<div className='flex flex-col gap-2 mb-4'>
							<div className='flex gap-2'>
								<input
									type='number'
									value={amount}
									onChange={e => {
										setAmount(parseInt(e.target.value))
										if (withdrawError) setWithdrawError(null)
									}}
									className='bg-transparent border border-emerald-500/30 text-white p-2 
                           rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 w-24 text-sm'
									placeholder='Сумма'
									disabled={withdrawLoading}
								/>
								<button
									onClick={handleWithdraw}
									disabled={withdrawLoading}
									className='px-3 py-2 rounded border border-red-400 
                                                          text-red-400 hover:bg-red-400 
                                                          hover:text-black transition text-sm disabled:opacity-50 disabled:cursor-not-allowed'
									title='Вывод средств'
								>
									{withdrawLoading ? (
										<span className='flex items-center gap-2'>
											<span className='w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin' />
											Обработка...
										</span>
									) : (
										'- Вывести'
									)}
								</button>
							</div>
							{withdrawError && (
								<div className='bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400'>
									<span className='font-semibold'>⚠️ Ошибка:</span>{' '}
									{withdrawError}
								</div>
							)}
						</div>

						<h4 className='text-sm font-semibold text-emerald-300 mb-2'>
							История транзакций
						</h4>
						{transactions.length === 0 ? (
							<p className='text-gray-500 text-sm'>Пока нет транзакций</p>
						) : (
							<div className='max-h-32 overflow-y-auto space-y-1 text-xs'>
								{transactions.slice(0, 5).map(t => (
									<div key={t.id} className='flex justify-between'>
										<span
											className={
												t.amount > 0 ? 'text-green-400' : 'text-red-400'
											}
										>
											{t.amount > 0 ? '+' : ''}
											{t.amount}
										</span>
										<span className='text-gray-500 truncate ml-2'>
											{t.reason}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Правая колонка - детальная информация */}
				<div className='lg:col-span-2 space-y-6'>
					{/* Навыки */}
					{profile.skills && profile.skills.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaToolbox />
								Навыки и технологии
							</h3>
							<div className='flex flex-wrap gap-3'>
								{profile.skills.map((skill, index) => (
									<div
										key={index}
										className='flex items-center px-4 py-2 rounded-full text-sm 
                               border border-emerald-500/40 bg-black/60 
                               shadow-[0_0_8px_rgba(16,185,129,0.2)] hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition'
									>
										{getSkillIcon(skill)}
										{skill.trim()}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Сертификации */}
					{profile.certifications && profile.certifications.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaCertificate />
								Сертификации
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{profile.certifications.map(cert => (
									<div
										key={cert.id}
										className='bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20'
									>
										<div className='flex items-center gap-2 mb-2'>
											<FaAward className='text-yellow-400' />
											<span className='font-semibold text-emerald-300'>
												{cert.subcategory.name}
											</span>
										</div>
										<p className='text-sm text-gray-300 mb-1'>
											Уровень: {cert.level}
										</p>
										<p className='text-xs text-gray-400'>
											Получено: {new Date(cert.grantedAt).toLocaleDateString()}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Значки */}
					{profile.badges && profile.badges.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaTrophy />
								Достижения
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{profile.badges.map(userBadge => (
									<div
										key={userBadge.id}
										className='bg-gradient-to-br from-yellow-500/20 to-orange-500/20 
                                                    p-4 rounded-lg border border-yellow-500/30 text-center'
									>
										<div className='text-2xl mb-2'>{userBadge.badge.icon}</div>
										<h4 className='font-semibold text-yellow-300 mb-1'>
											{userBadge.badge.name}
										</h4>
										<p className='text-xs text-gray-300 mb-2'>
											{userBadge.badge.description}
										</p>
										<p className='text-xs text-gray-400'>
											{new Date(userBadge.earnedAt).toLocaleDateString()}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
					{/* Отзывы исполнителей (для заказчика) */}
					{user.role === 'customer' && reviews.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaStar />
								Отзывы исполнителей
							</h3>

							<div className='space-y-4'>
								{reviews.map(review => (
									<div
										key={review.id}
										className='bg-black/60 border border-emerald-500/20 
                     p-4 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.15)]'
									>
										<div className='flex justify-between items-center mb-2'>
											<h4 className='font-semibold text-white'>
												{review.task?.title || 'Без названия'}
											</h4>
											<div className='flex items-center gap-1'>
												{[...Array(5)].map((_, i) => (
													<FaStar
														key={i}
														className={`text-sm ${
															i < review.rating
																? 'text-yellow-400'
																: 'text-gray-600'
														}`}
													/>
												))}
											</div>
										</div>

										<p className='text-gray-300 italic mb-2'>
											“{review.comment?.trim() || 'Без комментария'}”
										</p>

										<div className='flex justify-between text-xs text-gray-400'>
											<span>
												От:{' '}
												{review.fromUser?.fullName || review.fromUser?.email}
											</span>
											<span>
												{new Date(review.createdAt).toLocaleDateString('ru-RU')}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* О себе */}
					{profile.description && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4'>
								📄 О себе
							</h3>
							<p className='text-gray-300 leading-relaxed'>
								{profile.description}
							</p>
						</div>
					)}

					{/* Портфолио выполненных задач */}
					{profile.executedTasks && profile.executedTasks.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                            shadow-[0_0_15px_rgba(16,185,129,0.2)]'
						>
							<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
								<FaTasks />
								Последние выполненные задачи
							</h3>
							<div className='space-y-4'>
								{profile.executedTasks.map(task => (
									<div
										key={task.id}
										className='bg-black/60 p-4 rounded-lg border border-emerald-500/20'
									>
										<div className='flex justify-between items-start mb-2'>
											<h4 className='font-semibold text-white'>{task.title}</h4>
											{task.price && (
												<span className='text-emerald-300 font-semibold'>
													{task.price} NESI
												</span>
											)}
										</div>
										<p className='text-gray-300 text-sm mb-2 line-clamp-2'>
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
										{(() => {
											const review = reviews.find(
												r => r.task.title === task.title
											)
											if (!review) return null

											const ratingValue = Number(review.rating ?? 0)
											const rounded = Math.round(ratingValue)

											return (
												<div className='mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.15)]'>
													<div className='flex items-center justify-between mb-2'>
														<div className='flex items-center gap-1'>
															{[...Array(5)].map((_, i) => (
																<FaStar
																	key={i}
																	className={`text-base ${
																		i < rounded
																			? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(255,220,100,0.6)]'
																			: 'text-gray-600'
																	}`}
																/>
															))}
															<span className='text-yellow-300 font-semibold text-sm ml-1'>
																{ratingValue.toFixed(1)} / 5
															</span>
														</div>
													</div>

													<p className='text-sm text-gray-300 italic leading-snug'>
														“{review.comment?.trim() || 'Без комментария'}”
													</p>
												</div>
											)
										})()}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{user.role === 'executor' && reviews.length > 0 && (
				<div
					className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                shadow-[0_0_15px_rgba(16,185,129,0.2)]'
				>
					<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
						<FaStar />
						{user.role === 'executor'
							? 'Отзывы заказчиков'
							: 'Отзывы исполнителей'}
					</h3>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{reviews.map(review => (
							<div
								key={review.id}
								className='bg-black/60 border border-emerald-500/30 
                     p-4 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]'
							>
								<div className='flex justify-between items-center mb-3'>
									<h4 className='font-semibold text-white'>
										{review.task?.title || 'Без названия'}
									</h4>
									<div className='flex items-center gap-1'>
										{[...Array(5)].map((_, i) => (
											<FaStar
												key={i}
												className={`text-sm ${
													i < review.rating
														? 'text-yellow-400'
														: 'text-gray-600'
												}`}
											/>
										))}
									</div>
								</div>

								<p className='text-gray-300 mb-3 italic'>
									“{review.comment?.trim() || 'Без комментария'}”
								</p>

								<div className='flex justify-between items-center text-sm text-gray-400'>
									<span>
										От: {review.fromUser?.fullName || review.fromUser?.email}
									</span>
									<span>
										{new Date(review.createdAt).toLocaleDateString('ru-RU')}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Кнопки действий */}
			<div className='flex gap-4 flex-wrap justify-center'>
				<button
					onClick={() => setIsEditModalOpen(true)}
					className='px-6 py-3 rounded-lg border border-emerald-400 text-emerald-400 
                     hover:bg-emerald-400 hover:text-black transition font-semibold'
				>
					✏️ Редактировать профиль
				</button>
				{/* Эта кнопка видна только исполнителям */}
				{profile.isExecutor && (
					<Link
						href='/level'
						className='px-6 py-3 rounded-lg border border-indigo-400 text-indigo-400 
                 hover:bg-indigo-400 hover:text-black transition font-semibold'
					>
						📊 Мой уровень
					</Link>
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
		</div>
	)
}
