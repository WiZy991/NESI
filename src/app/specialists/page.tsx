'use client'

import { useUser } from '@/context/UserContext'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

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
	const [minXp, setMinXp] = useState('')
	const [minRating, setMinRating] = useState('')
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
		if (minXp.trim()) p.set('minXp', String(parseInt(minXp, 10) || 0))
		if (minRating.trim()) p.set('minRating', String(parseFloat(minRating) || 0))
		p.set('sort', sort) // 👈 теперь отправляем выбранную сортировку
		p.set('page', String(page))
		p.set('take', String(take))
		return p.toString()
	}, [q, city, skill, minXp, minRating, page, sort]) // добавили зависимость sort

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
					const res = await fetch(`/api/specialists?${queryString}`, {
						cache: 'no-store',
						signal: ctrl.signal,
					})
					const data: ApiResponse = await res.json()
					if (!res.ok)
						throw new Error(
							(data as any)?.error || `${res.status} ${res.statusText}`
						)

					// сортировка теперь идёт на бэке
					setItems(data.items || [])
					setTotal(data.total || 0)
					setPages(data.pages || 1)
				} catch (e: any) {
					if (e?.name === 'AbortError') return
					setError(e?.message || 'Ошибка загрузки исполнителей')
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
	}, [q, city, skill, minXp, minRating, sort])

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
		const calc = levelFromXp(xpValue)
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
					whileHover={{ scale: 1.05, y: -6 }}
					transition={spring}
				>
					<div className='relative bg-black/50 backdrop-blur-md text-white p-4 rounded-2xl border border-emerald-700/30 hover:border-emerald-500/50 transition'>
						<Link href={`/users/${u.id}`} className='block'>
							{u.avatarUrl ? (
								<img
									src={u.avatarUrl}
									alt={name}
									className='w-12 h-12 rounded-full mb-2 object-cover'
								/>
							) : (
								<div className='w-12 h-12 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-base font-bold'>
									{letter}
								</div>
							)}
							<h3 className='text-lg font-semibold leading-tight'>{name}</h3>
							<p className='text-xs text-gray-300 mb-3'>
								{u.location || 'Без города'}
							</p>

							<div className='flex items-center justify-between text-xs mb-1'>
								<span>
									Уровень: <span className='font-semibold'>{calc.lvl}</span>
								</span>
								<span className='opacity-70'>{xpValue} XP</span>
							</div>

							<div className='h-2 rounded bg-emerald-950/60 overflow-hidden mb-1'>
								<motion.div
									className='h-full bg-emerald-500'
									animate={{ width: `${calc.progress}%` }}
								/>
							</div>

							<div className='text-[11px] text-gray-400 mb-3'>
								До следующего уровня:{' '}
								{calc.toNext > 0 ? `${calc.toNext} XP` : '—'}
							</div>

							{/* === Статистика === */}
							<div className='grid grid-cols-2 gap-3 text-xs text-gray-200 justify-center'>
								<div className='rounded bg-emerald-950/60 p-3 text-center border border-emerald-800/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'>
									<div className='text-base font-semibold text-emerald-400'>
										{(u.avgRating ?? 0).toFixed(1)}
									</div>
									<div className='opacity-70 text-[11px]'>Рейтинг</div>
								</div>
								<div className='rounded bg-emerald-950/60 p-3 text-center border border-emerald-800/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'>
									<div className='text-base font-semibold text-emerald-400'>
										{reviews}
									</div>
									<div className='opacity-70 text-[11px]'>Отзывы</div>
								</div>
							</div>

							{skillsStr && (
								<p className='text-[11px] mt-3 text-gray-400 line-clamp-2'>
									Навыки: {skillsStr}
								</p>
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
		<div className='mx-auto w-full max-w-6xl px-4 py-6'>
			<h2 className='text-xl font-bold mb-4 text-white'>
				⚡ Подиум исполнителей
			</h2>

			{/* Фильтры */}
			<div className='grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-black/40 backdrop-blur-sm border border-emerald-800/40 rounded-xl p-4 mb-6'>
				<div className='md:col-span-2'>
					<label className='block text-xs text-gray-400 mb-1'>Поиск</label>
					<input
						value={q}
						onChange={e => setQ(e.target.value)}
						placeholder='имя или почта'
						className='w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500'
					/>
				</div>
				<div>
					<label className='block text-xs text-gray-400 mb-1'>Город</label>
					<input
						value={city}
						onChange={e => setCity(e.target.value)}
						placeholder='например: Москва'
						className='w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500'
					/>
				</div>
				<div>
					<label className='block text-xs text-gray-400 mb-1'>Навык</label>
					<input
						value={skill}
						onChange={e => setSkill(e.target.value)}
						placeholder='точно из списка навыков'
						className='w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500'
					/>
				</div>
				<div>
					<label className='block text-xs text-gray-400 mb-1'>Мин. XP</label>
					<input
						value={minXp}
						onChange={e => setMinXp(e.target.value)}
						placeholder='например: 50'
						className='w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500'
					/>
				</div>
				<div>
					<label className='block text-xs text-gray-400 mb-1'>
						Мин. рейтинг
					</label>
					<input
						value={minRating}
						onChange={e => setMinRating(e.target.value)}
						placeholder='например: 4.0'
						className='w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500'
					/>
				</div>
			</div>

			{/* Переключатель сортировки */}
			<div className='flex items-center gap-4 text-white mb-6'>
				<span className='text-sm opacity-70'>Сортировка:</span>
				<label className='flex items-center gap-1 text-sm cursor-pointer'>
					<input
						type='radio'
						name='sort'
						value='rating'
						checked={sort === 'rating'}
						onChange={() => setSort('rating')}
						className='accent-emerald-500'
					/>
					По рейтингу
				</label>
				<label className='flex items-center gap-1 text-sm cursor-pointer'>
					<input
						type='radio'
						name='sort'
						value='reviews'
						checked={sort === 'reviews'}
						onChange={() => setSort('reviews')}
						className='accent-emerald-500'
					/>
					По отзывам
				</label>
				<label className='flex items-center gap-1 text-sm cursor-pointer'>
					<input
						type='radio'
						name='sort'
						value='xp'
						checked={sort === 'xp'}
						onChange={() => setSort('xp')}
						className='accent-emerald-500'
					/>
					По опыту
				</label>
			</div>

			<div ref={listTopRef} />
			{loading && <div className='text-gray-300'>Загрузка…</div>}
			{error && <div className='text-red-400'>{error}</div>}

			{!loading && !error && items.length === 0 && (
				<div className='text-gray-400'>Исполнителей не найдено</div>
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
							className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
						>
							{items.map(u => (
								<Card key={u.id} {...u} />
							))}
						</motion.div>
					</AnimatePresence>
				</LayoutGroup>
			)}

			{/* Пагинация */}
			{!loading && !error && pages > 1 && (
				<div className='mt-8 flex flex-wrap items-center justify-center gap-2 text-white'>
					<button
						disabled={page <= 1}
						onClick={() => changePage(1)}
						className='px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition'
					>
						« Первая
					</button>
					<button
						disabled={page <= 1}
						onClick={() => changePage(page - 1)}
						className='px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition'
					>
						← Назад
					</button>
					{getPageNumbers().map(p => (
						<button
							key={p}
							onClick={() => changePage(p)}
							className={`px-3 py-1 rounded-lg border text-sm transition ${
								p === page
									? 'border-emerald-500 bg-emerald-600/20 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
									: 'border-emerald-700/40 hover:border-emerald-500/60'
							}`}
						>
							{p}
						</button>
					))}
					<button
						disabled={page >= pages}
						onClick={() => changePage(page + 1)}
						className='px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition'
					>
						Вперёд →
					</button>
					<button
						disabled={page >= pages}
						onClick={() => changePage(pages)}
						className='px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition'
					>
						Последняя »
					</button>
					<span className='ml-3 text-xs text-gray-400'>
						Стр. {page} из {pages} • всего {total}
					</span>
				</div>
			)}
		</div>
	)
}
