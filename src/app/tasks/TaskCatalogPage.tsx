'use client'

import CategoryDropdown from '@/components/CategoryDropdown'
import DateFilter from '@/components/DateFilter'
import EmptyState from '@/components/EmptyState'
import ErrorDisplay from '@/components/ErrorDisplay'
import FavoriteTaskButton from '@/components/FavoriteTaskButton'
import ReportTaskModal from '@/components/ReportTaskModal'
import TaskSkeleton from '@/components/TaskSkeleton'
import { useUser } from '@/context/UserContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { fetchWithRetry, getErrorMessage, logError } from '@/utils/errorHandler'
import {
	AlertTriangle,
	ChevronDown,
	ClipboardList,
	Clock,
	Link as LinkIcon,
	X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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

type RecommendationTag =
	| 'skill_match'
	| 'subcategory_match'
	| 'fresh'
	| 'low_responses'
	| 'favorite_match'

type RecommendedTask = {
	task: Task & {
		price?: number | null
		status?: string
		responseCount?: number
		favoritesCount?: number
	}
	score: number
	reasons: string[]
	tags: RecommendationTag[]
	meta: {
		isFavorite: boolean
		lowResponses: boolean
	}
}

type Category = {
	id: string
	name: string
	subcategories: { id: string; name: string }[]
}

export default function TaskCatalogPage() {
	const { user, token, loading: userLoading } = useUser()
	const isExecutor = user?.role === 'executor'
	const [tasks, setTasks] = useState<Task[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [retryCount, setRetryCount] = useState(0)
	const [isFiltersOpen, setIsFiltersOpen] = useState(false)
	const [reportTaskId, setReportTaskId] = useState<string | null>(null)
	const [reportTaskTitle, setReportTaskTitle] = useState<string>('')
	const [recommendedTasks, setRecommendedTasks] = useState<RecommendedTask[]>(
		[]
	)
	const [recommendedLoading, setRecommendedLoading] = useState(true)
	const [recommendedError, setRecommendedError] = useState<string | null>(null)
	const [activeReasonId, setActiveReasonId] = useState<string | null>(null)
	const recommendationContainerRef = useRef<HTMLDivElement>(null)

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
	const [dateFilter, setDateFilter] = useState('')
	const [minRating, setMinRating] = useState('')
	const [hasFiles, setHasFiles] = useState('')
	const [minResponses, setMinResponses] = useState('')
	const [showSearchHistory, setShowSearchHistory] = useState(false)
	const searchInputRef = useRef<HTMLInputElement>(null)
	const searchHistoryContainerRef = useRef<HTMLDivElement>(null)
	const { history, addToHistory, removeFromHistory, clearHistory } =
		useSearchHistory()
	const hasFilesDropdownRef = useRef<HTMLDivElement>(null)

	const hasFilesOptions = [
		{ value: '', label: 'Не важно' },
		{ value: 'true', label: 'С файлами' },
		{ value: 'false', label: 'Без файлов' },
	]
	const [isHasFilesOpen, setIsHasFilesOpen] = useState(false)

	// Debounce для поиска
	const debouncedSearch = useDebounce(search, 500)

	// Добавляем в историю при успешном поиске
	useEffect(() => {
		if (debouncedSearch && debouncedSearch.trim()) {
			addToHistory(debouncedSearch)
		}
	}, [debouncedSearch, addToHistory])

	useEffect(() => {
		if (!isFiltersOpen) {
			setIsHasFilesOpen(false)
			setIsSortOpen(false)
		}
	}, [isFiltersOpen])

	useEffect(() => {
		if (!isHasFilesOpen) return
		const handleClick = (event: MouseEvent) => {
			if (!hasFilesDropdownRef.current) return
			if (!hasFilesDropdownRef.current.contains(event.target as Node)) {
				setIsHasFilesOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => {
			document.removeEventListener('mousedown', handleClick)
		}
	}, [isHasFilesOpen])

	// Горячие клавиши для поиска
	useKeyboardShortcuts([
		{
			key: 'k',
			ctrlKey: true,
			callback: () => {
				searchInputRef.current?.focus()
			},
		},
		{
			key: '/',
			callback: () => {
				searchInputRef.current?.focus()
			},
		},
	])

	const sortOptions = [
		{ value: 'new', label: 'Сначала новые' },
		{ value: 'old', label: 'Сначала старые' },
	]

	const fetchTasks = useCallback(
		async ({ silent = false }: { silent?: boolean } = {}) => {
			if (!silent) {
				setLoading(true)
			}
			setError(null)
			try {
				const query = new URLSearchParams()
				if (debouncedSearch) query.set('search', debouncedSearch)
				if (sort) query.set('sort', sort)
				if (subcategory) query.set('subcategory', subcategory)
				if (dateFilter) query.set('dateFilter', dateFilter)
				if (minRating) query.set('minRating', minRating)
				if (hasFiles) query.set('hasFiles', hasFiles)
				if (minResponses) query.set('minResponses', minResponses)
				query.set('page', page.toString())
				query.set('limit', '20')

				const res = await fetchWithRetry(
					`/api/tasks?${query.toString()}`,
					{
						headers: {
							'Content-Type': 'application/json',
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
					},
					{
						maxRetries: 3,
						retryDelay: 1000,
					}
				)

				const data = await res.json()
				if (!res.ok) {
					throw { message: data.error || 'Ошибка загрузки', status: res.status }
				}

				const visibleTasks = (data.tasks || []).filter(
					(task: Task) => task.status === 'open' || !task.status
				)

				setTasks(visibleTasks)
				setTotalPages(data.pagination?.totalPages || 1)
				setRetryCount(0) // Сбрасываем счетчик при успехе
			} catch (err: unknown) {
				const errorMessage = getErrorMessage(err)
				logError(err, 'fetchTasks')
				setError(errorMessage)
				setRetryCount(prev => prev + 1)
			} finally {
				if (!silent) {
					setLoading(false)
				}
			}
		},
		[
		debouncedSearch,
		sort,
		subcategory,
		dateFilter,
		minRating,
		hasFiles,
		minResponses,
		token,
		page,
		]
	)

	const fetchRecommendations = useCallback(async () => {
		if (!token || !isExecutor) {
			setRecommendedTasks([])
			setRecommendedLoading(false)
			return
		}
		setRecommendedLoading(true)
		setRecommendedError(null)
		try {
			const res = await fetchWithRetry(
				'/api/tasks/recommendations?limit=6',
				{
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				{
					maxRetries: 2,
					retryDelay: 800,
				}
			)

			const data = await res.json()
			if (!res.ok) {
				throw {
					message: data.error || 'Ошибка рекомендаций',
					status: res.status,
				}
			}
			setRecommendedTasks(data.recommendations || [])
		} catch (err: unknown) {
			const errorMessage = getErrorMessage(err)
			setRecommendedError(errorMessage)
			setRecommendedTasks([])
		} finally {
			setRecommendedLoading(false)
		}
	}, [token, isExecutor])

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
		if (!userLoading) {
			fetchCategories()
		}
	}, [userLoading, fetchCategories])

	// Загрузка задач при изменении параметров
	useEffect(() => {
		if (!userLoading) {
			fetchTasks()
		}
	}, [userLoading, fetchTasks])

	useEffect(() => {
		const interval = setInterval(() => {
			fetchTasks({ silent: true })
		}, 5000)

		return () => clearInterval(interval)
	}, [fetchTasks])

	useEffect(() => {
		if (typeof window === 'undefined') return

		let channel: BroadcastChannel | null = null

		const handleTaskCreated = () => {
			fetchTasks({ silent: true })
		}

		window.addEventListener('nesi-task-created', handleTaskCreated as EventListener)

		if ('BroadcastChannel' in window) {
			channel = new BroadcastChannel('nesi-tasks')
			channel.addEventListener('message', event => {
				if (event.data?.type === 'task_created') {
					handleTaskCreated()
				}
			})
		}

		const handleVisibilityChange = () => {
			if (!document.hidden) {
				handleTaskCreated()
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.removeEventListener(
				'nesi-task-created',
				handleTaskCreated as EventListener
			)
			channel?.close()
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [fetchTasks])

	useEffect(() => {
		if (!userLoading && user && token && isExecutor) {
			fetchRecommendations()
		} else if (!isExecutor) {
			setRecommendedTasks([])
			setRecommendedLoading(false)
		}
	}, [userLoading, user, token, isExecutor, fetchRecommendations])

	const applyFilters = useCallback(() => {
		const query = new URLSearchParams()
		if (debouncedSearch) query.set('search', debouncedSearch)
		if (sort) query.set('sort', sort)
		if (subcategory) query.set('subcategory', subcategory)
		router.push(`/tasks?${query.toString()}`)
		setPage(1)
	}, [debouncedSearch, sort, subcategory, router])

	const recommendationTagLabels: Record<
		RecommendationTag,
		{ label: string; emoji: string }
	> = {
		skill_match: { label: 'Навык', emoji: '🎯' },
		subcategory_match: { label: 'Ваш опыт', emoji: '🧩' },
		fresh: { label: 'Новинка', emoji: '✨' },
		low_responses: { label: 'Мало откликов', emoji: '🚀' },
		favorite_match: { label: 'Похоже на избранное', emoji: '⭐' },
	}

	const resetFilters = useCallback(() => {
		setSearch('')
		setSort('new')
		setSubcategory('')
		setDateFilter('')
		setMinRating('')
		setHasFiles('')
		setMinResponses('')
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

	return (
		<div className='max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 space-y-4 sm:space-y-6 md:space-y-8 overflow-x-hidden w-full pt-2 md:pt-0'>
			{/* Заголовок */}
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
				<h1 className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]'>
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

			<div className='flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-7 xl:gap-8'>
				{/* Фильтры */}
				<div
					className={`${
						isFiltersOpen ? 'block' : 'hidden'
					} lg:block w-full lg:w-64 xl:w-72 lg:sticky lg:top-24 xl:top-28 lg:self-start p-4 sm:p-5 bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] space-y-4 sm:space-y-5 backdrop-blur-md`}
				>
					{/* Поле поиска с историей */}
					<div className='space-y-2 relative'>
						<label className='text-emerald-400 text-sm font-medium'>
							Поиск задач
						</label>
						<div className='relative'>
							<input
								ref={searchInputRef}
								type='text'
								placeholder='Введите запрос... (Ctrl+K или / для фокуса)'
								className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-500 hover:border-emerald-400 transition-all pr-10'
								value={search}
								onChange={e => {
									setSearch(e.target.value)
									setShowSearchHistory(true)
								}}
								onFocus={() => {
									if (history.length > 0) {
										setShowSearchHistory(true)
									}
								}}
								onBlur={e => {
									// Закрываем историю только если клик был вне компонента
									if (
										!searchHistoryContainerRef.current?.contains(
											e.relatedTarget as Node
										)
									) {
										setShowSearchHistory(false)
									}
								}}
								onKeyDown={e => {
									if (e.key === 'Enter' && search.trim()) {
										setShowSearchHistory(false)
										addToHistory(search.trim())
									}
								}}
							/>
							{/* Кнопка очистки истории (показывается при фокусе и наличии истории) */}
							{showSearchHistory && history.length > 0 && (
								<button
									onClick={e => {
										e.stopPropagation()
										clearHistory()
										setShowSearchHistory(false)
									}}
									className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-400 transition-colors'
									title='Очистить историю'
								>
									<X className='w-4 h-4' />
								</button>
							)}
							{/* Выпадающий список истории поиска */}
							{showSearchHistory && history.length > 0 && (
								<div
									ref={searchHistoryContainerRef}
									className='absolute z-50 w-full mt-1 bg-gray-900/95 backdrop-blur-sm border border-emerald-500/30 rounded-lg shadow-2xl max-h-60 overflow-y-auto custom-scrollbar'
									onMouseDown={e => e.preventDefault()} // Предотвращаем blur при клике
								>
									<div className='p-2'>
										<div className='flex items-center justify-between px-2 py-1 mb-1'>
											<span className='text-xs text-gray-400 font-medium'>
												История поиска
											</span>
											<button
												onClick={() => clearHistory()}
												className='text-xs text-gray-500 hover:text-red-400 transition-colors'
											>
												Очистить
											</button>
										</div>
										{history.map((item, index) => (
											<button
												key={index}
												onClick={() => {
													setSearch(item)
													setShowSearchHistory(false)
													searchInputRef.current?.focus()
												}}
												className='w-full text-left px-3 py-2 hover:bg-emerald-500/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors flex items-center justify-between group'
											>
												<span className='flex items-center gap-2'>
													<Clock className='w-4 h-4 text-gray-500' />
													{item}
												</span>
												<button
													onClick={e => {
														e.stopPropagation()
														removeFromHistory(item)
													}}
													className='opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all'
												>
													<X className='w-3 h-3 text-red-400' />
												</button>
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Фильтр по дате */}
					<DateFilter value={dateFilter} onChange={setDateFilter} />

					{/* Расширенные фильтры */}
					<div className='space-y-4 pt-2 border-t border-emerald-500/20'>
						<p className='text-emerald-400 text-sm font-medium'>
							Расширенные фильтры
						</p>

						{/* Фильтр по рейтингу заказчика */}
						<div className='space-y-2'>
							<label className='text-gray-400 text-xs font-medium'>
								Минимальный рейтинг заказчика
							</label>
							<input
								type='number'
								min='0'
								max='5'
								step='0.1'
								placeholder='0.0'
								value={minRating}
								onChange={e => setMinRating(e.target.value)}
								className='w-full p-2 bg-black/60 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-500 hover:border-emerald-400 transition-all'
							/>
						</div>

						{/* Фильтр по наличию файлов */}
						<div className='space-y-2'>
							<label className='text-gray-400 text-xs font-medium'>
								Наличие файлов
							</label>
							<div className='relative' ref={hasFilesDropdownRef}>
								<button
									type='button'
									onClick={() => setIsHasFilesOpen(open => !open)}
									className='w-full flex justify-between items-center p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white text-sm hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all'
								>
									<span>
										{hasFilesOptions.find(opt => opt.value === hasFiles)
											?.label ?? 'Не важно'}
									</span>
									<ChevronDown
										className={`w-4 h-4 transition-transform ${
											isHasFilesOpen
												? 'rotate-180 text-emerald-200'
												: 'text-emerald-300/80'
										}`}
									/>
								</button>
								{isHasFilesOpen && (
									<div className='absolute z-30 mt-2 w-full bg-black/85 border border-emerald-500/30 rounded-lg shadow-[0_0_20px_rgба(16,185,129,0.4)] backdrop-blur-md overflow-hidden'>
										{hasFilesOptions.map(option => (
											<button
												key={option.value}
												onClick={() => {
													setHasFiles(option.value)
													setIsHasFilesOpen(false)
												}}
												className={`w-full text-left px-4 py-2 text-sm transition-colors ${
													hasFiles === option.value
														? 'bg-emerald-700/40 text-emerald-100'
														: 'text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100'
												}`}
											>
												{option.label}
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Фильтр по количеству откликов */}
						<div className='space-y-2'>
							<label className='text-gray-400 text-xs font-medium'>
								Минимум откликов
							</label>
							<input
								type='number'
								min='0'
								placeholder='0'
								value={minResponses}
								onChange={e => setMinResponses(e.target.value)}
								className='w-full p-2 bg-black/60 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-500 hover:border-emerald-400 transition-all'
							/>
						</div>
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
				<div className='flex-1 min-w-0 space-y-4 sm:space-y-6'>
					{loading || userLoading ? (
						<div className='space-y-4'>
							{[...Array(6)].map((_, i) => (
								<TaskSkeleton key={i} />
							))}
						</div>
					) : error ? (
						<ErrorDisplay
							error={error}
							onRetry={() => {
								setRetryCount(0)
								fetchTasks()
							}}
							retryCount={retryCount}
							maxRetries={3}
							variant={
								error.includes('сеть') || error.includes('подключение')
									? 'network'
									: error.includes('сервер')
									? 'server'
									: error.includes('время')
									? 'timeout'
									: 'generic'
							}
						/>
					) : tasks.length === 0 ? (
						<EmptyState
							icon={ClipboardList}
							title='Задач пока нет'
							description='Попробуйте изменить фильтры или создать новую задачу'
							actionLabel={
								user?.role === 'customer' ? 'Создать задачу' : undefined
							}
							actionHref={user?.role === 'customer' ? '/tasks/new' : undefined}
						/>
					) : (
						<>
							{isExecutor &&
								(recommendedLoading ? (
									<div className='p-5 sm:p-6 bg-slate-900/60 border border-emerald-500/30 rounded-2xl text-slate-300 text-sm'>
										Загружаем персональные рекомендации…
									</div>
								) : recommendedError ? (
									<div className='p-5 sm:p-6 bg-red-900/40 border border-red-500/40 rounded-2xl text-red-200 text-sm'>
										<span className='font-semibold'>
											Не удалось получить рекомендации.
										</span>{' '}
										{recommendedError}
									</div>
								) : recommendedTasks.length > 0 ? (
									<section className='p-3 sm:p-4 md:p-5 lg:p-6 bg-gradient-to-br from-emerald-900/20 via-slate-900/40 to-black/40 border border-emerald-500/30 rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.18)] space-y-3 sm:space-y-4 overflow-visible pl-8 sm:pl-12 md:pl-14 pr-8 sm:pr-12 md:pr-14'>
										<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3'>
											<div>
												<h2 className='text-base sm:text-lg md:text-xl font-semibold text-emerald-300'>
													Рекомендуем для вас
												</h2>
												<p className='text-xs sm:text-sm text-slate-300/80'>
													Подбор на основе ваших навыков, избранного и истории
													откликов
												</p>
											</div>
											<button
												onClick={() => fetchRecommendations()}
												className='self-start sm:self-auto inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors text-xs'
											>
												<span className="hidden sm:inline">Обновить рекомендации</span>
												<span className="sm:hidden">Обновить</span>
											</button>
										</div>

										{/* Слайдер рекомендаций */}
										<div className='relative overflow-visible'>
											{/* Кнопки навигации */}
											{recommendedTasks.length > 1 && (
												<>
													<button
														onClick={() => {
															if (recommendationContainerRef.current) {
																const container = recommendationContainerRef.current
																// Прокручиваем на ширину одной карточки + gap
																const cardWidth = window.innerWidth >= 640 ? 320 : 260 // sm:w-[320px]
																const gap = window.innerWidth >= 640 ? 16 : 12 // gap-3 или gap-4
																const scrollAmount = cardWidth + gap
																container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
															}
														}}
														className='absolute -left-6 sm:-left-8 md:-left-10 top-1/2 -translate-y-1/2 z-30 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-full p-1.5 sm:p-2 text-emerald-300 hover:text-emerald-200 transition-all shadow-lg backdrop-blur-sm'
														aria-label='Предыдущие рекомендации'
													>
														<ChevronDown className='w-3 h-3 sm:w-4 sm:h-4 rotate-90' />
													</button>
													<button
														onClick={() => {
															if (recommendationContainerRef.current) {
																const container = recommendationContainerRef.current
																// Прокручиваем на ширину одной карточки + gap
																const cardWidth = window.innerWidth >= 640 ? 320 : 260 // sm:w-[320px]
																const gap = window.innerWidth >= 640 ? 16 : 12 // gap-3 или gap-4
																const scrollAmount = cardWidth + gap
																container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
															}
														}}
														className='absolute -right-6 sm:-right-8 md:-right-10 top-1/2 -translate-y-1/2 z-30 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-full p-1.5 sm:p-2 text-emerald-300 hover:text-emerald-200 transition-all shadow-lg backdrop-blur-sm'
														aria-label='Следующие рекомендации'
													>
														<ChevronDown className='w-3 h-3 sm:w-4 sm:h-4 -rotate-90' />
													</button>
												</>
											)}
											
											{/* Контейнер слайдера - ограничен по ширине для показа 3 карточек */}
											<div
												ref={recommendationContainerRef}
												className='flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pt-2 pb-2 snap-x snap-mandatory scroll-smooth'
												style={{
													scrollbarWidth: 'none',
													msOverflowStyle: 'none',
													// Ограничиваем видимую область: 3 карточки по 320px + 2 gap по 16px = 992px
													// На мобильных: 3 карточки по 260px + 2 gap по 8px = 796px
												}}
											>
												{recommendedTasks.map(recommendation => {
												const task = recommendation.task
												const reasonsKey = `recommended-${task.id}`
												const showReasons = activeReasonId === reasonsKey

												const rawScore =
													typeof recommendation.score === 'number' &&
													isFinite(recommendation.score)
														? recommendation.score
														: 0
												const normalizedScore = Math.max(
													0,
													Math.min(100, rawScore)
												)
												const clampedDisplay = Math.max(
													0,
													Math.min(100, Math.round(rawScore))
												)
												const displayScore = clampedDisplay.toString()
												const scoreTitle =
													rawScore > 100 || rawScore < 0
														? `Фактическое значение: ${rawScore.toFixed(1)}`
														: undefined
												const scoreClass =
													'text-xl font-semibold text-emerald-100 leading-none'

												return (
													<Link
														key={task.id}
														href={`/tasks/${task.id}`}
														className='group relative block p-3 sm:p-4 border border-emerald-500/30 rounded-xl sm:rounded-2xl bg-slate-900/50 backdrop-blur-sm hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-[2px] space-y-2 sm:space-y-3 cursor-pointer overflow-visible flex-shrink-0 w-[260px] sm:w-[280px] md:w-[320px] snap-start'
													>
														<div className='space-y-2 sm:space-y-3'>
															<div className='flex-1 min-w-0'>
																<h3 className='text-sm sm:text-base font-semibold text-emerald-200 group-hover:text-emerald-100 transition-colors whitespace-normal break-normal line-clamp-2'>
																	{task.title}
																</h3>
																{task.createdAt && (
																<p className='text-[10px] sm:text-xs text-slate-400 mt-1'>
																	{new Date(task.createdAt).toLocaleDateString(
																		'ru-RU',
																		{
																			day: '2-digit',
																			month: 'long',
																		}
																	)}
																</p>
																)}
															</div>

															<div className='flex-1 min-w-0'>
																<div className='flex flex-col items-end text-right gap-0.5 sm:gap-1'>
																<span className='block text-[8px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.18em] text-emerald-300/60 whitespace-nowrap'>
																	Рейтинг релевантности
																</span>
																<div className='flex items-baseline gap-0.5 sm:gap-1 justify-end'>
																	<span
																		className='text-lg sm:text-xl font-semibold text-emerald-100 leading-none'
																		title={scoreTitle}
																	>
																		{displayScore}
																	</span>
																	<span className='text-[9px] sm:text-[10px] text-emerald-300/60'>
																		/ 100
																	</span>
																</div>
																<div className='relative w-full max-w-[60px] sm:max-w-[72px] self-end h-[2px] sm:h-[3px] rounded-full bg-emerald-500/15 border border-emerald-500/30 overflow-hidden shadow-[0_0_5px_rgba(16,185,129,0.25)]'>
																	<div
																		className='absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500'
																		style={{
																			width: `${normalizedScore}%`,
																		}}
																	/>
																	</div>
																</div>
																</div>
															{recommendation.reasons?.length ? (
																<div className='w-full'>
																	<button
																		type='button'
																		className='inline-block text-[10px] sm:text-[11px] font-medium text-emerald-200/80 underline decoration-dotted hover:text-emerald-100 transition focus:outline-none text-left'
																		onMouseEnter={() =>
																			setActiveReasonId(reasonsKey)
																		}
																		onMouseLeave={() =>
																			setActiveReasonId(null)
																		}
																		onFocus={() =>
																			setActiveReasonId(reasonsKey)
																		}
																		onBlur={() => {
																			setActiveReasonId(null)
																		}}
																		onTouchStart={() =>
																			setActiveReasonId(reasonsKey)
																		}
																	>
																		Почему подобрали
																	</button>
																	{showReasons && (
																		<div className='mt-1.5 sm:mt-2 w-full rounded-lg border border-emerald-500/30 bg-slate-950/98 backdrop-blur-md px-2.5 sm:px-3 py-2 sm:py-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.6)]'>
																			<div className='text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1.5 sm:mb-2 font-semibold'>
																				Почему подобрали
																			</div>
																			<div className='space-y-1 sm:space-y-1.5'>
																			{recommendation.reasons
																				.slice(0, 3)
																					.map((reason, idx) => (
																					<div
																							key={`${task.id}-popover-${idx}-${reason}`}
																							className='text-[10px] sm:text-[11px] text-emerald-100/95 leading-relaxed break-words'
																					>
																							{reason}
																					</div>
																				))}
																				{recommendation.reasons.length > 3 && (
																					<div className='text-[9px] sm:text-[10px] text-emerald-300/60 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-emerald-500/20'>
																						И ещё {recommendation.reasons.length - 3}{' '}
																						{recommendation.reasons.length - 3 === 1
																							? 'фактор'
																							: recommendation.reasons.length - 3 < 5
																							? 'фактора'
																							: 'факторов'}
																				</div>
																				)}
																		</div>
															</div>
																	)}
																</div>
															) : null}

														</div>

															{/* Описание намеренно скрываем, чтобы карточка не разъезжалась из-за длинного текста */}


														{task.price && (
															<p className='inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold'>
																<span>💰</span>
																<span>
																	{typeof task.price === 'number'
																		? task.price.toLocaleString('ru-RU', {
																				minimumFractionDigits: 0,
																				maximumFractionDigits: 0,
																		  })
																		: Number(task.price || 0).toLocaleString('ru-RU', {
																				minimumFractionDigits: 0,
																				maximumFractionDigits: 0,
																		  })}{' '}
																	₽
																</span>
															</p>
														)}

														<div className='flex flex-wrap gap-1.5 sm:gap-2'>
															{recommendation.tags.slice(0, 3).map(tag => (
																<span
																	key={`${task.id}-${tag}`}
																	className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/40 border border-emerald-500/30 text-[10px] sm:text-[11px] text-emerald-200'
																>
																	<span>
																		{recommendationTagLabels[tag].emoji}
																	</span>
																	{recommendationTagLabels[tag].label}
																</span>
															))}
														</div>

														<div
															className='flex items-center justify-between gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-slate-700/50'
															onClick={e => e.stopPropagation()}
														>
															<span className='inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm'>
																Подробнее
															</span>
															{isExecutor && (
																<FavoriteTaskButton
																	taskId={task.id}
																	size='sm'
																	className='p-1.5 sm:p-2 hover:bg-emerald-500/20 rounded-lg'
																/>
															)}
														</div>
													</Link>
												)
											})}
										</div>
									</div>
								</section>
							) : (
									<section className='p-4 sm:p-5 lg:p-6 bg-black/35 border border-emerald-500/20 rounded-2xl text-sm text-emerald-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
										<div>
											<h3 className='text-base font-semibold text-emerald-200'>
												Персональные рекомендации появятся позже
											</h3>
											<p className='mt-1 text-emerald-200/70'>
												Заполните навыки, откликайтесь на задачи или добавляйте
												избранное — и мы начнем подбирать подходящие
												предложения.
											</p>
										</div>
										<Link
											href='/profile'
											className='inline-flex items-center justify-center text-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/10 transition-colors text-xs font-semibold'
										>
											Настроить профиль
										</Link>
									</section>
								))}

							{tasks.map(task => (
								<div
									key={task.id}
									className='group relative p-4 sm:p-5 border border-emerald-500/30 rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm shadow-[0_4px_18px_rgba(16,185,129,0.14)] hover:shadow-[0_8px_32px_rgba(16,185,129,0.35)] hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-[3px] space-y-3 sm:space-y-4 overflow-hidden'
								>
									{/* Декоративный градиент при наведении */}
									<div className='absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10'></div>

									{/* Кнопки действий */}
									<div className='absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2'>
										{/* Кнопка закладки */}
										{isExecutor && (
											<FavoriteTaskButton
												taskId={task.id}
												size='sm'
												className='p-2 hover:bg-emerald-500/20 rounded-lg'
											/>
										)}
										{/* Кнопка копирования ссылки */}
										<button
											onClick={async e => {
												e.stopPropagation()
												const url = `${window.location.origin}/tasks/${task.id}`
												const { copyToClipboard } = await import(
													'@/lib/copyToClipboard'
												)
												const success = await copyToClipboard(url)
												if (success) {
													toast.success('Ссылка скопирована')
												} else {
													toast.error('Не удалось скопировать ссылку')
												}
											}}
											className='p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all group-hover:scale-110'
											title='Копировать ссылку на задачу'
											aria-label='Копировать ссылку'
										>
											<LinkIcon className='w-4 h-4 sm:w-5 sm:h-5' />
										</button>
										{/* Кнопка жалобы */}
										<button
											onClick={() => {
												setReportTaskId(task.id)
												setReportTaskTitle(task.title)
											}}
											className='p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all group-hover:scale-110'
											title='Пожаловаться на задачу'
										>
											<AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5' />
										</button>
									</div>

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
										<h2 className='text-lg sm:text-xl font-bold text-emerald-200 group-hover:text-emerald-100 cursor-pointer line-clamp-2 pr-10 transition-colors duration-200 flex items-center gap-2 flex-wrap'>
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
											{task.createdAt
												? new Date(task.createdAt).toLocaleDateString('ru-RU')
												: '—'}
										</p>
									</div>
								</div>
							))}

							{/* Пагинация */}
							<div className='flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8'>
								<nav aria-label='Пагинация задач'>
									<button
										onClick={() => setPage(p => Math.max(p - 1, 1))}
										disabled={page === 1}
										className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold'
										aria-label='Предыдущая страница'
									>
										← Назад
									</button>
									<span
										className='text-gray-400 text-sm sm:text-base'
										aria-label={`Страница ${page} из ${totalPages}`}
									>
										Страница {page} из {totalPages}
									</span>
									<button
										onClick={() => setPage(p => Math.min(p + 1, totalPages))}
										disabled={page === totalPages}
										className='w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold'
										aria-label='Следующая страница'
									>
										Далее →
									</button>
								</nav>
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
