'use client'

import { useUser } from '@/context/UserContext'
import { SpecialistListSkeleton } from '@/components/SkeletonLoader/SpecialistCardSkeleton'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { getLevelVisuals } from '@/lib/level/rewards'

type SpecialistItem = {
	id: string
	fullName: string | null
	email: string | null
	avatarUrl: string | null
	location: string | null
	skills: string[] | null
	xp: number | null
	xpComputed?: number | null
	lvl?: number
	progress?: number
	toNext?: number
	completedTasksCount: number | null
	avgRating: number | null
	badges: Array<{ badge: { id: string; name: string; icon: string } }>
	_count?: { reviewsReceived?: number }
	reviewsCount?: number
}

type ApiResponse = {
	items: SpecialistItem[]
	total: number
	page: number
	pages: number
	take: number
}

const BOUNDS = [0, 100, 300, 600, 1000, 1500, 2100]
function levelFromXp(xpRaw: number) {
	const xp = Math.max(0, xpRaw ?? 0)
	let lvl = 0
	for (let i = 0; i < BOUNDS.length; i++) {
		if (xp >= BOUNDS[i]) lvl = i
		else break
	}
	const prev = BOUNDS[lvl] ?? 0
	const next = BOUNDS[lvl + 1] ?? prev + 400
	const progress = Math.min(
		100,
		Math.round(((xp - prev) / Math.max(1, next - prev)) * 100)
	)
	const toNext = Math.max(0, next - xp)
	return { lvl, progress, toNext }
}

