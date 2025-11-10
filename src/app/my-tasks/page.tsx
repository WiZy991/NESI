'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
	AlertCircle,
	Check,
	ChevronDown,
	ClipboardList,
	Filter,
	Hourglass,
	Loader2,
	Plus,
	Users,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale'

import { useUser } from '@/context/UserContext'

type KanbanColumnType = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

type RawTask = {
	id: string
	title: string
	description?: string | null
	status: string
	price?: string | number | null
	deadline?: string | null
	kanbanColumn?: string | null
	kanbanOrder?: number | null
	createdAt: string
	executor?: {
		id: string
		fullName: string | null
		email: string | null
	} | null
}

interface Task {
	id: string
	title: string
	description: string | null
	status: string
	price: number | null
	escrowAmount: number | null
	deadline: string | null
	kanbanColumn: KanbanColumnType
	kanbanOrder: number
	createdAt: string
	executor: {
		id: string
		fullName: string | null
		email: string | null
	} | null
}

interface FiltersState {
	executor: string
	minBudget: string
	maxBudget: string
}

const COLUMN_ORDER: KanbanColumnType[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']

const COLUMN_META: Record<
	KanbanColumnType,
	{ title: string; subtitle: string; accent: string; border: string; empty: string }
> = {
	TODO: {
		title: 'Новые',
		subtitle: 'Задачи только созданы — можно запускать работу',
		accent: 'bg-yellow-500/10',
		border: 'border-yellow-500/40',
		empty: 'Новых задач пока нет',
	},
	IN_PROGRESS: {
		title: 'В работе',
		subtitle: 'Исполнитель сейчас работает',
		accent: 'bg-blue-500/10',
		border: 'border-blue-500/40',
		empty: 'Активных задач сейчас нет',
	},
	DONE: {
		title: 'Завершено',
		subtitle: 'Выполненные задачи',
		accent: 'bg-emerald-500/10',
		border: 'border-emerald-500/40',
		empty: 'История задач пока пустая',
	},
	CANCELLED: {
		title: 'Отменены',
		subtitle: 'Заказчик отменил выполнение',
		accent: 'bg-red-500/10',
		border: 'border-red-500/40',
		empty: 'Отменённых задач пока нет',
	},
}

const STATUS_LABELS: Record<string, string> = {
	open: 'Открыта',
	in_progress: 'В работе',
	completed: 'Выполнена',
	cancelled: 'Отменена',
}

function normalizeTask(task: RawTask): Task {
	const rawColumn = typeof task.kanbanColumn === 'string' ? task.kanbanColumn : 'TODO'
	const normalizedColumn = rawColumn.toUpperCase()
	let column: KanbanColumnType =
		normalizedColumn === 'REVIEW'
			? 'IN_PROGRESS'
			: COLUMN_ORDER.includes(normalizedColumn as KanbanColumnType)
				? (normalizedColumn as KanbanColumnType)
				: 'TODO'

	const parseMoney = (value: unknown): number | null => {
		if (value === null || value === undefined) return null
		if (typeof value === 'number') return Number.isFinite(value) ? value : null
		if (typeof value === 'string') {
			const numeric = Number.parseFloat(value.replace(/\s/g, ''))
			return Number.isFinite(numeric) ? numeric : null
		}
		return null
	}

	const escrowAmount = parseMoney((task as unknown as { escrowAmount?: number | string | null }).escrowAmount)
	const price = escrowAmount ?? parseMoney(task.price)

	switch (task.status) {
		case 'in_progress':
			column = 'IN_PROGRESS'
			break
		case 'completed':
			column = 'DONE'
			break
		case 'cancelled':
			column = 'CANCELLED'
			break
		default:
			break
	}

	return {
		id: task.id,
		title: task.title,
		description: task.description ?? null,
		status: task.status,
		price,
		escrowAmount,
		deadline: task.deadline ?? null,
		kanbanColumn: COLUMN_ORDER.includes(column) ? column : 'TODO',
		kanbanOrder: typeof task.kanbanOrder === 'number' ? task.kanbanOrder : 0,
		createdAt: task.createdAt,
		executor: task.executor
			? {
					id: task.executor.id,
					fullName: task.executor.fullName,
					email: task.executor.email,
			  }
			: null,
	}
}

function formatPrice(value: number | null) {
	if (value === null || Number.isNaN(value)) return '—'
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}

function formatDate(value: string | null) {
	if (!value) return '—'
	try {
		return format(new Date(value), 'd MMM yyyy', { locale: ruLocale })
	} catch {
		return value
	}
}

function extractErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) {
		return error.message
	}
	if (typeof error === 'string' && error.length > 0) {
		return error
	}
	return fallback
}

