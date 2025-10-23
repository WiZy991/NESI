'use client'

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
	description?: string
	location?: string
	skills?: string[]
	avatarUrl?: string
	balance?: number
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

	useEffect(() => {
		if (!token) return

		const fetchProfile = async () => {
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

		fetchProfile()
	}, [token])

	useEffect(() => {
		const fetchReviews = async () => {
			if (!user || user.role !== 'executor') return
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

	const handleDeposit = async () => {
		await fetch('/api/wallet/deposit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ amount }),
		})
		location.reload()
	}

	const handleWithdraw = async () => {
		await fetch('/api/wallet/withdraw', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ amount }),
		})
		location.reload()
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
						<p className='text-2xl font-bold text-emerald-300 mb-4'>
							{profile.balance ?? 0} NESI
						</p>
						<div className='flex gap-2 mb-4'>
							<input
								type='number'
								value={amount}
								onChange={e => setAmount(parseInt(e.target.value))}
								className='bg-transparent border border-emerald-500/30 text-white p-2 
                           rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 w-24 text-sm'
							/>
							<button
								onClick={handleDeposit}
								className='px-3 py-1 rounded border border-emerald-400 
                                                         text-emerald-400 hover:bg-emerald-400 
                                                         hover:text-black transition text-sm'
							>
								+
							</button>
							<button
								onClick={handleWithdraw}
								className='px-3 py-1 rounded border border-red-400 
                                                          text-red-400 hover:bg-red-400 
                                                          hover:text-black transition text-sm'
							>
								-
							</button>
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
      {profile.executedTasks.map(task => {
        const rating = Number(task.review?.rating) || 0

        return (
          <div
            key={task.id}
            className='bg-black/60 p-4 rounded-lg border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-200'
          >
            {/* Заголовок и дата */}
            <div className='flex justify-between items-start mb-2'>
              <h4 className='font-semibold text-white'>{task.title}</h4>
              {task.completedAt && (
                <span className='flex items-center gap-1 text-gray-400 text-xs'>
                  <FaCalendarAlt />
                  {new Date(task.completedAt).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>

            {/* Описание */}
            <p className='text-gray-300 text-sm mb-2 line-clamp-2'>
              {task.description}
            </p>

            {/* Заказчик и цена */}
            <div className='flex justify-between items-center text-xs text-gray-400 mb-2'>
              <span>
                Заказчик:{' '}
                <span className='text-emerald-300'>
                  {task.customer.fullName || task.customer.email}
                </span>
              </span>
              {task.price && (
                <span className='text-emerald-300 font-semibold'>
                  {task.price} NESI
                </span>
              )}
            </div>

            {/* Отзыв */}
            {task.review && (
              <div
                className={`mt-2 p-3 rounded border shadow-[0_0_8px_rgba(234,179,8,0.15)] ${
                  rating <= 2
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className='flex items-center gap-1 mb-1'>
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={`text-sm ${
                        i < rating
                          ? 'text-yellow-400 drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                  <span className='text-yellow-300 font-semibold text-sm ml-1'>
                    {rating.toFixed(1)} / 5
                  </span>
                </div>

                <p className='text-sm text-gray-300 italic leading-snug'>
                  “{task.review.comment || 'Без комментария'}”
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)}

			{/* Отзывы */}
			{user.role === 'executor' && reviews.length > 0 && (
				<div
					className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 
                        shadow-[0_0_15px_rgba(16,185,129,0.2)]'
				>
					<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
						<FaStar />
						Отзывы заказчиков
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
										{review.task.title}
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
								<p className='text-gray-300 mb-3 italic'>"{review.comment}"</p>
								<div className='flex justify-between items-center text-sm text-gray-400'>
									<span>
										От: {review.fromUser?.fullName || review.fromUser?.email}
									</span>
									<span>{new Date(review.createdAt).toLocaleDateString()}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Кнопки действий */}
			<div className='flex gap-4 flex-wrap justify-center'>
				<Link
					href='/profile/edit'
					className='px-6 py-3 rounded-lg border border-emerald-400 text-emerald-400 
                     hover:bg-emerald-400 hover:text-black transition font-semibold'
				>
					✏️ Редактировать профиль
				</Link>
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
</div>
)