export default function SpecialistsPage() {
	const { user } = useUser()

	const [q, setQ] = useState('')
	const [city, setCity] = useState('')
	const [skill, setSkill] = useState('')
	const [page, setPage] = useState(1)
	const [sort, setSort] = useState<'rating' | 'reviews' | 'xp'>('rating') // 💡 новый стейт сортировки

	const take = 12

	const [items, setItems] = useState<SpecialistItem[]>([])
	const [total, setTotal] = useState(0)
	const [pages, setPages] = useState(1)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const queryString = useMemo(() => {
		const p = new URLSearchParams()
		if (q.trim()) p.set('q', q.trim())
		if (city.trim()) p.set('city', city.trim())
		if (skill.trim()) p.set('skill', skill.trim())
		p.set('sort', sort) // 👈 теперь отправляем выбранную сортировку
		p.set('page', String(page))
		p.set('take', String(take))
		return p.toString()
	}, [q, city, skill, page, sort]) // добавили зависимость sort

	const abortRef = useRef<AbortController | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			abortRef.current?.abort()
			const ctrl = new AbortController()
			abortRef.current = ctrl
			;(async () => {
				setLoading(true)
				setError(null)
				try {
					const { fetchJsonWithRetry } = await import('@/lib/retry')
					const data = await fetchJsonWithRetry<ApiResponse>(
						`/api/specialists?${queryString}`,
						{
							cache: 'no-store',
							signal: ctrl.signal,
						},
						{ maxRetries: 2, retryDelay: 800 }
					)

					// сортировка теперь идёт на бэке
					setItems(data.items || [])
					setTotal(data.total || 0)
					setPages(data.pages || 1)
				} catch (e: unknown) {
					if (e instanceof Error && e.name === 'AbortError') return
					const errorMessage =
						e instanceof Error
							? e.message
							: 'Ошибка загрузки исполнителей'
					setError(errorMessage)
					setItems([])
					setTotal(0)
					setPages(1)
				} finally {
					setLoading(false)
				}
			})()
		}, 300)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [queryString])

	useEffect(() => {
		setPage(1)
	}, [q, city, skill, sort])

	const spring = {
		type: 'spring',
		stiffness: 220,
		damping: 22,
		mass: 0.9,
		bounce: 0.25,
	}

	const listTopRef = useRef<HTMLDivElement | null>(null)
	const scrollToListTop = () => {
		const y =
			(listTopRef.current?.getBoundingClientRect().top ?? 0) +
			window.scrollY -
			80
		window.scrollTo({ top: y, behavior: 'smooth' })
	}

	const Card = (u: SpecialistItem) => {
		const name = u.fullName || u.email || 'Без имени'
		const letter = (name[0] || '•').toUpperCase()
		const xpValue = (u.xpComputed ?? u.xp ?? 0) || 0
		// Используем данные из API (правильный расчет уровня из БД), если они есть
		const calc =
			u.lvl !== undefined && u.progress !== undefined && u.toNext !== undefined
				? { lvl: u.lvl, progress: u.progress, toNext: u.toNext }
				: levelFromXp(xpValue) // fallback на локальную функцию
		const reviews = u.reviewsCount ?? u._count?.reviewsReceived ?? 0
		const skillsStr = Array.isArray(u.skills)
			? u.skills.join(', ')
			: u.skills || ''
		const [showHireModal, setShowHireModal] = useState(false)
		const [hireMessage, setHireMessage] = useState('')
		const [isHiring, setIsHiring] = useState(false)
		const [hireError, setHireError] = useState('')

		const handleHire = async (e: React.FormEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (!hireMessage.trim()) {
				setHireError('Напишите сопроводительное письмо')
				return
			}

			setIsHiring(true)
			setHireError('')

			try {
				const res = await fetch('/api/hire', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						executorId: u.id,
						message: hireMessage.trim(),
					}),
				})

				const data = await res.json()

				if (!res.ok) {
					setHireError(data.error || 'Ошибка при отправке запроса')
					return
				}

				// Успех
				setShowHireModal(false)
				setHireMessage('')
				alert('Запрос найма отправлен! Исполнитель получит уведомление в чате.')
			} catch (err) {
				setHireError('Ошибка сервера')
			} finally {
				setIsHiring(false)
			}
		}

		return (
			<>
				<motion.div
					layout
					whileHover={{ scale: 1.02, y: -4 }}
					transition={spring}
					className='group'
				>
					<div className='relative overflow-hidden bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm text-white p-5 sm:p-6 rounded-2xl border border-emerald-500/30 hover:border-emerald-400/60 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(16,185,129,0.35)]'>
						{/* Декоративный градиент при наведении */}
						<div className='absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10'></div>

						<Link href={`/users/${u.id}`} className='block space-y-4'>
							{/* Аватар и имя */}
							<div className='flex items-start gap-4'>
								<div className='relative flex-shrink-0'>
									{(() => {
										const visuals = getLevelVisuals(calc.lvl)
										const borderClass = visuals.borderColor || 'border-emerald-500/40'
										return u.avatarUrl ? (
											<img
												src={u.avatarUrl}
												alt={name}
												className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 ${borderClass} group-hover:border-emerald-400/60 transition-colors`}
											/>
										) : (
											<div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-600/30 to-emerald-800/30 border-2 ${borderClass} group-hover:border-emerald-400/60 flex items-center justify-center text-lg sm:text-xl font-bold text-emerald-300 transition-colors`}>
												{letter}
											</div>
										)
									})()}
								</div>
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2 flex-wrap'>
										<h3 className='text-lg sm:text-xl font-bold leading-tight text-white group-hover:text-emerald-300 transition-colors line-clamp-1'>
											{name}
										</h3>
										<LevelBadge level={calc.lvl} size='sm' />
									</div>
									<p className='text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-1'>
										<span>📍</span>
										<span className='line-clamp-1'>
											{u.location || 'Без города'}
										</span>
									</p>
								</div>
							</div>

							{/* Прогресс уровня */}
							<div className='space-y-2'>
								<div className='flex items-center justify-between text-xs sm:text-sm'>
									<span className='text-gray-400'>
										Уровень{' '}
										<span className='font-semibold text-emerald-400'>
											{calc.lvl}
										</span>
									</span>
									<span className='text-emerald-400 font-semibold'>
										{xpValue.toLocaleString('ru-RU')} XP
									</span>
								</div>
								<div className='h-2.5 rounded-full bg-black/60 overflow-hidden border border-emerald-500/20'>
									<motion.div
										className='h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'
										animate={{ width: `${calc.progress}%` }}
										transition={{ duration: 0.5 }}
									/>
								</div>
								{calc.toNext > 0 && (
									<div className='text-[11px] text-gray-500 text-center'>
										До следующего уровня:{' '}
										<span className='text-emerald-400 font-semibold'>
											{calc.toNext} XP
										</span>
									</div>
								)}
							</div>

							{/* Статистика */}
							<div className='grid grid-cols-2 gap-3'>
								<div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 p-4 text-center border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all'>
									<div className='text-2xl sm:text-3xl font-bold text-emerald-400 mb-1'>
										{(u.avgRating ?? 0).toFixed(1)}
									</div>
									<div className='text-[11px] sm:text-xs text-gray-300 flex items-center justify-center gap-1'>
										<span>⭐</span>
										<span>Рейтинг</span>
									</div>
								</div>
								<div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 p-4 text-center border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all'>
									<div className='text-2xl sm:text-3xl font-bold text-emerald-400 mb-1'>
										{reviews}
									</div>
									<div className='text-[11px] sm:text-xs text-gray-300 flex items-center justify-center gap-1'>
										<span>💬</span>
										<span>Отзывы</span>
									</div>
								</div>
							</div>

							{/* Навыки */}
							{skillsStr && (
								<div className='pt-2 border-t border-emerald-500/20'>
									<p className='text-xs sm:text-sm text-gray-400 line-clamp-2'>
										<span className='text-emerald-400 font-semibold'>
											Навыки:
										</span>{' '}
										{skillsStr}
									</p>
								</div>
							)}
						</Link>

						{/* Кнопка найма скрыта на подиуме */}
						{false && user?.role === 'customer' && user.id !== u.id && (
							<button className='hidden' />
						)}
					</div>
				</motion.div>

				{/* Модальное окно найма скрыто на подиуме */}
				{false && showHireModal && <div className='hidden' />}
			</>
		)
	}

	const getPageNumbers = () => {
		const spread = 2
		const start = Math.max(1, page - spread)
		const end = Math.min(pages, page + spread)
		const arr: number[] = []
		for (let p = start; p <= end; p++) arr.push(p)
		return arr
	}

	const changePage = (p: number) => {
		if (p === page || p < 1 || p > pages) return
		setPage(p)
		scrollToListTop()
	}

	return (
		<div className='mx-auto w-full max-w-6xl px-4 py-6 md:py-8'>
			{/* Hero секция с заголовком */}
			<div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-black/80 via-emerald-900/20 to-black/80 border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.4)] mb-8 backdrop-blur-xl'>
				{/* Декоративные элементы */}
				<div className='absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2'></div>
				<div className='absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-400/15 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2'></div>

				<div className='relative p-6 sm:p-8 lg:p-10'>
					<h1 className='text-2xl sm:text-3xl lg:text-4xl font-black mb-3 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center gap-3'>
						<span className='text-3xl sm:text-4xl'>⚡</span>
						<span>Подиум исполнителей</span>
					</h1>
					<p className='text-base sm:text-lg text-gray-300 max-w-2xl'>
						Найдите лучших специалистов для ваших проектов. Фильтруйте по
						навыкам, городу и рейтингу.
					</p>
					{total > 0 && (
						<div className='mt-4 flex items-center gap-4 text-sm text-gray-400'>
							<span className='px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full'>
								Всего:{' '}
								<span className='text-emerald-400 font-semibold'>{total}</span>{' '}
								исполнителей
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Фильтры */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-[0_4px_18px_rgba(16,185,129,0.14)] p-5 sm:p-6 mb-6'>
				{/* Декоративный градиент */}
				<div className='absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-50 -z-10'></div>

				<div className='grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10'>
					<div className='md:col-span-2'>
						<label className='block text-xs sm:text-sm text-emerald-400 mb-2 font-semibold'>
							Поиск
						</label>
						<input
							value={q}
							onChange={e => setQ(e.target.value)}
							placeholder='Имя или почта'
							className='w-full rounded-xl bg-black/60 text-white px-4 py-2.5 outline-none border border-emerald-500/30 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all placeholder:text-gray-500'
						/>
					</div>
					<div>
						<label className='block text-xs sm:text-sm text-emerald-400 mb-2 font-semibold'>
							Город
						</label>
						<input
							value={city}
							onChange={e => setCity(e.target.value)}
							placeholder='Например: Москва'
							className='w-full rounded-xl bg-black/60 text-white px-4 py-2.5 outline-none border border-emerald-500/30 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all placeholder:text-gray-500'
						/>
					</div>
					<div>
						<label className='block text-xs sm:text-sm text-emerald-400 mb-2 font-semibold'>
							Навык
						</label>
						<input
							value={skill}
							onChange={e => setSkill(e.target.value)}
							placeholder='Точно из списка навыков'
							className='w-full rounded-xl bg-black/60 text-white px-4 py-2.5 outline-none border border-emerald-500/30 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all placeholder:text-gray-500'
						/>
					</div>
				</div>
			</div>

			{/* Переключатель сортировки */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-[0_4px_18px_rgba(16,185,129,0.14)] p-5 sm:p-6 mb-6'>
				<div className='flex flex-wrap items-center gap-4 sm:gap-6 text-white'>
					<span className='text-sm sm:text-base text-emerald-400 font-semibold'>
						Сортировка:
					</span>
					<div className='flex flex-wrap items-center gap-3 sm:gap-4'>
						<label className='flex items-center gap-2 text-sm sm:text-base cursor-pointer group'>
							<input
								type='radio'
								name='sort'
								value='rating'
								checked={sort === 'rating'}
								onChange={() => setSort('rating')}
								className='accent-emerald-500 w-4 h-4'
							/>
							<span
								className={`transition-colors ${
									sort === 'rating'
										? 'text-emerald-400 font-semibold'
										: 'text-gray-300 group-hover:text-emerald-300'
								}`}
							>
								⭐ По рейтингу
							</span>
						</label>
						<label className='flex items-center gap-2 text-sm sm:text-base cursor-pointer group'>
							<input
								type='radio'
								name='sort'
								value='reviews'
								checked={sort === 'reviews'}
								onChange={() => setSort('reviews')}
								className='accent-emerald-500 w-4 h-4'
							/>
							<span
								className={`transition-colors ${
									sort === 'reviews'
										? 'text-emerald-400 font-semibold'
										: 'text-gray-300 group-hover:text-emerald-300'
								}`}
							>
								💬 По отзывам
							</span>
						</label>
						<label className='flex items-center gap-2 text-sm sm:text-base cursor-pointer group'>
							<input
								type='radio'
								name='sort'
								value='xp'
								checked={sort === 'xp'}
								onChange={() => setSort('xp')}
								className='accent-emerald-500 w-4 h-4'
							/>
							<span
								className={`transition-colors ${
									sort === 'xp'
										? 'text-emerald-400 font-semibold'
										: 'text-gray-300 group-hover:text-emerald-300'
								}`}
							>
								🎯 По опыту
							</span>
						</label>
					</div>
				</div>
			</div>

			<div ref={listTopRef} />

			{/* Состояние загрузки */}
			{loading && (
				<div className='flex items-center justify-center min-h-[400px]'>
					<div className='text-center'>
						<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4'></div>
						<p className='text-gray-400'>Загрузка исполнителей...</p>
					</div>
				</div>
			)}

			{/* Состояние ошибки */}
			{error && (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/20 via-red-800/10 to-black/60 backdrop-blur-sm border border-red-500/30 shadow-[0_4px_18px_rgba(239,68,68,0.2)] p-6 sm:p-8 text-center'>
					<div className='text-4xl mb-3'>⚠️</div>
					<p className='text-red-400 font-semibold text-lg mb-2'>
						Ошибка загрузки
					</p>
					<p className='text-gray-400 text-sm'>{error}</p>
				</div>
			)}

			{/* Пустое состояние */}
			{!loading && !error && items.length === 0 && (
				<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-[0_4px_18px_rgba(16,185,129,0.14)] p-8 sm:p-12 text-center'>
					<div className='text-5xl sm:text-6xl mb-4 opacity-60'>🔍</div>
					<p className='text-xl sm:text-2xl font-bold text-white mb-2'>
						Исполнителей не найдено
					</p>
					<p className='text-gray-400 text-sm sm:text-base max-w-md mx-auto'>
						Попробуйте изменить параметры поиска или фильтры
					</p>
				</div>
			)}

			{!loading && !error && items.length > 0 && (
				<LayoutGroup>
					<AnimatePresence mode='popLayout'>
						<motion.div
							key={`page-${page}`}
							layout
							transition={spring}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
						>
							{items.map((u, index) => (
								<motion.div
									key={u.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.05, duration: 0.3 }}
								>
									<Card {...u} />
								</motion.div>
							))}
						</motion.div>
					</AnimatePresence>
				</LayoutGroup>
			)}

			{/* Пагинация */}
			{!loading && !error && pages > 1 && (
				<div className='mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-[0_4px_18px_rgba(16,185,129,0.14)] p-5 sm:p-6'>
					<div className='flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white'>
						<button
							disabled={page <= 1}
							onClick={() => changePage(1)}
							className='px-3 sm:px-4 py-2 rounded-xl border border-emerald-500/30 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all disabled:hover:bg-transparent'
						>
							« Первая
						</button>
						<button
							disabled={page <= 1}
							onClick={() => changePage(page - 1)}
							className='px-3 sm:px-4 py-2 rounded-xl border border-emerald-500/30 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all disabled:hover:bg-transparent'
						>
							← Назад
						</button>
						{getPageNumbers().map(p => (
							<button
								key={p}
								onClick={() => changePage(p)}
								className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
									p === page
										? 'border-emerald-500 bg-emerald-600/20 shadow-[0_0_12px_rgba(16,185,129,0.35)] text-emerald-400'
										: 'border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10'
								}`}
							>
								{p}
							</button>
						))}
						<button
							disabled={page >= pages}
							onClick={() => changePage(page + 1)}
							className='px-3 sm:px-4 py-2 rounded-xl border border-emerald-500/30 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all disabled:hover:bg-transparent'
						>
							Вперёд →
						</button>
						<button
							disabled={page >= pages}
							onClick={() => changePage(pages)}
							className='px-3 sm:px-4 py-2 rounded-xl border border-emerald-500/30 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all disabled:hover:bg-transparent'
						>
							Последняя »
						</button>
					</div>
					<div className='mt-4 text-center'>
						<span className='text-xs sm:text-sm text-gray-400'>
							Страница{' '}
							<span className='text-emerald-400 font-semibold'>{page}</span> из{' '}
							<span className='text-emerald-400 font-semibold'>{pages}</span> •
							Всего{' '}
							<span className='text-emerald-400 font-semibold'>{total}</span>{' '}
							исполнителей
						</span>
					</div>
				</div>
			)}
		</div>
	)
}