type StatsSnapshot = {
	total: number
	waiting: number
	inProgress: number
	done: number
	cancelled: number
}

function StatsSummary({ stats }: { stats: StatsSnapshot }) {
	return (
		<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'>
			<StatCard label='Всего задач' value={stats.total} tone='neutral' />
			<StatCard label='Новые' value={stats.waiting} tone='warning' />
			<StatCard label='В работе' value={stats.inProgress} tone='info' />
			<StatCard label='Завершено' value={stats.done} tone='positive' subtle />
			<StatCard label='Отменены' value={stats.cancelled} tone='danger' subtle />
		</div>
	)
}

function StatCard({
	label,
	value,
	tone,
	subtle,
}: {
	label: string
	value: number | string
	tone: 'positive' | 'neutral' | 'warning' | 'danger' | 'info'
	subtle?: boolean
}) {
	const toneClass =
		tone === 'positive'
			? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
			: tone === 'warning'
				? 'border-amber-400/40 bg-amber-400/10 text-amber-100'
				: tone === 'danger'
					? 'border-red-500/40 bg-red-500/10 text-red-100'
					: tone === 'info'
						? 'border-blue-400/40 bg-blue-400/10 text-blue-100'
						: 'border-white/10 bg-white/5 text-gray-200'

	return (
		<div
			className={clsx(
				'rounded-xl border px-4 py-5 transition',
				toneClass,
				!subtle && 'hover:border-emerald-400/50 hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)]'
			)}
		>
			<p className='text-xs uppercase tracking-[0.2em]'>{label}</p>
			<p className='mt-3 text-2xl font-semibold'>{value}</p>
		</div>
	)
}

function Section({
	column,
	tasks,
}: {
	column: KanbanColumnType
	tasks: Task[]
}) {
	const meta = COLUMN_META[column]
	return (
		<div className={clsx('rounded-3xl border p-5', meta.border, meta.accent)}>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
				<div>
					<h2 className='text-xl font-semibold text-white'>{meta.title}</h2>
					<p className='text-sm text-gray-300'>{meta.subtitle}</p>
				</div>
				<span className='rounded-full bg-white/10 px-3 py-1 text-sm text-white/80'>
					{tasks.length}
				</span>
			</div>
			{tasks.length === 0 ? (
				<div className='mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-sm text-gray-300'>
					<Hourglass className='h-5 w-5 text-gray-500' />
					{meta.empty}
				</div>
			) : (
				<div className='mt-6 space-y-4'>
					{tasks.map(task => (
						<TaskCard key={task.id} task={task} />
					))}
				</div>
			)}
		</div>
	)
}

