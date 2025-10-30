'use client'

import LoadingSpinner from '@/components/LoadingSpinner'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
	FaAward,
	FaCertificate,
	FaChartLine,
	FaStar,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
} from 'react-icons/fa'

type ReviewLite = { rating: number }

type PublicUser = {
	id: string
	role: 'customer' | 'executor' | string
	fullName: string | null
	email?: string | null
	avatarUrl?: string | null
	location?: string | null
	description?: string | null
	skills?: string[]
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
	reviewsReceived?: ReviewLite[]
	_count?: {
		executedTasks: number
		reviewsReceived: number
	}
}

function buildAuthHeaders(): HeadersInit {
	let token: string | null = null
	if (typeof document !== 'undefined') {
		const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
		if (m) token = decodeURIComponent(m[1])
		if (!token) token = localStorage.getItem('token')
	}
	const h: HeadersInit = {}
	if (token) h['Authorization'] = `Bearer ${token}`
	return h
}

// перевод ролей на русский
function getRoleName(role: string | undefined | null): string {
	switch (role) {
		case 'executor':
			return 'Исполнитель'
		case 'customer':
			return 'Заказчик'
		default:
			return role || '—'
	}
}

const getSkillIcon = (skill: string) => {
	const lower = skill.toLowerCase()
	if (lower.includes('python'))
		return <span className='text-emerald-400'>🐍</span>
	if (lower.includes('js') || lower.includes('javascript'))
		return <span className='text-yellow-400'>⚡</span>
	if (lower.includes('sql') || lower.includes('db'))
		return <span className='text-blue-400'>🗄️</span>
	if (lower.includes('dns') || lower.includes('network'))
		return <span className='text-indigo-400'>🌐</span>
	return <span className='text-gray-400'>🔧</span>
}

