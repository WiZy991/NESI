'use client'

import BadgeIcon from '@/components/BadgeIcon'
import LoadingSpinner from '@/components/LoadingSpinner'
import VideoPlayer from '@/components/VideoPlayer'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
	FaAward,
	FaCertificate,
	FaChartLine,
	FaStar,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
	FaBriefcase,
	FaChevronRight,
	FaComments,
	FaPython,
	FaJs,
	FaCode,
	FaDatabase,
	FaGlobe,
} from 'react-icons/fa'

type Review = {
	id: string
	rating: number
	comment: string
	createdAt: string
	taskId: string
	task?: {
		id: string
		title: string
	}
	fromUser?: {
		id: string
		fullName: string | null
		email: string
	}
}

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
	reviewsReceived?: Review[]
	_count?: {
		executedTasks: number
		reviewsReceived: number
	}
}

type Tab = 'overview' | 'achievements' | 'certifications' | 'portfolio' | 'reviews'

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

	// Языки программирования
	if (lower.includes('python')) return <FaPython className='mr-1 text-emerald-400' />
	if (lower.includes('js') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('node')) 
		return <FaJs className='mr-1 text-yellow-400' />
	if (lower.includes('java')) return <FaCode className='mr-1 text-orange-400' />
	if (lower.includes('c++') || lower.includes('cpp') || lower.includes('c#')) return <FaCode className='mr-1 text-blue-400' />
	if (lower.includes('go') || lower.includes('golang')) return <FaCode className='mr-1 text-cyan-400' />
	if (lower.includes('rust')) return <FaCode className='mr-1 text-orange-500' />
	if (lower.includes('php')) return <FaCode className='mr-1 text-purple-400' />
	if (lower.includes('ruby')) return <FaCode className='mr-1 text-red-400' />
	if (lower.includes('swift')) return <FaCode className='mr-1 text-orange-400' />
	if (lower.includes('kotlin')) return <FaCode className='mr-1 text-purple-500' />
	if (lower.includes('scala')) return <FaCode className='mr-1 text-red-500' />
	if (lower.includes('dart')) return <FaCode className='mr-1 text-blue-400' />

	// Фреймворки и библиотеки
	if (lower.includes('symfony') || lower.includes('laravel') || lower.includes('zend')) 
		return <FaCode className='mr-1 text-red-500' />
	if (lower.includes('react') || lower.includes('vue') || lower.includes('angular') || lower.includes('svelte')) 
		return <FaJs className='mr-1 text-blue-400' />
	if (lower.includes('next') || lower.includes('nuxt') || lower.includes('gatsby')) 
		return <FaJs className='mr-1 text-gray-400' />
	if (lower.includes('django') || lower.includes('flask') || lower.includes('fastapi')) 
		return <FaPython className='mr-1 text-emerald-400' />
	if (lower.includes('express') || lower.includes('koa') || lower.includes('nest')) 
		return <FaJs className='mr-1 text-gray-400' />
	if (lower.includes('spring') || lower.includes('hibernate')) 
		return <FaCode className='mr-1 text-green-500' />
	if (lower.includes('rails')) return <FaCode className='mr-1 text-red-500' />
	if (lower.includes('asp') || lower.includes('.net')) 
		return <FaCode className='mr-1 text-blue-500' />

	// Базы данных (проверяем специфичные БД перед общими)
	if (lower.includes('postgresql') || lower.includes('postgres')) 
		return <FaDatabase className='mr-1 text-blue-500' />
	if (lower.includes('mysql') || lower.includes('mariadb')) 
		return <FaDatabase className='mr-1 text-blue-400' />
	if (lower.includes('mongodb') || lower.includes('mongo')) 
		return <FaDatabase className='mr-1 text-green-500' />
	if (lower.includes('redis')) return <FaDatabase className='mr-1 text-red-500' />
	if (lower.includes('sqlite')) return <FaDatabase className='mr-1 text-blue-300' />
	if (lower.includes('oracle')) return <FaDatabase className='mr-1 text-red-600' />
	if (lower.includes('sql server') || lower.includes('mssql')) 
		return <FaDatabase className='mr-1 text-blue-600' />
	if (lower.includes('cassandra')) return <FaDatabase className='mr-1 text-purple-500' />
	if (lower.includes('elasticsearch') || lower.includes('elastic')) 
		return <FaDatabase className='mr-1 text-yellow-500' />
	// Общие SQL/DB проверки в конце (чтобы не перехватывать специфичные)
	if ((lower.includes('sql') || lower.includes('db') || lower.includes('database')) && 
		!lower.includes('postgresql') && !lower.includes('postgres') && 
		!lower.includes('mysql') && !lower.includes('mariadb') &&
		!lower.includes('mongodb') && !lower.includes('mongo') &&
		!lower.includes('sqlite') && !lower.includes('oracle') &&
		!lower.includes('sql server') && !lower.includes('mssql') &&
		!lower.includes('cassandra') && !lower.includes('elastic')) 
		return <FaDatabase className='mr-1 text-blue-400' />

	// Инфраструктура и DevOps
	if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('k8s')) 
		return <FaGlobe className='mr-1 text-blue-400' />
	if (lower.includes('aws') || lower.includes('azure') || lower.includes('gcp') || lower.includes('cloud')) 
		return <FaGlobe className='mr-1 text-orange-400' />
	if (lower.includes('nginx') || lower.includes('apache') || lower.includes('server')) 
		return <FaGlobe className='mr-1 text-green-400' />
	if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian')) 
		return <FaGlobe className='mr-1 text-orange-500' />
	if (lower.includes('git') || lower.includes('github') || lower.includes('gitlab')) 
		return <FaCode className='mr-1 text-gray-400' />
	if (lower.includes('ci/cd') || lower.includes('jenkins') || lower.includes('travis')) 
		return <FaGlobe className='mr-1 text-blue-400' />

	// Другие технологии
	if (lower.includes('html') || lower.includes('css') || lower.includes('sass') || lower.includes('less')) 
		return <FaCode className='mr-1 text-orange-400' />
	if (lower.includes('graphql')) return <FaCode className='mr-1 text-pink-500' />
	if (lower.includes('rest') || lower.includes('api')) 
		return <FaCode className='mr-1 text-green-400' />
	if (lower.includes('webpack') || lower.includes('vite') || lower.includes('parcel')) 
		return <FaCode className='mr-1 text-blue-400' />
	if (lower.includes('typescript') || lower.includes('ts')) 
		return <FaJs className='mr-1 text-blue-500' />

	// По умолчанию
	return <FaToolbox className='mr-1 text-gray-400' />
}