function TaskCard({ task }: { task: Task }) {
	const statusLabel = STATUS_LABELS[task.status] ?? task.status
	const customerName =
		task.executor?.fullName ?? task.executor?.email ?? (task.executor?.id ? `ID ${task.executor.id.slice(0, 6)}` : 'Не назначен')

	return (
		<div className='rounded-2xl border border-white/10 bg-slate-950/85 p-5 transition hover:border-emerald-400/40 hover:shadow-[0_10px_25px_rgba(16,185,129,0.15)]'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
				<div>
					<Link
						href={`/tasks/${task.id}`}
						className='text-lg font-semibold text-emerald-300 transition hover:text-emerald-200'
					>
						{task.title}
					</Link>
					{task.description && (
						<p className='mt-2 line-clamp-2 text-sm text-gray-300'>{task.description}</p>
					)}
					<p className='mt-3 text-xs text-gray-400'>
						Создана {formatDate(task.createdAt)}
						{task.deadline ? ` · Дедлайн ${formatDate(task.deadline)}` : ''}
					</p>
				</div>
				<span className='w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80'>
					{statusLabel}
				</span>
			</div>
			<div className='mt-4 grid gap-3 text-sm text-gray-200 sm:grid-cols-2'>
				<div className='flex flex-col gap-1'>
					<span className='text-[11px] uppercase tracking-[0.2em] text-gray-500'>Бюджет</span>
					<span className='text-white'>{formatPrice(task.price)}</span>
				</div>
				<div className='flex flex-col gap-1'>
					<span className='text-[11px] uppercase tracking-[0.2em] text-gray-500'>Исполнитель</span>
					{task.executor ? (
						<Link
							href={`/users/${task.executor.id}`}
							className='inline-flex items-center gap-1 text-sky-200 hover:text-sky-100'
						>
							<Users className='h-4 w-4' />
							{customerName}
						</Link>
					) : (
						<span className='text-gray-400'>Не назначен</span>
					)}
				</div>
			</div>
			<div className='mt-4 flex flex-wrap gap-2'>
				<Link
					href={`/tasks/${task.id}`}
					className='inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200 hover:text-emerald-50'
				>
					Перейти к задаче
				</Link>
			</div>
		</div>
	)
}

function FilterPanel({
	filters,
	onChange,
	executorOptions,
	onReset,
}: {
	filters: FiltersState
	onChange: (partial: Partial<FiltersState>) => void
	executorOptions: Array<{ id: string; label: string }>
	onReset: () => void
}) {
	const handleBudgetChange = (key: 'minBudget' | 'maxBudget') => (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value
		const sanitized = raw.replace(/[^\d]/g, '')
		onChange({ [key]: sanitized } as Partial<FiltersState>)
	}

	return (
		<div className='rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur'>
			<div className='mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300'>
				<Filter className='h-4 w-4' />
				Фильтры
			</div>
			<div className='flex flex-wrap items-end gap-4'>
				<ExecutorSelect
					value={filters.executor}
					onChange={value => onChange({ executor: value })}
					options={executorOptions}
				/>
				<div className='flex flex-col gap-2'>
					<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
						Минимальный бюджет
					</span>
					<input
						type='text'
						inputMode='numeric'
						pattern='[0-9]*'
						value={filters.minBudget}
						placeholder='0'
						onChange={handleBudgetChange('minBudget')}
						className='w-36 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400'
					/>
				</div>
				<div className='flex flex-col gap-2'>
					<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
						Максимальный бюджет
					</span>
					<input
						type='text'
						inputMode='numeric'
						pattern='[0-9]*'
						value={filters.maxBudget}
						placeholder='0'
						onChange={handleBudgetChange('maxBudget')}
						className='w-36 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400'
					/>
				</div>
				<button
					type='button'
					onClick={onReset}
					className='rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-emerald-400 hover:text-emerald-200'
				>
					Сбросить фильтры
				</button>
			</div>
		</div>
	)
}