export default function UserPublicProfilePage() {
	const params = useParams()
	const userId = params.id as string
	const { user } = useUser()

	const [viewUser, setViewUser] = useState<PublicUser | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// hire CTA
	const [hireState, setHireState] = useState<'none' | 'pending' | 'accepted'>(
		'none'
	)
	const [hireId, setHireId] = useState<string | null>(null)
	const [sendingHire, setSendingHire] = useState(false)
	const [showHireModal, setShowHireModal] = useState(false)
	const [hireMessage, setHireMessage] = useState('')
	const [hireError, setHireError] = useState('')

	// подгрузка публичного профиля
	useEffect(() => {
		let cancelled = false
		;(async () => {
			setLoading(true)
			setError(null)
			try {
				const res = await fetch(`/api/users/${userId}`, {
					headers: buildAuthHeaders(),
					cache: 'no-store',
				})
				const raw = await res.json().catch(() => ({}))
				if (!res.ok)
					throw new Error(raw?.error || `${res.status} ${res.statusText}`)
				const u: PublicUser | null = (raw?.user ?? raw) || null
				if (!cancelled) setViewUser(u)
			} catch (e: any) {
				if (!cancelled) setError(e?.message || 'Ошибка загрузки профиля')
			} finally {
				if (!cancelled) setLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [userId])

	// предзагрузка статуса hire (для заказчика на странице исполнителя)
	useEffect(() => {
		if (!viewUser || user?.role !== 'customer' || viewUser.id === user?.id)
			return
		let cancelled = false
		;(async () => {
			try {
				const res = await fetch(`/api/hire/status?executorId=${viewUser.id}`, {
					headers: buildAuthHeaders(),
					cache: 'no-store',
				})
				if (!res.ok) return
				const data = await res.json()
				if (cancelled) return
				if (data.exists) {
					setHireState(data.status)
					setHireId(data.hireId)
				} else {
					setHireState('none')
					setHireId(null)
				}
			} catch {}
		})()
		return () => {
			cancelled = true
		}
	}, [viewUser?.id, user?.role, user?.id])

	async function sendHireRequest() {
		if (!viewUser || sendingHire || !hireMessage.trim()) {
			if (!hireMessage.trim()) {
				setHireError('Напишите сопроводительное письмо')
			}
			return
		}

		setSendingHire(true)
		setHireError('')

		try {
			const res = await fetch('/api/hire', {
				method: 'POST',
				headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
				body: JSON.stringify({
					executorId: viewUser.id,
					message: hireMessage.trim(),
				}),
			})

			if (res.status === 201) {
				const d = await res.json().catch(() => ({}))
				setHireState('pending')
				setHireId(d?.hireId ?? null)
				setShowHireModal(false)
				setHireMessage('')
				alert('Запрос найма отправлен! Исполнитель получит уведомление в чате.')
				return
			}

			if (res.status === 409) {
				const d = await res.json().catch(() => ({}))
				setHireState(d?.status === 'accepted' ? 'accepted' : 'pending')
				setHireId(d?.hireId ?? null)
				setShowHireModal(false)
				setHireMessage('')
				return
			}

			const err = await res.json().catch(() => ({}))
			setHireError(err?.error || 'Ошибка при отправке запроса')
		} catch {
			setHireError('Ошибка сети')
		} finally {
			setSendingHire(false)
		}
	}

	// ====== UI ======
	if (loading) {
		return (
			<div className='max-w-4xl mx-auto py-8 px-4 text-white'>
				<LoadingSpinner />
			</div>
		)
	}

	if (error || !viewUser) {
		return (
			<div className='max-w-4xl mx-auto py-8 px-4 text-white'>
				<p className='text-red-400'>{error || 'Пользователь не найден'}</p>
			</div>
		)
	}

	// рейтинг
	const ratings = viewUser.reviewsReceived || []
	const avgRating =
		ratings.length > 0
			? (
					ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
			  ).toFixed(1)
			: null
	const reviewsCount = ratings.length

	return (
		<div className='max-w-6xl mx-auto py-8 px-4 space-y-8'>
			{/* Основная информация */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Левая колонка - основная информация */}
				<div className='lg:col-span-1 space-y-6'>
					{/* Аватар и основная инфа */}
					<div className='bg-black/40 border border-green-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,150,0.3)] text-center hover:shadow-[0_0_25px_rgba(0,255,150,0.5)] transition'>
						{viewUser.avatarUrl ? (
							<img
								src={viewUser.avatarUrl}
								alt='Avatar'
								className='w-32 h-32 rounded-full border-2 border-green-500 
                           shadow-[0_0_20px_rgba(0,255,150,0.5)] mx-auto mb-4 object-cover'
							/>
						) : (
							<FaUserCircle className='text-gray-600 w-32 h-32 mx-auto mb-4' />
						)}

						<h1 className='text-2xl font-bold text-green-400 mb-2'>
							{viewUser.fullName || viewUser.email || 'Профиль пользователя'}
						</h1>
						<div className='text-gray-400 mb-2'>
							{getRoleName(viewUser.role)}{' '}
							{viewUser.location ? `• ${viewUser.location}` : ''}
						</div>

						{/* Уровень и опыт для исполнителей */}
						{viewUser.role === 'executor' && viewUser.level && (
							<div className='bg-green-500/20 p-3 rounded-lg mb-4'>
								<div className='flex items-center justify-center gap-2 mb-1'>
									<FaTrophy className='text-yellow-400' />
									<span className='font-semibold text-green-300'>
										{viewUser.level.name}
									</span>
								</div>
								<p className='text-sm text-gray-300'>
									{viewUser.level.description}
								</p>
								<div className='mt-2 flex items-center justify-center gap-2'>
									<FaChartLine className='text-blue-400' />
									<span className='text-blue-300 font-medium'>
										{viewUser.xp || 0} XP
									</span>
								</div>
							</div>
						)}

						{/* Рейтинг для исполнителей */}
						{avgRating && viewUser.role === 'executor' && (
							<div className='bg-yellow-500/20 p-3 rounded-lg mb-4'>
								<div className='flex items-center justify-center gap-2 mb-1'>
									<FaStar className='text-yellow-400' />
									<span className='text-yellow-300 font-bold text-xl'>
										{avgRating}
									</span>
								</div>
								<p className='text-sm text-gray-300'>
									({reviewsCount} отзывов)
								</p>
							</div>
						)}
					</div>

					{/* Статистика для исполнителей */}
					{viewUser.role === 'executor' && viewUser._count && (
						<div
							className='bg-black/40 p-4 rounded-xl border border-green-500/30 
                            shadow-[0_0_15px_rgba(0,255,150,0.2)]'
						>
							<h3 className='text-lg font-semibold text-green-400 mb-4 flex items-center gap-2'>
								<FaChartLine />
								Статистика
							</h3>
							<div className='space-y-3'>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Выполнено задач:</span>
									<span className='text-green-300 font-semibold'>
										{viewUser._count.executedTasks || 0}
									</span>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-gray-300'>Отзывов получено:</span>
									<span className='text-green-300 font-semibold'>
										{viewUser._count.reviewsReceived || 0}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Правая колонка - детальная информация */}
				<div className='lg:col-span-2 space-y-6'>
					{/* О себе */}
					{viewUser.description && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-green-500/30 
                            shadow-[0_0_15px_rgba(0,255,150,0.2)]'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-4'>
								📄 О себе
							</h3>
							<p className='text-gray-300 leading-relaxed'>
								{viewUser.description}
							</p>
						</div>
					)}

					{/* Навыки */}
					{viewUser.skills && viewUser.skills.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-green-500/30 
                            shadow-[0_0_15px_rgba(0,255,150,0.2)]'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-4 flex items-center gap-2'>
								<FaToolbox />
								Навыки и технологии
							</h3>
							<div className='flex flex-wrap gap-3'>
								{viewUser.skills.map((skill, index) => (
									<div
										key={index}
										className='flex items-center px-4 py-2 rounded-full text-sm 
                               border border-green-500/40 bg-black/60 
                               shadow-[0_0_8px_rgba(0,255,150,0.2)] hover:shadow-[0_0_12px_rgba(0,255,150,0.3)] transition'
									>
										{getSkillIcon(skill)}
										<span className='ml-2'>{skill.trim()}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Сертификации */}
					{viewUser.certifications && viewUser.certifications.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-green-500/30 
                            shadow-[0_0_15px_rgba(0,255,150,0.2)]'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-4 flex items-center gap-2'>
								<FaCertificate />
								Сертификации
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{viewUser.certifications.map(cert => (
									<div
										key={cert.id}
										className='bg-green-500/10 p-4 rounded-lg border border-green-500/20'
									>
										<div className='flex items-center gap-2 mb-2'>
											<FaAward className='text-yellow-400' />
											<span className='font-semibold text-green-300'>
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
					{viewUser.badges && viewUser.badges.length > 0 && (
						<div
							className='bg-black/40 p-6 rounded-xl border border-green-500/30 
                            shadow-[0_0_15px_rgba(0,255,150,0.2)]'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-4 flex items-center gap-2'>
								<FaTrophy />
								Достижения
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{viewUser.badges.map(userBadge => (
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
				</div>
			</div>

			{/* CTA «Нанять исполнителя» — показываем на странице исполнителя */}
			{user?.role === 'customer' &&
				user?.id !== viewUser.id &&
				viewUser.role === 'executor' && (
					<div
						className='bg-black/40 p-6 rounded-xl border border-green-500/30 
							shadow-[0_0_15px_rgba(0,255,150,0.2)] text-center'
					>
						<h3 className='text-xl font-semibold text-green-400 mb-4'>
							💼 Сотрудничество
						</h3>
						{hireState === 'accepted' ? (
							<div className='flex gap-3 justify-center'>
								<Link
									href={`/chats?open=${viewUser.id}`}
									className='px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition'
								>
									Перейти в чат
								</Link>
								<span className='text-green-400 self-center text-sm'>
									Запрос принят
								</span>
							</div>
						) : hireState === 'pending' ? (
							<button
								className='px-6 py-3 rounded-lg bg-gray-700 text-white cursor-not-allowed font-semibold'
								disabled
							>
								Запрос отправлен
							</button>
						) : (
							<button
								onClick={() => setShowHireModal(true)}
								disabled={sendingHire}
								className='px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-50 font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]'
							>
								💼 Нанять за 1990₽
							</button>
						)}
					</div>
				)}

			{/* Модальное окно найма */}
			{showHireModal && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'
					onClick={() => setShowHireModal(false)}
				>
					<div
						className='bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full max-w-md mx-4 p-6 md:p-8'
						onClick={e => e.stopPropagation()}
					>
						<h2 className='text-2xl font-bold text-emerald-400 mb-2'>
							Нанять исполнителя
						</h2>
						<p className='text-gray-400 text-sm mb-6'>
							Стоимость:{' '}
							<span className='text-emerald-400 font-semibold'>1990₽</span>
						</p>

						<form
							onSubmit={e => {
								e.preventDefault()
								sendHireRequest()
							}}
							className='space-y-4'
						>
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Сопроводительное письмо
								</label>
								<textarea
									value={hireMessage}
									onChange={e => setHireMessage(e.target.value)}
									placeholder='Напишите, почему вы хотите нанять этого исполнителя, какой проект у вас есть и т.д.'
									rows={6}
									className='w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition resize-none'
									required
								/>
								{hireError && (
									<p className='text-red-400 text-sm mt-1'>{hireError}</p>
								)}
							</div>

							<div className='flex gap-3'>
								<button
									type='button'
									onClick={() => setShowHireModal(false)}
									className='flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition-colors'
									disabled={sendingHire}
								>
									Отмена
								</button>
								<button
									type='submit'
									className='flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed'
									disabled={sendingHire}
								>
									{sendingHire ? 'Отправка...' : 'Отправить предложение'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}
