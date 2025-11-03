'use client'

import CategoryDropdown from '@/components/CategoryDropdown'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import ReportTaskModal from '@/components/ReportTaskModal'
import { AlertTriangle } from 'lucide-react'

type Task = {
	id: string
	title: string
	description: string
	createdAt: string
	price?: number
	status?: string
	customer: { fullName?: string }
	subcategory?: {
		id: string
		name: string
		category: { id: string; name: string }
	}
}

type Category = {
	id: string
	name: string
	subcategories: { id: string; name: string }[]
}

export default function TaskCatalogPage() {
	const { user, token, loading: userLoading } = useUser()
	const [tasks, setTasks] = useState<Task[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isFiltersOpen, setIsFiltersOpen] = useState(false)
	const [reportTaskId, setReportTaskId] = useState<string | null>(null)
	const [reportTaskTitle, setReportTaskTitle] = useState<string>('')

	const searchParams = useSearchParams()
	const router = useRouter()

	const [search, setSearch] = useState(searchParams.get('search') || '')
	const [sort, setSort] = useState(searchParams.get('sort') || 'new')
	const [subcategory, setSubcategory] = useState(
		searchParams.get('subcategory') || ''
	)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [isSortOpen, setIsSortOpen] = useState(false)

	const sortOptions = [
		{ value: 'new', label: 'Сначала новые' },
		{ value: 'old', label: 'Сначала старые' },
	]

	const fetchTasks = useCallback(async () => {
		setLoading(true)
		try {
			const query = new URLSearchParams()
			if (search) query.set('search', search)
			if (sort) query.set('sort', sort)
			if (subcategory) query.set('subcategory', subcategory)
			query.set('page', page.toString())
			query.set('limit', '20')

			const res = await fetch(`/api/tasks?${query.toString()}`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')

			const visibleTasks = (data.tasks || []).filter(
				(task: Task) => task.status === 'open' || !task.status
			)

			setTasks(visibleTasks)
			setTotalPages(data.pagination?.totalPages || 1)
		} catch (err: any) {
			console.error('Ошибка загрузки задач:', err)
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}, [search, sort, subcategory, token, page])

	const fetchCategories = useCallback(async () => {
		try {
			const res = await fetch('/api/categories', { cache: 'no-store' })
			if (!res.ok) throw new Error('Ошибка загрузки категорий')
			const data = await res.json()
			// поддержка двух вариантов ответа API
			setCategories(Array.isArray(data) ? data : data.categories || [])
		} catch (err) {
			console.error('Ошибка загрузки категорий:', err)
		}
	}, [])

	useEffect(() => {
		if (!userLoading && user && token) {
			fetchTasks()
			fetchCategories()
		}
	}, [userLoading, user, token, fetchTasks, fetchCategories])

	const applyFilters = useCallback(() => {
		const query = new URLSearchParams()
		if (search) query.set('search', search)
		if (sort) query.set('sort', sort)
		if (subcategory) query.set('subcategory', subcategory)
		router.push(`/tasks?${query.toString()}`)
		setPage(1)
	}, [search, sort, subcategory, router])

	const resetFilters = useCallback(() => {
		setSearch('')
		setSort('new')
		setSubcategory('')
		setPage(1)
		router.push('/tasks')
	}, [router])

	const handleSubcategorySelect = useCallback(
		(id: string) => {
			setSubcategory(id)
			const query = new URLSearchParams(searchParams.toString())
			query.set('subcategory', id)
			router.push(`/tasks?${query.toString()}`)
		},
		[searchParams, router]
	)

	const renderSkeleton = () => (
		<div className='space-y-4'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className='p-4 sm:p-6 border border-emerald-500/30 rounded-xl bg-black/40 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-3'
				>
					<div className='h-5 bg-emerald-900/40 rounded w-1/2'></div>
					<div className='h-4 bg-emerald-900/30 rounded w-3/4'></div>
					<div className='h-3 bg-emerald-900/20 rounded w-1/4'></div>
				</div>
			))}
		</div>
	)

	return (
		<div className='space-y-4 sm:space-y-6 md:space-y-8'>
			{/* Заголовок */}
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
				<h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]'>
					Каталог задач
				</h1>

				{/* Кнопка фильтров (только на мобильных) */}
				<button
					onClick={() => setIsFiltersOpen(!isFiltersOpen)}
					className='lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-semibold transition-all duration-300 hover:bg-emerald-600/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
				>
					<span className='text-lg'>🔍</span>
					<span>{isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
				</button>
			</div>

			<CategoryDropdown
				categories={categories}
				onSelectSubcategory={handleSubcategorySelect}
			/>

			<div className='flex flex-col lg:flex-row gap-6 lg:gap-8'>
				{/* Фильтры */}
				<div
					className={`${
						isFiltersOpen ? 'block' : 'hidden'
					} lg:block w-full lg:w-72 lg:sticky lg:top-28 lg:self-start p-4 sm:p-6 bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] space-y-4 sm:space-y-5 backdrop-blur-md`}
				>
					{/* Поле поиска */}
					<div className='space-y-2'>
						<label className='text-emerald-400 text-sm font-medium'>
							Поиск задач
						</label>
						<input
							type='text'
							placeholder='Введите запрос...'
							className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-500 hover:border-emerald-400 transition-all'
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
					</div>

					{/* Кастомный селект сортировки */}
					<div className='space-y-2 relative'>
						<label className='text-emerald-400 text-sm font-medium'>
							Сортировка
						</label>
						<button
							onClick={() => setIsSortOpen(!isSortOpen)}
							className='w-full flex justify-between items-center p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400 transition-all'
						>
							{sortOptions.find(opt => opt.value === sort)?.label}
							<span className='text-emerald-400'>▼</span>
						</button>

						{isSortOpen && (
							<div className='absolute z-20 mt-2 w-full bg-black/80 border border-emerald-500/30 rounded-lg shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-md overflow-hidden'>
								{sortOptions.map(opt => (
									<button
										key={opt.value}
										onClick={() => {
											setSort(opt.value)
											setIsSortOpen(false)
										}}
										className={`block w-full text-left px-4 py-2 text-sm ${
											sort === opt.value
												? 'bg-emerald-700/40 text-emerald-100'
												: 'text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-100'
										} transition-all`}
									>
										{opt.label}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Кнопки */}
					<div className='space-y-3'>
						<button
							onClick={() => {
								applyFilters()
								setIsFiltersOpen(false)
							}}
							className='w-full py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all font-semibold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
						>
							Применить
						</button>
						<button
							onClick={() => {
								resetFilters()
								setIsFiltersOpen(false)
							}}
							className='w-full py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-600/40 hover:text-white transition-all'
						>
							Сбросить
						</button>
					</div>
				</div>

				{/* Задачи */}
				<div className='flex-1 space-y-4 sm:space-y-6'>
					{loading || userLoading ? (
						renderSkeleton()
					) : error ? (
						<div className='text-red-400'>{error}</div>
					) : tasks.length === 0 ? (
						<div className='text-center py-12'>
							<div className='text-4xl mb-4'>📋</div>
							<div className='text-gray-400 text-lg'>Задач пока нет</div>
							<p className='text-gray-500 text-sm mt-2'>
								Попробуйте изменить фильтры
							</p>
						</div>
					) : (
						<>
							{tasks.map(task => (
								<div
									key={task.id}
									className='group relative p-5 sm:p-6 border border-emerald-500/30 rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1 space-y-4 overflow-hidden'
								>
									{/* Декоративный градиент при наведении */}
									<div className='absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10'></div>
									
									{/* Кнопка жалобы */}
									<button
										onClick={() => {
											setReportTaskId(task.id)
											setReportTaskTitle(task.title)
										}}
										className='absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all group-hover:scale-110'
										title='Пожаловаться на задачу'
									>
										<AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5' />
									</button>

									{/* Категория */}
									{task.subcategory && (
										<div className='flex flex-wrap items-center gap-2 pr-12'>
											<span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-emerald-600/10 border border-emerald-500/40 rounded-lg text-xs sm:text-sm font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] backdrop-blur-sm'>
												<span className='text-base'>🏷️</span>
												{task.subcategory.category.name}
											</span>
											<span className='text-emerald-500 text-sm'>→</span>
											<span className='inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-blue-600/10 border border-blue-500/40 rounded-lg text-xs font-medium text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]'>
												{task.subcategory.name}
											</span>
										</div>
									)}

									{/* Заголовок */}
									<Link href={`/tasks/${task.id}`}>
										<h2 className='text-lg sm:text-xl font-bold text-emerald-200 group-hover:text-emerald-100 cursor-pointer line-clamp-2 pr-10 transition-colors duration-200'>
											{task.title}
										</h2>
									</Link>

									{/* Описание */}
									<p className='text-sm sm:text-base text-gray-300 leading-relaxed line-clamp-3'>
										{task.description}
									</p>

									{/* Цена и информация */}
									<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gradient-to-r from-transparent via-emerald-500/30 to-transparent'>
										{task.price && (
											<p className='text-emerald-400 font-bold text-lg sm:text-xl flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-transparent px-4 py-2 rounded-lg border border-emerald-500/30'>
												<span className='text-xl'>💰</span>
												<span className='tracking-wide'>{task.price} ₽</span>
											</p>
										)}
										<p className='text-xs sm:text-sm text-gray-400 flex items-center gap-2'>
											<span className='text-gray-500'>👤</span>
											<span>{task.customer?.fullName || 'Без имени'}</span>
											<span className='text-gray-600'>•</span>
											<span className='text-gray-500'>📅</span>
											{new Date(task.createdAt).toLocaleDateString('ru-RU')}
										</p>
									</div>
								</div>
							))}

							{/* Пагинация */}
							<div className='flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8'>
								<button
									onClick={() => setPage(p => Math.max(p - 1, 1))}
									disabled={page === 1}
									className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold'
								>
									← Назад
								</button>
								<span className='text-gray-400 text-sm sm:text-base'>
									Страница {page} из {totalPages}
								</span>
								<button
									onClick={() => setPage(p => Math.min(p + 1, totalPages))}
									disabled={page === totalPages}
									className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold'
								>
									Далее →
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Модальное окно жалобы */}
			{reportTaskId && (
				<ReportTaskModal
					taskId={reportTaskId}
					taskTitle={reportTaskTitle}
					onClose={() => {
						setReportTaskId(null)
						setReportTaskTitle('')
					}}
				/>
			)}
		</div>
	)
}