function ExecutorSelect({
	value,
	onChange,
	options,
}: {
	value: string
	onChange: (value: string) => void
	options: Array<{ id: string; label: string }>
}) {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const currentLabel =
		value === 'all'
			? 'Все'
			: value === 'unassigned'
				? 'Без исполнителя'
				: options.find(option => option.id === value)?.label ?? 'Все'

	const allOptions: Array<{ id: string; label: string }> = [
		{ id: 'all', label: 'Все' },
		{ id: 'unassigned', label: 'Без исполнителя' },
		...options,
	]

	return (
		<div ref={containerRef} className='relative flex w-56 flex-col gap-2'>
			<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
				Исполнитель
			</span>
			<button
				type='button'
				onClick={() => setOpen(prev => !prev)}
				className={clsx(
					'flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium transition',
					'border-emerald-400/40 bg-black/40 text-white outline-none',
					open
						? 'border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
						: 'hover:border-emerald-300/70 hover:bg-black/60'
				)}
			>
				<span className='truncate'>{currentLabel}</span>
				<ChevronDown
					className={clsx(
						'h-4 w-4 text-emerald-200 transition-transform',
						open && 'rotate-180'
					)}
				/>
			</button>
			{open && (
				<div className='absolute top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-emerald-400/40 bg-slate-950 shadow-[0_12px_40px_rgba(16,185,129,0.2)]'>
					<ul className='max-h-60 overflow-y-auto py-1 text-sm text-gray-200'>
						{allOptions.map(option => {
							const selected = option.id === value
							return (
								<li key={option.id}>
									<button
										type='button'
										onClick={() => {
											onChange(option.id)
											setOpen(false)
										}}
										className={clsx(
											'flex w-full items-center justify-between px-4 py-2 text-left transition',
											selected
												? 'bg-emerald-500/20 text-emerald-100'
												: 'hover:bg-white/10 hover:text-white'
										)}
									>
										<span className='truncate'>{option.label}</span>
										{selected && <Check className='h-4 w-4' />}
									</button>
								</li>
							)
						})}
					</ul>
				</div>
			)}
		</div>
	)
}