export default function UserPublicProfilePage() {
	const params = useParams()
	const userId = params.id as string
	const { user } = useUser()

	const [viewUser, setViewUser] = useState<PublicUser | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<Tab>('overview')

	const [portfolio, setPortfolio] = useState<any[]>([])
	const [portfolioLoading, setPortfolioLoading] = useState(false)
	const [avatarError, setAvatarError] = useState(false)

	const [hireState, setHireState] = useState<'none' | 'pending' | 'accepted'>('none')
	const [hireId, setHireId] = useState<string | null>(null)
	const [sendingHire, setSendingHire] = useState(false)
	const [showHireModal, setShowHireModal] = useState(false)
	const [hireMessage, setHireMessage] = useState('')
	const [hireError, setHireError] = useState('')

	useEffect(() => {
		let cancelled = false
		;(async () => {
			setLoading(true)
			setError(null)
			setAvatarError(false) // Сбрасываем ошибку аватара при загрузке нового пользователя
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

	useEffect(() => {
		if (!viewUser || viewUser.role !== 'executor') return

		let cancelled = false
		;(async () => {
			setPortfolioLoading(true)
			try {
				const res = await fetch(`/api/portfolio/user/${userId}`, {
					cache: 'no-store',
				})
				if (!res.ok) throw new Error('Ошибка загрузки портфолио')
				const data = await res.json()
				if (!cancelled) setPortfolio(data || [])
			} catch (err) {
				console.error('Ошибка загрузки портфолио:', err)
				if (!cancelled) setPortfolio([])
			} finally {
				if (!cancelled) setPortfolioLoading(false)
			}
		})()

		return () => {
			cancelled = true
		}
	}, [userId, viewUser?.role])

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

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-[60vh]'>
				<LoadingSpinner />
			</div>
		)
	}

	if (error || !viewUser) {
		return (
			<div className='max-w-4xl mx-auto py-8 px-4 text-white'>
				<div className='bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center'>
					<p className='text-red-400 text-lg'>{error || 'Пользователь не найден'}</p>
				</div>
			</div>
		)
	}

	const reviews = viewUser.reviewsReceived || []
	// Используем avgRating из API если есть, иначе вычисляем локально из загруженных отзывов
	const avgRating = viewUser.avgRating !== null && viewUser.avgRating !== undefined
		? Number(viewUser.avgRating).toFixed(1)
		: reviews.length > 0
		? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
		: null
	const reviewsCount = viewUser._count?.reviewsReceived ?? reviews.length

	const isExecutor = viewUser.role === 'executor'
	const canHire = user?.role === 'customer' && user?.id !== viewUser.id && isExecutor

	// Обработка URL аватара
	const avatarSrc = viewUser.avatarUrl
		? viewUser.avatarUrl.startsWith('http')
			? viewUser.avatarUrl
			: `${typeof window !== 'undefined' ? window.location.origin : ''}${viewUser.avatarUrl}`
		: null

	const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count?: number }> = [
		{ id: 'overview' as Tab, label: 'Обзор', icon: <FaUserCircle /> },
		{ id: 'reviews' as Tab, label: 'Отзывы', icon: <FaComments />, count: reviewsCount },
		{ id: 'achievements' as Tab, label: 'Достижения', icon: <FaTrophy />, count: viewUser.badges?.length },
		{ id: 'certifications' as Tab, label: 'Сертификации', icon: <FaCertificate />, count: viewUser.certifications?.length },
		{ id: 'portfolio' as Tab, label: 'Портфолио', icon: <FaBriefcase />, count: portfolio.length },
	].filter(tab => {
		// Портфолио только для исполнителей
		if (tab.id === 'portfolio' && !isExecutor) return false
		// Сертификации только для исполнителей
		if (tab.id === 'certifications' && !isExecutor) return false
		// Отзывы показываем для всех (и исполнителей, и заказчиков)
		return true
	})

	return (
		<div className='max-w-7xl mx-auto p-4 sm:p-6'>
			{/* Компактный Header профиля */}
			<div className='bg-gradient-to-r from-emerald-900/20 via-black/40 to-emerald-900/20 rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] p-6 mb-6'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
					{/* Аватар */}
					<div className='relative'>
						{avatarSrc && !avatarError ? (
							<img
								src={avatarSrc}
								alt='Аватар'
								className='w-20 h-20 rounded-full border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] object-cover'
								onError={() => setAvatarError(true)}
							/>
						) : (
							<div className='w-20 h-20 rounded-full border-2 border-emerald-500 bg-gray-800 flex items-center justify-center'>
								<FaUserCircle className='text-4xl text-gray-600' />
							</div>
						)}
						{viewUser.level && (
							<div className='absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-2 border-black'>
								<span className='text-xs font-bold text-black'>⭐{viewUser.level.slug}</span>
							</div>
						)}
					</div>

					{/* Основная информация */}
					<div className='flex-1 min-w-0'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
							<div>
								<h1 className='text-2xl sm:text-3xl font-bold text-white mb-1 truncate'>
									{viewUser.fullName || viewUser.email || 'Профиль пользователя'}
								</h1>
								<div className='flex flex-wrap items-center gap-2 text-sm text-gray-400'>
									<span>{getRoleName(viewUser.role)}</span>
									{viewUser.location && (
										<>
											<span>•</span>
											<span>📍 {viewUser.location}</span>
										</>
									)}
								</div>
							</div>

							{/* Кнопка найма */}
							{canHire && (
								<div className='flex gap-2'>
									{hireState === 'accepted' ? (
										<Link
											href={`/chats?open=${viewUser.id}`}
											className='flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition whitespace-nowrap'
										>
											💬 Перейти в чат
										</Link>
									) : hireState === 'pending' ? (
										<button
											className='px-6 py-2.5 rounded-lg bg-gray-700 text-white cursor-not-allowed font-semibold whitespace-nowrap'
											disabled
										>
											⏳ Запрос отправлен
										</button>
									) : (
										<div className='relative group'>
											<button
												onClick={() => setShowHireModal(true)}
												disabled={sendingHire}
												className='px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-50 font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] whitespace-nowrap'
											>
												💼 Нанять за 1990₽
											</button>
											{/* Подсказка под кнопкой */}
											<div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 p-4 bg-gray-900 border border-emerald-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none'>
												<div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0.5'>
													<div className='w-3 h-3 bg-gray-900 border-l border-t border-emerald-500/30 transform rotate-45'></div>
												</div>
												<p className='text-sm text-gray-300 leading-relaxed mb-2'>
													<span className='text-emerald-400 font-semibold'>1990₽</span> — это плата за{' '}
													<span className='text-emerald-300 font-medium'>доступ к чату</span> с исполнителем.
												</p>
												<p className='text-sm text-gray-300 leading-relaxed'>
													После оплаты вы сможете предложить ему{' '}
													<span className='text-emerald-300 font-medium'>офер на постоянную работу</span> (например, 5/2 с 9 до 18, удалёнка, частичная занятость и т.д.).
												</p>
											</div>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Быстрая статистика для исполнителей */}
						{isExecutor && (
							<div className='flex flex-wrap gap-4 mt-4'>
								{(viewUser.xpComputed !== undefined || viewUser.xp !== undefined) && (
									<div className='flex items-center gap-2 text-sm'>
										<FaChartLine className='text-emerald-400' />
										<span className='text-gray-300'>{viewUser.xpComputed ?? viewUser.xp ?? 0} XP</span>
									</div>
								)}
								{avgRating && (
									<div className='flex items-center gap-2 text-sm'>
										<FaStar className='text-yellow-400' />
										<span className='text-gray-300'>
											{avgRating} / 5 ({reviewsCount} отзывов)
										</span>
									</div>
								)}
							</div>
						)}
						{/* Быстрая статистика для заказчиков */}
						{viewUser.role === 'customer' && (
							<div className='flex flex-wrap gap-4 mt-4'>
								{avgRating && (
									<div className='flex items-center gap-2 text-sm'>
										<FaStar className='text-yellow-400' />
										<span className='text-gray-300'>
											{avgRating} / 5 ({reviewsCount} отзывов)
										</span>
									</div>
								)}
							</div>
						)}
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
							{viewUser.description && (
								<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
									<h3 className='text-lg font-semibold text-emerald-400 mb-2'>О себе</h3>
									<p className='text-gray-300 text-sm leading-relaxed'>{viewUser.description}</p>
								</div>
							)}

							{/* Навыки - только для исполнителей */}
							{viewUser.role === 'executor' && viewUser.skills && Array.isArray(viewUser.skills) && viewUser.skills.length > 0 && (
								<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
									<h3 className='text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2'>
										<FaToolbox />
										Навыки
									</h3>
									<div className='flex flex-wrap gap-2'>
										{viewUser.skills.filter(skill => skill && skill.trim()).map((skill, index) => (
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
						</div>

						{/* Правая колонка */}
						<div className='lg:col-span-2 space-y-4'>
							{/* Статистика для исполнителей */}
							{isExecutor && viewUser._count && (
								<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
									<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
										<FaChartLine />
										Статистика
									</h3>
									<div className='grid grid-cols-2 md:grid-cols-2 gap-4'>
										<div className='text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20'>
											<div className='text-2xl font-bold text-blue-300'>
												{viewUser._count.reviewsReceived || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Отзывов</div>
										</div>
										{avgRating && (
											<div className='text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20'>
												<div className='text-2xl font-bold text-yellow-300'>{avgRating}</div>
												<div className='text-xs text-gray-400 mt-1'>Рейтинг</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Достижения */}
				{activeTab === 'achievements' && (
					<div>
						{viewUser.badges && Array.isArray(viewUser.badges) && viewUser.badges.length > 0 ? (
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
								{viewUser.badges.map(userBadge => (
									<div
										key={userBadge.id}
										className='group relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02]'
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
														{new Date(userBadge.earnedAt).toLocaleDateString('ru-RU', { 
															day: 'numeric', 
															month: 'long', 
															year: 'numeric' 
														})}
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
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaTrophy className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет достижений</p>
							</div>
						)}
					</div>
				)}

				{/* Отзывы */}
				{activeTab === 'reviews' && (
					<div>
						{reviews.length > 0 ? (
							<div className='space-y-4 sm:space-y-6'>
								{reviews.map(review => {
									const ratingColor = review.rating >= 4 
										? 'from-yellow-600 via-yellow-500 to-yellow-600 border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.6)]'
										: review.rating >= 3
										? 'from-emerald-600 via-emerald-500 to-emerald-600 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
										: 'from-gray-600 via-gray-500 to-gray-600 border-gray-500/60 shadow-[0_0_15px_rgba(156,163,175,0.4)]'
									
									return (
										<div
											key={review.id}
											className='group relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-5 sm:p-6 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.01]'
										>
											{/* Декоративный фон */}
											<div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
											<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>
											
											<div className='relative z-10'>
												<div className='flex flex-col sm:flex-row items-start gap-4 sm:gap-6'>
													{/* Рейтинг - премиальный дизайн */}
													<div className='flex-shrink-0 relative'>
														<div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br ${ratingColor} border-2 flex flex-col items-center justify-center p-3 shadow-lg`}>
															{/* Внутреннее свечение */}
															<div className='absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/20'></div>
															<div className='absolute inset-1 rounded-lg border border-white/20'></div>
															
															{/* Иконка звезды */}
															<div className='relative z-10 flex flex-col items-center justify-center'>
																<FaStar className={`text-2xl sm:text-3xl mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] ${
																	review.rating >= 4 ? 'text-yellow-300' : review.rating >= 3 ? 'text-emerald-300' : 'text-gray-300'
																}`} />
																<span className='text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]'>
																	{review.rating}
																</span>
																<span className='text-[10px] sm:text-xs text-gray-300 mt-0.5'>из 5</span>
															</div>
														</div>
														{/* Внешнее свечение */}
														<div className={`absolute -inset-2 rounded-xl bg-gradient-to-br ${ratingColor} opacity-30 blur-md animate-pulse`}></div>
													</div>
													
													{/* Информация об отзыве */}
													<div className='flex-1 min-w-0 w-full'>
														{/* Заголовок с автором и задачей */}
														<div className='mb-4'>
															<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3'>
																<div className='flex flex-wrap items-center gap-2'>
																	{review.fromUser && (
																		<>
																			<span className='font-bold text-white text-base sm:text-lg group-hover:text-emerald-300 transition-colors'>
																				{review.fromUser.fullName || review.fromUser.email}
																			</span>
																			{review.task && (
																				<>
																					<span className='text-gray-500 hidden sm:inline'>•</span>
																					<Link
																						href={`/tasks/${review.task.id}`}
																						className='text-emerald-400 hover:text-emerald-300 transition-colors text-sm sm:text-base font-medium truncate max-w-md hover:underline flex items-center gap-1'
																					>
																						<span>📋</span>
																						<span className='truncate'>{review.task.title}</span>
																					</Link>
																				</>
																			)}
																		</>
																	)}
																</div>
																<span className='text-xs sm:text-sm text-gray-400 font-medium'>
																	{new Date(review.createdAt).toLocaleDateString('ru-RU', {
																		day: 'numeric',
																		month: 'long',
																		year: 'numeric',
																		hour: '2-digit',
																		minute: '2-digit'
																	})}
																</span>
															</div>
														</div>
														
														{/* Комментарий - премиальный стиль */}
														{review.comment && review.comment.trim() && (
															<div className='relative bg-black/40 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4 sm:p-5 group-hover:border-emerald-500/30 transition-all duration-300'>
																{/* Декоративный уголок */}
																<div className='absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500/30 rounded-tl-lg'></div>
																<div className='absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500/30 rounded-br-lg'></div>
																
																<p className='text-sm sm:text-base text-gray-200 leading-relaxed whitespace-pre-wrap relative z-10'>
																	{review.comment}
																</p>
															</div>
														)}
													</div>
												</div>
											</div>
											
											{/* Блестящий эффект сверху */}
											<div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
										</div>
									)
								})}
							</div>
						) : (
							<div className='text-center py-12 sm:py-16 bg-black/40 rounded-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
								<FaComments className='text-6xl sm:text-7xl text-gray-600 mx-auto mb-4 opacity-50' />
								<p className='text-gray-400 text-lg font-medium'>Пока нет отзывов</p>
							</div>
						)}
					</div>
				)}

				{/* Сертификации */}
				{activeTab === 'certifications' && (
					<div>
						{viewUser.certifications && viewUser.certifications.length > 0 ? (
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{viewUser.certifications.map(cert => (
									<div
										key={cert.id}
										className='bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20'
									>
										<div className='flex items-center gap-2 mb-2'>
											<FaAward className='text-yellow-400' />
											<span className='font-semibold text-emerald-300'>{cert.subcategory.name}</span>
										</div>
										<p className='text-sm text-gray-300 mb-1'>Уровень: {cert.level}</p>
										<p className='text-xs text-gray-400'>
											Получено: {new Date(cert.grantedAt).toLocaleDateString()}
										</p>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaCertificate className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет сертификаций</p>
							</div>
						)}
					</div>
				)}

				{/* Портфолио */}
				{activeTab === 'portfolio' && isExecutor && (
					<div>
						{portfolioLoading ? (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<div className='animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4' />
								<p className='text-gray-400'>Загрузка портфолио...</p>
							</div>
						) : portfolio.length === 0 ? (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaBriefcase className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Портфолио пусто</p>
							</div>
						) : (
							<PublicPortfolioGrid portfolio={portfolio} />
						)}
					</div>
				)}
			</div>

			{/* Модальное окно найма */}
			{showHireModal && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'
					onClick={() => setShowHireModal(false)}
					data-nextjs-scroll-focus-boundary={false}
				>
					<div
						className='bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full max-w-md mx-4 p-6 md:p-8'
						onClick={e => e.stopPropagation()}
					>
						<h2 className='text-2xl font-bold text-emerald-400 mb-2'>Нанять исполнителя</h2>
						
						{/* Информационный блок о стоимости */}
						<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6'>
							<div className='flex items-start gap-3'>
								<span className='text-2xl'>💡</span>
								<div className='flex-1'>
									<p className='text-emerald-300 font-semibold text-sm mb-2'>
										Что включает в себя оплата?
									</p>
									<p className='text-gray-300 text-sm leading-relaxed mb-2'>
										<span className='text-emerald-400 font-semibold'>1990₽</span> — это плата за{' '}
										<span className='text-emerald-300 font-medium'>доступ к чату</span> с исполнителем.
									</p>
									<p className='text-gray-300 text-sm leading-relaxed'>
										После оплаты вы получите возможность общаться с ним и предложить{' '}
										<span className='text-emerald-300 font-medium'>офер на постоянную работу</span> (например, 5/2 с 9 до 18, удалёнка, частичная занятость и т.д.).
									</p>
								</div>
							</div>
						</div>

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
								{hireError && <p className='text-red-400 text-sm mt-1'>{hireError}</p>}
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

// Функция для определения типа медиа по расширению файла
function detectMediaType(imageUrl: string | null, currentType?: string | null): 'image' | 'video' | 'document' {
	// Сначала проверяем расширение файла (приоритет)
	if (imageUrl) {
		const lower = imageUrl.toLowerCase()
		// Видео
		if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.avi') || lower.endsWith('.mkv')) {
			return 'video'
		}
		// Документы
		if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') || 
		    lower.endsWith('.txt') || lower.endsWith('.rtf') || lower.endsWith('.odt')) {
			return 'document'
		}
		// Изображения
		if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || 
		    lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
			return 'image'
		}
	}
	// Если currentType валидный, используем его
	if (currentType === 'video' || currentType === 'image' || currentType === 'document') {
		return currentType as 'image' | 'video' | 'document'
	}
	// По умолчанию - изображение
	return 'image'
}

// Функция для получения правильного URL медиа
function getMediaUrl(imageUrl: string | null): string {
	if (!imageUrl) return ''
	// Если уже полный URL (http/https) или начинается с /uploads/, используем как есть
	if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/uploads/')) {
		return imageUrl
	}
	// Если начинается с /, используем как есть
	if (imageUrl.startsWith('/')) {
		return imageUrl
	}
	// Иначе используем через /api/files/
	return `/api/files/${imageUrl}`
}

function PublicPortfolioGrid({ portfolio }: { portfolio: any[] }) {
	const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
	const [selectedItem, setSelectedItem] = useState<any>(null)
	
	const toggleDescription = (id: string) => {
		setExpandedDescriptions(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	return (
		<>
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
			{portfolio.map((item: any) => {
				const itemMediaType = detectMediaType(item.imageUrl, item.mediaType)
				const descriptionLength = item.description?.length || 0
				const shouldShowExpand = descriptionLength > 150
				const isExpanded = expandedDescriptions.has(item.id)
				
				return (
					<div
						key={item.id}
						onClick={() => setSelectedItem(item)}
						className='bg-black/40 border border-blue-500/30 rounded-xl overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] flex flex-col cursor-pointer'
					>
						{item.imageUrl && (
							<div className='aspect-video bg-gray-900 relative overflow-hidden'>
								{itemMediaType === 'video' ? (
									<VideoPlayer
										src={getMediaUrl(item.imageUrl)}
										className='w-full h-full'
										onError={(e) => {
											console.error('Ошибка загрузки видео портфолио:', item.imageUrl)
											if (e.currentTarget) {
												e.currentTarget.style.display = 'none'
											}
										}}
									/>
								) : itemMediaType === 'document' ? (
									<div className='w-full h-full flex items-center justify-center bg-gray-800'>
										<iframe
											src={getMediaUrl(item.imageUrl)}
											className='w-full h-full'
											title={item.title}
											onError={(e) => {
												console.error('Ошибка загрузки документа портфолио:', item.imageUrl)
												const iframe = e.target as HTMLIFrameElement
												iframe.style.display = 'none'
											}}
										/>
									</div>
								) : (
									<img
										src={getMediaUrl(item.imageUrl)}
										alt={item.title}
										className='w-full h-full object-cover hover:scale-105 transition-transform duration-300'
										onError={(e) => {
											const img = e.target as HTMLImageElement
											const currentSrc = img.src
											if (!currentSrc.includes('/api/files/') && !item.imageUrl?.startsWith('/uploads/')) {
												img.src = `/api/files/${item.imageUrl}`
											} else {
												img.style.display = 'none'
											}
										}}
									/>
								)}
							</div>
						)}
						<div className='p-4 flex-1 flex flex-col'>
							<h4 className='text-white font-semibold text-lg mb-2 line-clamp-1'>
								{item.title}
							</h4>
							<div className='flex-1'>
								<p className={`text-gray-400 text-sm mb-3 ${!isExpanded && shouldShowExpand ? 'line-clamp-2' : ''}`}>
									{item.description}
								</p>
								{shouldShowExpand && (
									<button
										onClick={() => toggleDescription(item.id)}
										className='text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mb-3 transition'
									>
										{isExpanded ? (
											<>
												<ChevronUp className='w-3 h-3' />
												Свернуть
											</>
										) : (
											<>
												<ChevronDown className='w-3 h-3' />
												Развернуть
											</>
										)}
									</button>
								)}
							</div>
							{item.task && (
								<div className='text-blue-400 text-xs mb-2 flex items-center gap-1'>
									<span>📋</span>
									<span className='line-clamp-1'>{item.task.title}</span>
								</div>
							)}
							{item.externalUrl && (
								<a
									href={item.externalUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 hover:underline transition-colors'
								>
									<span>🔗</span>
									<span>Открыть проект</span>
								</a>
							)}
						</div>
					</div>
				)
			})}
		</div>
		{selectedItem && (
			<PortfolioDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
		)}
	</>
	)
}

function PortfolioDetailModal({ item, onClose }: { item: any, onClose: () => void }) {
	const itemMediaType = detectMediaType(item.imageUrl, item.mediaType)
	
	// Закрытие по Escape
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [onClose])
	
	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4'
			onClick={onClose}
			data-nextjs-scroll-focus-boundary={false}
		>
			<div
				className='bg-gray-900/95 border border-blue-500/20 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col'
				onClick={(e) => e.stopPropagation()}
			>
				{/* Компактный заголовок */}
				<div className='px-4 py-3 border-b border-blue-500/20 flex items-center justify-between bg-gray-900/50'>
					<h2 className='text-lg sm:text-xl font-bold text-white truncate pr-2'>{item.title}</h2>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-white transition-colors text-2xl leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-800 rounded'
						aria-label='Закрыть'
					>
						×
					</button>
				</div>
				
				{/* Контент с прокруткой */}
				<div className='overflow-y-auto flex-1'>
					{item.imageUrl && (
						<div className='bg-gray-800/50'>
							{itemMediaType === 'video' ? (
								<VideoPlayer
									src={getMediaUrl(item.imageUrl)}
									className='w-full h-auto max-h-[50vh]'
									onError={(e) => {
										console.error('Ошибка загрузки видео портфолио:', item.imageUrl)
										if (e.currentTarget) {
											e.currentTarget.style.display = 'none'
										}
									}}
								/>
							) : itemMediaType === 'document' ? (
								<div className='w-full h-[60vh] bg-gray-900'>
									<iframe
										src={getMediaUrl(item.imageUrl)}
										className='w-full h-full'
										title={item.title}
										onError={(e) => {
											console.error('Ошибка загрузки документа портфолио:', item.imageUrl)
											const iframe = e.target as HTMLIFrameElement
											iframe.style.display = 'none'
										}}
									/>
								</div>
							) : (
								<img
									src={getMediaUrl(item.imageUrl)}
									alt={item.title}
									className='w-full h-auto max-h-[50vh] object-contain'
									onError={(e) => {
										const img = e.target as HTMLImageElement
										const currentSrc = img.src
										if (!currentSrc.includes('/api/files/') && !item.imageUrl?.startsWith('/uploads/')) {
											img.src = `/api/files/${item.imageUrl}`
										} else {
											img.style.display = 'none'
										}
									}}
								/>
							)}
						</div>
					)}
					
					<div className='p-4 space-y-3'>
						<div>
							<p className='text-gray-300 text-sm leading-relaxed whitespace-pre-wrap'>{item.description}</p>
						</div>
						
						{item.task && (
							<div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
								<div className='text-blue-400 text-xs mb-1 font-medium'>📋 Связанная задача</div>
								<div className='text-white text-sm'>{item.task.title}</div>
							</div>
						)}
						
						{item.externalUrl && (
							<a
								href={item.externalUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg transition-colors text-sm'
							>
								<span>🔗</span>
								<span>Открыть проект</span>
							</a>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