export default function CustomerTasksPage() {
	const { token, user } = useUser()
	const router = useRouter()

	const [tasks, setTasks] = useState<Task[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [filters, setFilters] = useState<FiltersState>({
		executor: 'all',
		minBudget: '',
		maxBudget: '',
	})

	const loadTasks = useCallback(async () => {
		if (!token) return
		try {
			setLoading(true)
			setError(null)

			const response = await fetch('/api/tasks?mine=true', {
				headers: { Authorization: `Bearer ${token}` },
			})

			if (!response.ok) {
				if (response.status === 401) {
					router.push('/auth/login')
				}
				throw new Error('Не удалось загрузить задачи')
			}

			const data = await response.json()
			const rawTasks: RawTask[] = Array.isArray(data.tasks) ? data.tasks : []
			const normalized = rawTasks.map(normalizeTask)
			setTasks(
				normalized.sort((a, b) => a.kanbanOrder - b.kanbanOrder)
			)
		} catch (err: unknown) {
			const message = extractErrorMessage(err, 'Произошла ошибка при загрузке задач')
			console.error('Ошибка загрузки задач:', err)
			setError(message)
			toast.error(message)
		} finally {
			setLoading(false)
		}
	}, [router, token])

	useEffect(() => {
		if (user && user.role !== 'customer') {
			router.push('/tasks')
			return
		}
		if (token) {
			void loadTasks()
		}
	}, [loadTasks, router, token, user])

	const filteredTasks = useMemo(() => {
		const minBudget = filters.minBudget ? Number(filters.minBudget) : null
		const maxBudget = filters.maxBudget ? Number(filters.maxBudget) : null

		return tasks.filter(task => {
			if (filters.executor === 'unassigned' && task.executor) {
				return false
			}
			if (
				filters.executor !== 'all' &&
				filters.executor !== 'unassigned' &&
				task.executor?.id !== filters.executor
			) {
				return false
			}

			if (minBudget !== null && (task.price ?? 0) < minBudget) {
				return false
			}

			if (maxBudget !== null && (task.price ?? 0) > maxBudget) {
				return false
			}

			return true
		})
	}, [tasks, filters])

	const groupedTasks = useMemo(() => {
		const result: Record<KanbanColumnType, Task[]> = {
			TODO: [],
			IN_PROGRESS: [],
			DONE: [],
			CANCELLED: [],
		}
		for (const task of filteredTasks) {
			const column = COLUMN_ORDER.includes(task.kanbanColumn) ? task.kanbanColumn : 'TODO'
			result[column].push(task)
		}
		return result
	}, [filteredTasks])

	const stats = useMemo<StatsSnapshot>(() => {
		return {
			total: filteredTasks.length,
			waiting: groupedTasks.TODO.length,
			inProgress: groupedTasks.IN_PROGRESS.length,
			done: groupedTasks.DONE.filter(task => task.status === 'completed').length,
			cancelled: groupedTasks.CANCELLED.length,
		}
	}, [filteredTasks, groupedTasks])

	const executorOptions = useMemo(() => {
		const map = new Map<string, { id: string; label: string }>()
		for (const task of tasks) {
			if (task.executor) {
				map.set(task.executor.id, {
					id: task.executor.id,
					label: task.executor.fullName ?? task.executor.email ?? 'Без имени',
				})
			}
		}
		return Array.from(map.values())
	}, [tasks])

	const handleFilterChange = (partial: Partial<FiltersState>) => {
		setFilters(prev => ({ ...prev, ...partial }))
	}

	const clearFilters = () => {
		setFilters({
			executor: 'all',
			minBudget: '',
			maxBudget: '',
		})
	}

	if (!token) {
		return (
			<div className='mt-16 text-center text-gray-400'>
				<p>Авторизуйтесь, чтобы просматривать свои задачи.</p>
				<div className='mt-4'>
					<Link
						className='inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400'
						href='/auth/login'
					>
						Войти
					</Link>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center py-20 text-gray-400'>
				<Loader2 className='mr-3 h-5 w-5 animate-spin' />
				Загрузка задач…
			</div>
		)
	}

	if (error) {
		return (
			<div className='mx-auto max-w-xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-sm text-red-200'>
				{error}
			</div>
		)
	}

	return (
		<div className='mx-auto max-w-[1200px] px-4 pb-16 pt-12 text-white'>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
			>
				<div>
					<h1 className='flex items-center gap-2 text-3xl font-bold text-emerald-400'>
						<ClipboardList className='h-7 w-7 text-emerald-400' />
						Мои задачи
					</h1>
					<p className='mt-1 text-sm text-gray-300'>
						Следи за прогрессом задач, фильтруй по исполнителям и быстро переходи к деталям.
					</p>
				</div>
				<Link
					className='inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400'
					href='/tasks/new'
				>
					<Plus className='h-4 w-4' />
					Создать задачу
				</Link>
			</motion.div>

			<StatsSummary stats={stats} />

			<div className='mt-8'>
				<FilterPanel
					filters={filters}
					onChange={handleFilterChange}
					executorOptions={executorOptions}
					onReset={clearFilters}
				/>
			</div>

			<div className='mt-10 space-y-8'>
				<CriticalInfo groupedTasks={groupedTasks} />
				{COLUMN_ORDER.map(column => (
					<Section key={column} column={column} tasks={groupedTasks[column]} />
				))}
			</div>
		</div>
	)
}

function CriticalInfo({ groupedTasks }: { groupedTasks: Record<KanbanColumnType, Task[]> }) {
	const needsAttention = groupedTasks.TODO.length > 0
	if (!needsAttention) return null

	return (
		<div className='rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100'>
			<div className='flex items-start gap-3'>
				<AlertCircle className='h-5 w-5 flex-shrink-0 text-emerald-200' />
				<div className='space-y-2'>
					{groupedTasks.TODO.length > 0 && (
						<p>
							<strong className='text-white'>
								{groupedTasks.TODO.length}{' '}
								{groupedTasks.TODO.length === 1 ? 'задача' : 'задачи'} пока без движения.
							</strong>{' '}
							Проверь, всё ли готово к старту и есть ли назначенный исполнитель.
						</p>
					)}
				</div>
			</div>
		</div>
	)
}

