'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	type KeyboardEvent,
	useRef,
	useState,
	type CSSProperties,
} from 'react'
import Link from 'next/link'
import {
	DndContext,
	DragEndEvent,
	DragStartEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	closestCorners,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
	AlertCircle,
	CalendarDays,
	ClipboardList,
	Download,
	Filter,
	LayoutGrid,
	List,
	Loader2,
	NotebookPen,
	Save,
	Users,
	X,
	ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale'

import { useUser } from '@/context/UserContext'

type KanbanColumnType = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

interface ExecutorTask {
	id: string
	title: string
	description: string | null
	price: number
	rawPrice: string | number | null
	deadline: string | null
	status: string
	executorNote: string | null
	executorKanbanColumn: KanbanColumnType
	executorKanbanOrder: number
	createdAt: string
	updatedAt: string
	completedAt: string | null
	customer?: {
		id?: string
		fullName?: string | null
		email?: string | null
	} | null
}

type RawApiTask = {
	id: string
	title: string
	description?: string | null
	price?: string | number | null
	deadline?: string | null
	status?: string
	executorNote?: string | null
	executorKanbanColumn?: string | null
	executorKanbanOrder?: number | null
	createdAt: string
	updatedAt: string
	completedAt?: string | null
	customer?: {
		id?: string
		fullName?: string | null
		email?: string | null
	} | null
}

interface FilterState {
	search: string
	statuses: KanbanColumnType[]
	customerId: string
	minBudget: string
	maxBudget: string
	onlyWithNotes: boolean
}

interface FilterPreset {
	id: string
	name: string
	filters: FilterState
}

function normalizePresetFilters(input: Partial<FilterState> | undefined): FilterState {
	return {
		search: input?.search ?? '',
		statuses: Array.isArray(input?.statuses)
			? (input!.statuses as KanbanColumnType[])
			: [],
		customerId: input?.customerId ?? 'all',
		minBudget: input?.minBudget ?? '',
		maxBudget: input?.maxBudget ?? '',
		onlyWithNotes: Boolean(input?.onlyWithNotes),
	}
}

type SelectOption = {
	value: string
	label: string
}

type FilterToggleProps = {
	label: string
	checked: boolean
	onChange: (next: boolean) => void
}

function FilterToggle({ label, checked, onChange }: FilterToggleProps) {
	const toggle = () => onChange(!checked)

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			toggle()
		}
	}

	return (
		<button
			type='button'
			role='switch'
			aria-checked={checked}
			onClick={toggle}
			onKeyDown={handleKeyDown}
			className='group inline-flex items-center gap-2 text-xs text-gray-400 outline-none focus-visible:text-emerald-200'
		>
			<span
				className={clsx(
					'relative inline-flex h-4 w-7 items-center rounded-full border border-white/20 bg-white/5 transition-all duration-200',
					'group-hover:border-emerald-300/60 group-hover:bg-emerald-300/10',
					checked && 'border-emerald-400 bg-emerald-500/40'
				)}
			>
				<span
					className={clsx(
						'absolute left-[2px] h-3 w-3 rounded-full bg-white transition-transform duration-200',
						checked ? 'translate-x-[14px] bg-emerald-100' : 'translate-x-0'
					)}
				/>
			</span>
			<span
				className={clsx(
					'transition-colors duration-150',
					checked ? 'text-emerald-200' : 'group-hover:text-emerald-200'
				)}
			>
				{label}
			</span>
		</button>
	)
}

type SelectFieldProps = {
	label: string
	value: string
	options: SelectOption[]
	onChange: (value: string) => void
	placeholder?: string
}

function SelectField({ label, value, options, onChange, placeholder }: SelectFieldProps) {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		function handleOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleOutside)
		return () => document.removeEventListener('mousedown', handleOutside)
	}, [])

	const selected = options.find(option => option.value === value)

	return (
		<div ref={containerRef} className='relative flex flex-col gap-1'>
			<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
				{label}
			</span>
			<button
				type='button'
				onClick={() => setOpen(prev => !prev)}
				className={clsx(
					'flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium transition',
					'border-white/10 bg-black/40 text-white outline-none hover:border-emerald-300/60',
					open ? 'border-emerald-400/70 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : ''
				)}
			>
				<span className='truncate'>
					{selected ? selected.label : placeholder ?? 'Выберите'}
				</span>
				<ChevronDown
					className={clsx(
						'h-4 w-4 transform transition-transform',
						open ? 'rotate-180 text-emerald-200' : 'text-emerald-300/70'
					)}
				/>
			</button>
			{open && (
				<div className='absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-emerald-400/30 bg-slate-950/95 shadow-[0_20px_40px_rgba(16,185,129,0.2)] backdrop-blur'>
					<ul className='max-h-56 overflow-y-auto py-1 text-sm text-gray-200'>
						{options.map(option => {
							const active = option.value === value
							return (
								<li key={option.value}>
									<button
										type='button'
										onClick={() => {
											onChange(option.value)
											setOpen(false)
										}}
										className={clsx(
											'flex w-full items-center justify-between px-4 py-2 text-left transition',
											active
												? 'bg-emerald-500/20 text-emerald-200'
												: 'hover:bg-white/10 hover:text-white'
										)}
									>
										<span>{option.label}</span>
										{active && <span className='text-xs text-emerald-300'>✓</span>}
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

const COLUMN_ORDER: KanbanColumnType[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']

const COLUMN_META: Record<
	KanbanColumnType,
	{ title: string; subtitle: string; accent: string; border: string; hint: string }
> = {
	TODO: {
		title: 'К началу',
		subtitle: 'Назначенные, можно стартовать',
		accent: 'bg-amber-500/10',
		border: 'border-amber-500/40',
		hint: 'Перетащи сюда, если ещё не приступал к задаче',
	},
	IN_PROGRESS: {
		title: 'В работе',
		subtitle: 'Сейчас выполняется',
		accent: 'bg-blue-500/10',
		border: 'border-blue-500/35',
		hint: 'Основная работа по задаче',
	},
	REVIEW: {
		title: 'На проверке',
		subtitle: 'Ждёт реакции заказчика',
		accent: 'bg-purple-500/10',
		border: 'border-purple-500/35',
		hint: 'Отправлено заказчику на проверку или ожидание ответа',
	},
	DONE: {
		title: 'Готово',
		subtitle: 'Завершено с твоей стороны',
		accent: 'bg-emerald-500/10',
		border: 'border-emerald-500/35',
		hint: 'Можно закрывать — дождитесь подтверждения заказчика',
	},
}

const PRESET_STORAGE_KEY = 'executor-task-filter-presets'

function createEmptyColumns(): Record<KanbanColumnType, ExecutorTask[]> {
	return {
		TODO: [],
		IN_PROGRESS: [],
		REVIEW: [],
		DONE: [],
	}
}

function toNumber(value: string | number | null | undefined): number {
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const normalized = value.replace(',', '.')
		const parsed = Number(normalized)
		return Number.isFinite(parsed) ? parsed : 0
	}
	return 0
}

function normalizeTask(raw: RawApiTask): ExecutorTask {
	const column = typeof raw.executorKanbanColumn === 'string'
		? (raw.executorKanbanColumn.toUpperCase() as KanbanColumnType)
		: 'TODO'

	return {
		id: raw.id,
		title: raw.title,
		description: raw.description ?? null,
		price: toNumber(raw.price),
		rawPrice: raw.price ?? null,
		deadline: raw.deadline ?? null,
		status: raw.status ?? 'in_progress',
		executorNote: raw.executorNote ?? null,
		executorKanbanColumn: COLUMN_ORDER.includes(column) ? column : 'TODO',
		executorKanbanOrder:
			typeof raw.executorKanbanOrder === 'number' ? raw.executorKanbanOrder : 0,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
		completedAt: raw.completedAt ?? null,
		customer: raw.customer ?? null,
	}
}

function groupTasks(tasks: ExecutorTask[]): Record<KanbanColumnType, ExecutorTask[]> {
	const result = createEmptyColumns()
	for (const task of tasks) {
		const column = COLUMN_ORDER.includes(task.executorKanbanColumn)
			? task.executorKanbanColumn
			: 'TODO'
		result[column].push(task)
	}

	for (const column of COLUMN_ORDER) {
		result[column].sort((a, b) => {
			if (a.executorKanbanOrder !== b.executorKanbanOrder) {
				return a.executorKanbanOrder - b.executorKanbanOrder
			}
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		})
	}

	return result
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}

function formatDate(value: string | null): string {
	if (!value) return 'Без даты'
	try {
		return format(new Date(value), 'dd MMM yyyy', { locale: ruLocale })
	} catch {
		return value
	}
}

function matchesFilters(task: ExecutorTask, filters: FilterState): boolean {
	const haystack = `${task.title} ${task.description ?? ''} ${
		task.customer?.fullName ?? ''
	} ${task.customer?.email ?? ''}`.toLowerCase()

	if (filters.search.trim() && !haystack.includes(filters.search.trim().toLowerCase())) {
		return false
	}

	if (
		filters.statuses.length > 0 &&
		!filters.statuses.includes(task.executorKanbanColumn)
	) {
		return false
	}

	if (
		filters.customerId !== 'all' &&
		task.customer?.id &&
		task.customer.id !== filters.customerId
	) {
		return false
	}

	const price = task.price
	if (filters.minBudget && price < Number(filters.minBudget || 0)) {
		return false
	}
	if (filters.maxBudget && price > Number(filters.maxBudget || 0)) {
		return false
	}

	if (filters.onlyWithNotes && !task.executorNote) {
		return false
	}

	return true
}

function buildICS(tasks: ExecutorTask[]): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//NESI//ExecutorTasks//RU',
	]

	for (const task of tasks) {
		const start = task.deadline ?? task.createdAt
		const dt = format(new Date(start), "yyyyMMdd'T'HHmmss'Z'")
		lines.push('BEGIN:VEVENT')
		lines.push(`UID:${task.id}@nesi`)
		lines.push(`DTSTAMP:${dt}`)
		lines.push(`DTSTART:${dt}`)
		lines.push(`SUMMARY:${task.title.replace(/\r?\n/g, ' ')}`)
		lines.push(`DESCRIPTION:${(task.description ?? '').replace(/\r?\n/g, ' ')}`)
		lines.push('END:VEVENT')
	}

	lines.push('END:VCALENDAR')
	return lines.join('\r\n')
}

type KanbanColumnProps = {
	columnId: KanbanColumnType
	tasks: ExecutorTask[]
	isFiltered: boolean
	isSyncing: boolean
	totalCount: number
	isActiveColumn: boolean
	customerLookup: Map<string, { name: string }>
	onSaveNote: (taskId: string, note: string) => Promise<void>
	onQuickMove: (taskId: string, targetColumn: KanbanColumnType) => void
}

function KanbanColumn({
	columnId,
	tasks,
	isFiltered,
	isSyncing,
	totalCount,
	isActiveColumn,
	customerLookup,
	onSaveNote,
	onQuickMove,
}: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: columnId })
	const meta = COLUMN_META[columnId]

	return (
		<div
			ref={setNodeRef}
			className={clsx(
				'relative flex flex-col overflow-visible rounded-2xl border bg-black/30 backdrop-blur-md transition-colors',
				meta.border,
				meta.accent,
				isOver && !isFiltered && !isSyncing && 'ring-2 ring-emerald-400/60'
			)}
			style={{ zIndex: isActiveColumn ? 500 : undefined }}
		>
			<div className='flex items-start justify-between gap-2 p-4'>
				<div>
					<h3 className='text-lg font-semibold text-white flex items-center gap-2'>
						{meta.title}
						<span className='rounded-full bg-white/10 px-2 text-sm text-white/80'>
							{totalCount}
						</span>
					</h3>
					<p className='text-xs text-gray-400'>{meta.subtitle}</p>
				</div>
			</div>

			<div className='flex-1 space-y-3 p-4'>
				{tasks.length === 0 ? (
					<div className='rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400'>
						<p className='font-medium text-gray-200'>Нет задач</p>
						<p className='text-xs text-gray-500 mt-1'>{meta.hint}</p>
					</div>
				) : (
					<SortableContext
						items={tasks.map(task => task.id)}
						strategy={verticalListSortingStrategy}
						disabled={isFiltered || isSyncing}
					>
						{tasks.map(task => (
							<KanbanTaskCard
								key={`${columnId}-${task.id}`}
								task={task}
								customerLookup={customerLookup}
								disabled={isFiltered || isSyncing}
								onSaveNote={onSaveNote}
								onQuickMove={onQuickMove}
							/>
						))}
					</SortableContext>
				)}
			</div>
		</div>
	)
}

type KanbanTaskCardProps = {
	task: ExecutorTask
	disabled: boolean
	customerLookup: Map<string, { name: string }>
	onSaveNote: (taskId: string, note: string) => Promise<void>
	onQuickMove: (taskId: string, targetColumn: KanbanColumnType) => void
}

function KanbanTaskCard({
	task,
	disabled,
	customerLookup,
	onSaveNote,
	onQuickMove,
}: KanbanTaskCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
		disabled,
	})

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition: transition ?? 'transform 180ms ease, box-shadow 180ms ease',
		zIndex: isDragging ? 999 : undefined,
		boxShadow: isDragging
			? '0 18px 40px rgba(16,185,129,0.35)'
			: '0 10px 25px rgba(16,185,129,0.08)',
		cursor: isDragging ? 'grabbing' : 'grab',
		position: 'relative',
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className='relative'
			{...attributes}
			{...listeners}
		>
			<TaskCardContent
				task={task}
				customerLookup={customerLookup}
				onSaveNote={onSaveNote}
				onQuickMove={onQuickMove}
			/>
		</div>
	)
}

type TaskCardContentProps = {
	task: ExecutorTask
	customerLookup: Map<string, { name: string }>
	onSaveNote: (taskId: string, note: string) => Promise<void>
	onQuickMove: (taskId: string, targetColumn: KanbanColumnType) => void
}

function TaskCardContent({
	task,
	customerLookup,
	onSaveNote,
	onQuickMove,
}: TaskCardContentProps) {
	const [noteDraft, setNoteDraft] = useState(task.executorNote ?? '')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		setNoteDraft(task.executorNote ?? '')
	}, [task.executorNote])

	const saveNote = async () => {
		setSaving(true)
		try {
			await onSaveNote(task.id, noteDraft)
			toast.success('Заметка обновлена')
		} catch (error) {
			console.error(error)
			toast.error('Не удалось сохранить заметку')
		} finally {
			setSaving(false)
		}
	}

	const handleMove = (target: KanbanColumnType) => () => {
		onQuickMove(task.id, target)
	}

	const customerName =
		customerLookup.get(task.customer?.id ?? '')?.name ??
		task.customer?.fullName ??
		task.customer?.email ??
		'—'

	return (
		<div className='rounded-2xl border border-white/10 bg-slate-950/80 p-4 transition hover:border-emerald-400/50 hover:shadow-[0_10px_25px_rgba(16,185,129,0.15)]'>
			<div className='flex items-start justify-between gap-2'>
				<div>
					<Link
						href={`/tasks/${task.id}`}
						className='text-base font-semibold text-emerald-300 transition hover:text-emerald-200'
					>
						{task.title}
					</Link>
					<p className='text-xs text-gray-500 mt-1'>
						Создано {formatDate(task.createdAt)}
						{task.deadline && (
							<>
								{' · '}Дедлайн {formatDate(task.deadline)}
							</>
						)}
					</p>
				</div>
				<span className='rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70'>
					{COLUMN_META[task.executorKanbanColumn].title}
				</span>
			</div>

			{task.description && (
				<p className='mt-2 line-clamp-3 text-sm text-gray-300'>{task.description}</p>
			)}

			<div className='mt-4 grid gap-2 text-xs text-gray-400'>
				<div className='flex items-center justify-between'>
					<span>Бюджет</span>
					<strong className='text-sm text-white'>
						{task.price > 0 ? formatCurrency(task.price) : '—'}
					</strong>
				</div>
				<div className='flex items-center justify-between'>
					<span>Заказчик</span>
					{task.customer?.id ? (
						<Link
							className='flex items-center gap-1 text-sm text-sky-300 transition hover:text-sky-200'
							href={`/users/${task.customer.id}`}
						>
							<Users className='h-3.5 w-3.5' />
							{customerName}
						</Link>
					) : (
						<span className='text-sm text-gray-500'>{customerName}</span>
					)}
				</div>
			</div>

			<div className='mt-4 flex flex-wrap gap-2'>
				<button
					onClick={handleMove('TODO')}
					className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-amber-300/70 hover:text-amber-200 transition'
				>
					В отложенные
				</button>
				<button
					onClick={handleMove('IN_PROGRESS')}
					className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-blue-300/70 hover:text-blue-200 transition'
				>
					В работу
				</button>
				<button
					onClick={handleMove('REVIEW')}
					className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-purple-300/70 hover:text-purple-200 transition'
				>
					На проверку
				</button>
				<button
					onClick={handleMove('DONE')}
					className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-emerald-300/70 hover:text-emerald-200 transition'
				>
					Готово
				</button>
			</div>

			<div className='mt-4 rounded-xl border border-white/10 bg-white/5 p-3'>
				<div className='flex items-center justify-between gap-2'>
					<div className='flex items-center gap-2 text-sm text-gray-300'>
						<NotebookPen className='h-4 w-4 text-emerald-300' />
						<span>Заметка</span>
					</div>
					<div className='flex gap-2'>
						{noteDraft && (
							<button
								type='button'
								className='text-xs text-gray-500 hover:text-gray-300 transition'
								onClick={() => setNoteDraft('')}
							>
								Очистить
							</button>
						)}
						<button
							type='button'
							className='flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition disabled:opacity-50'
							onClick={saveNote}
							disabled={saving}
						>
							{saving ? (
								<span className='w-3 h-3 border border-emerald-200 border-t-transparent rounded-full animate-spin' />
							) : (
								<Save className='h-3 w-3' />
							)}
							Сохранить
						</button>
					</div>
				</div>
				<textarea
					value={noteDraft}
					onChange={event => setNoteDraft(event.target.value)}
					className='mt-2 w-full resize-none rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-400'
					rows={3}
					placeholder='Добавьте пометки по задаче'
				/>
			</div>
		</div>
	)
}

type ViewMode = 'kanban' | 'list' | 'timeline'

export default function ExecutorMyTasksPage() {
  const { token, user } = useUser()
	const [tasks, setTasks] = useState<ExecutorTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
	const [isSyncing, setIsSyncing] = useState(false)
	const [activeColumnId, setActiveColumnId] = useState<KanbanColumnType | null>(null)
	const [viewMode, setViewMode] = useState<ViewMode>('kanban')
	const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([])
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		statuses: [],
		customerId: 'all',
		minBudget: '',
		maxBudget: '',
		onlyWithNotes: false,
	})

	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	const loadPresets = useCallback(() => {
		if (typeof window === 'undefined') return
		try {
			const raw = localStorage.getItem(PRESET_STORAGE_KEY)
			if (!raw) return
			const parsed = JSON.parse(raw) as FilterPreset[]
			setSavedPresets(
				parsed.map(preset => ({
					...preset,
					filters: normalizePresetFilters(preset.filters),
				}))
			)
		} catch (err) {
			console.warn('Не удалось загрузить пресеты фильтров', err)
		}
	}, [])

	useEffect(() => {
		loadPresets()
	}, [loadPresets])

	const savePresets = useCallback(
		(next: FilterPreset[]) => {
			setSavedPresets(next)
			if (typeof window !== 'undefined') {
				localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next))
			}
		},
		[]
	)

	const loadTasks = useCallback(async () => {
		if (!token) return
        setLoading(true)
        setError(null)
		try {
        const res = await fetch('/api/my-tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
				const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Ошибка ${res.status}`)
        }
        const data = await res.json()
			const normalized = (data.tasks || []).map(normalizeTask)
			setTasks(normalized)
		} catch (err: unknown) {
			console.error('Ошибка при загрузке задач исполнителя:', err)
			setError(err instanceof Error ? err.message : 'Ошибка при загрузке задач')
      } finally {
        setLoading(false)
      }
	}, [token])

	useEffect(() => {
		if (token && user?.role === 'executor') {
			void loadTasks()
		}
	}, [token, user, loadTasks])

	const columns = useMemo(() => groupTasks(tasks), [tasks])

	const customerLookup = useMemo(() => {
		const map = new Map<string, { name: string }>()
		for (const task of tasks) {
			if (task.customer?.id) {
				map.set(task.customer.id, {
					name:
						task.customer.fullName ??
						task.customer.email ??
						`ID ${task.customer.id.slice(0, 6)}`,
				})
			}
		}
		return map
	}, [tasks])

	const filteredColumns = useMemo(() => {
		const result = createEmptyColumns()
		for (const column of COLUMN_ORDER) {
			result[column] = columns[column].filter(task => matchesFilters(task, filters))
		}
		return result
	}, [columns, filters])

	const filteredTasksFlat = useMemo(
		() => COLUMN_ORDER.flatMap(column => filteredColumns[column]),
		[filteredColumns]
	)

	const stats = useMemo(() => {
		const open = columns.TODO.length
		const inProgress = columns.IN_PROGRESS.length + columns.REVIEW.length
		const completed = columns.DONE.length
		const cancelled = tasks.filter(task => task.status === 'cancelled').length
		const completedTasks = tasks.filter(task => task.status === 'completed')
		const totalEarned = completedTasks.reduce((sum, task) => sum + task.price, 0)
		const avgCheck =
			completedTasks.length > 0 ? totalEarned / completedTasks.length : 0

		const avgTimeMs = completedTasks.reduce((sum, task) => {
			if (!task.completedAt) return sum
			return (
				sum +
				(new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime())
			)
		}, 0)
		const avgTimeDays =
			completedTasks.length > 0
				? Math.max(avgTimeMs / completedTasks.length / (1000 * 60 * 60 * 24), 0)
				: 0

		return {
			open,
			inProgress,
			completed,
			cancelled,
			totalEarned,
			avgCheck,
			avgTimeDays,
		}
	}, [columns, tasks])

	const percentages = useMemo(() => {
		const total =
			stats.open + stats.inProgress + stats.completed + stats.cancelled || 1
		return {
			open: (stats.open / total) * 100,
			inProgress: (stats.inProgress / total) * 100,
    completed: (stats.completed / total) * 100,
    cancelled: (stats.cancelled / total) * 100,
  }
	}, [stats])

	const persistKanban = useCallback(
		async (
			nextColumns: Record<KanbanColumnType, ExecutorTask[]>,
			changedColumns: KanbanColumnType[]
		) => {
			if (!token) return
			setIsSyncing(true)
			try {
				const updates = changedColumns.flatMap(column =>
					nextColumns[column].map((task, index) => ({
						id: task.id,
						column,
						order: index,
					}))
				)

				const res = await fetch('/api/my-tasks/kanban', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ updates }),
				})

				if (!res.ok) {
					const data = await res.json().catch(() => ({}))
					throw new Error(data.error || 'Не удалось сохранить порядок')
				}
			} catch (error: unknown) {
				console.error('Ошибка сохранения executor kanban:', error)
				const message =
					error instanceof Error ? error.message : 'Не удалось сохранить изменения'
				toast.error(message)
				void loadTasks()
			} finally {
				setIsSyncing(false)
			}
		},
		[token, loadTasks]
	)

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const taskId = event.active.id as string
			const task = tasks.find(item => item.id === taskId)
			if (!task) return
			setActiveColumnId(task.executorKanbanColumn)
		},
		[tasks]
	)

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveColumnId(null)
			const { active, over } = event
			if (!over) return

			const activeId = active.id as string
			const overId = over.id as string

		type PersistPayload = {
			nextColumns: Record<KanbanColumnType, ExecutorTask[]>
			changedColumns: KanbanColumnType[]
		}
		let pendingPayload: PersistPayload | null = null

		setTasks(prev => {
				const currentColumns = groupTasks(prev)
				const copy: Record<KanbanColumnType, ExecutorTask[]> = {
					TODO: currentColumns.TODO.map(task => ({ ...task })),
					IN_PROGRESS: currentColumns.IN_PROGRESS.map(task => ({ ...task })),
					REVIEW: currentColumns.REVIEW.map(task => ({ ...task })),
					DONE: currentColumns.DONE.map(task => ({ ...task })),
				}

				let startColumn: KanbanColumnType | null = null
				let startIndex = -1
				for (const column of COLUMN_ORDER) {
					const index = copy[column].findIndex(task => task.id === activeId)
					if (index !== -1) {
						startColumn = column
						startIndex = index
						break
					}
				}

				if (!startColumn) return prev
				const startTasks = copy[startColumn]
				const [movedTask] = startTasks.splice(startIndex, 1)
				if (!movedTask) return prev

				let destinationColumn: KanbanColumnType | null = null
				let destinationIndex = 0

				if ((COLUMN_ORDER as readonly string[]).includes(overId)) {
					destinationColumn = overId as KanbanColumnType
					destinationIndex = copy[destinationColumn].length
				} else {
					for (const column of COLUMN_ORDER) {
						const index = copy[column].findIndex(task => task.id === overId)
						if (index !== -1) {
							destinationColumn = column
							destinationIndex = index
							if (startColumn === destinationColumn && destinationIndex > startIndex) {
								destinationIndex -= 1
							}
							break
						}
					}
				}

				if (!destinationColumn) return prev

				const changedColumns = new Set<KanbanColumnType>([startColumn, destinationColumn])

				if (startColumn === destinationColumn) {
					const reordered = arrayMove(copy[destinationColumn], startIndex, destinationIndex)
					copy[destinationColumn] = reordered.map((task, index) => ({
						...task,
						executorKanbanColumn: destinationColumn!,
						executorKanbanOrder: index,
					}))
				} else {
					const destinationTasks = copy[destinationColumn]
					const updatedTask = {
						...movedTask,
						executorKanbanColumn: destinationColumn,
					}
					destinationTasks.splice(destinationIndex, 0, updatedTask)

					copy[startColumn] = copy[startColumn].map((task, index) => ({
						...task,
						executorKanbanOrder: index,
					}))

					copy[destinationColumn] = copy[destinationColumn].map((task, index) => ({
						...task,
						executorKanbanOrder: index,
					}))
				}

				const updatedMap = new Map<string, ExecutorTask>()
				for (const column of COLUMN_ORDER) {
					copy[column] = copy[column].map((task, index) => ({
						...task,
						executorKanbanColumn: column,
						executorKanbanOrder: index,
					}))
					for (const task of copy[column]) {
						updatedMap.set(task.id, task)
					}
				}

				pendingPayload = {
					nextColumns: copy,
					changedColumns: Array.from(changedColumns),
				}

				return prev.map(task => updatedMap.get(task.id) ?? task)
			})

		const payload = pendingPayload
		if (payload) {
			void persistKanban(payload.nextColumns, payload.changedColumns)
		}
	},
		[persistKanban]
	)

	const handleDragCancel = useCallback(() => {
		setActiveColumnId(null)
	}, [])

	const handleSaveNote = useCallback(
		async (taskId: string, note: string) => {
			if (!token) return
			const res = await fetch(`/api/my-tasks/${taskId}/note`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ note }),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || 'Не удалось сохранить заметку')
			}
			setTasks(prev =>
				prev.map(task =>
					task.id === taskId ? { ...task, executorNote: note.trim() || null } : task
				)
			)
		},
		[token]
	)

	const handleQuickMove = useCallback(
		(taskId: string, targetColumn: KanbanColumnType) => {
			type PersistPayload = {
				nextColumns: Record<KanbanColumnType, ExecutorTask[]>
				changedColumns: KanbanColumnType[]
			}
			let pendingPayload: PersistPayload | null = null

			setTasks(prev => {
				const currentColumns = groupTasks(prev)
				const copy: Record<KanbanColumnType, ExecutorTask[]> = {
					TODO: currentColumns.TODO.map(task => ({ ...task })),
					IN_PROGRESS: currentColumns.IN_PROGRESS.map(task => ({ ...task })),
					REVIEW: currentColumns.REVIEW.map(task => ({ ...task })),
					DONE: currentColumns.DONE.map(task => ({ ...task })),
				}

				let currentColumn: KanbanColumnType | null = null
				let currentIndex = -1
				for (const column of COLUMN_ORDER) {
					const index = copy[column].findIndex(task => task.id === taskId)
					if (index !== -1) {
						currentColumn = column
						currentIndex = index
						break
					}
				}

				if (currentColumn === null) return prev
				const [task] = copy[currentColumn].splice(currentIndex, 1)
				const changedColumns = new Set<KanbanColumnType>([currentColumn, targetColumn])

				const destinationTasks = copy[targetColumn]
				destinationTasks.push({
					...task,
					executorKanbanColumn: targetColumn,
				})

				for (const column of COLUMN_ORDER) {
					copy[column] = copy[column].map((item, index) => ({
						...item,
						executorKanbanColumn: column,
						executorKanbanOrder: index,
					}))
				}

				const updatedMap = new Map<string, ExecutorTask>()
				for (const column of COLUMN_ORDER) {
					for (const item of copy[column]) {
						updatedMap.set(item.id, item)
					}
				}

				pendingPayload = {
					nextColumns: copy,
					changedColumns: Array.from(changedColumns),
				}

				return prev.map(task => updatedMap.get(task.id) ?? task)
			})

			const payload = pendingPayload
			if (payload) {
				void persistKanban(payload.nextColumns, payload.changedColumns)
			}
		},
		[persistKanban]
	)

	const handleSavePreset = () => {
		const name = prompt('Название фильтра:')
		if (!name) return
		const preset: FilterPreset = {
			id: crypto.randomUUID(),
			name,
			filters: { ...filters },
		}
		savePresets([...savedPresets, preset])
		toast.success('Фильтр сохранён')
	}

	const handleApplyPreset = (preset: FilterPreset) => {
		const base: FilterState = {
			search: '',
			statuses: [],
			customerId: 'all',
			minBudget: '',
			maxBudget: '',
			onlyWithNotes: false,
		}
		setFilters({ ...base, ...preset.filters })
		toast.success(`Фильтр "${preset.name}" применён`)
	}

	const handleDeletePreset = (presetId: string) => {
		savePresets(savedPresets.filter(item => item.id !== presetId))
	}

	const exportICS = () => {
		const ics = buildICS(filteredTasksFlat)
		const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'my-tasks-executor.ics'
		link.click()
		URL.revokeObjectURL(url)
	}

	const uniqueCustomers = useMemo(() => {
		const set = new Map<string, string>()
		for (const task of tasks) {
			if (task.customer?.id) {
				const name =
					task.customer.fullName ??
					task.customer.email ??
					`ID ${task.customer.id.slice(0, 6)}`
				set.set(task.customer.id, name)
			}
		}
		return Array.from(set.entries()).map(([id, name]) => ({ id, name }))
	}, [tasks])

	const timelineGroups = useMemo(() => {
		const groups = new Map<string, ExecutorTask[]>()
		for (const task of filteredTasksFlat) {
			const dateKey = task.deadline ?? task.createdAt
			const day = format(new Date(dateKey), 'yyyy-MM-dd')
			if (!groups.has(day)) groups.set(day, [])
			groups.get(day)!.push(task)
		}

		const sortedKeys = Array.from(groups.keys()).sort()
		return sortedKeys.map(key => {
			const date = new Date(key)
			let label = format(date, 'd MMMM, EEEE', { locale: ruLocale })
			if (isToday(date)) label = 'Сегодня'
			else if (isTomorrow(date)) label = 'Завтра'
			else if (differenceInCalendarDays(date, new Date()) < 0) label = `${label} (просрочено)`

			return {
				date: key,
				label,
				tasks: groups.get(key)!,
			}
		})
	}, [filteredTasksFlat])

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
			<div className='mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200'>
				{error}
			</div>
		)
	}

	return (
		<div className='mx-auto max-w-[1400px] px-4 pb-16 pt-12 text-white'>
			<motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
			>
				<div>
					<h1 className='flex items-center gap-2 text-3xl font-bold text-emerald-400'>
						<ClipboardList className='h-7 w-7 text-emerald-400' />
						Мои задачи исполнителя
					</h1>
					<p className='mt-1 text-sm text-gray-400'>
						Контролируй поток задач, сохраняй пресеты фильтров и веди заметки прямо на карточках.
					</p>
        </div>
				<div className='flex flex-wrap gap-2'>
					<button
						onClick={() => setViewMode('kanban')}
						className={clsx(
							'flex items-center gap-1 rounded-full px-4 py-2 text-sm transition',
							viewMode === 'kanban'
								? 'bg-emerald-500 text-black'
								: 'bg-white/10 text-white hover:bg-white/20'
						)}
					>
						<LayoutGrid className='h-4 w-4' />
						Канбан
					</button>
					<button
								onClick={() => setViewMode('list')}
						className={clsx(
							'flex items-center gap-1 rounded-full px-4 py-2 text-sm transition',
							viewMode === 'list'
								? 'bg-emerald-500 text-black'
								: 'bg-white/10 text-white hover:bg-white/20'
						)}
					>
						<List className='h-4 w-4' />
						Список
					</button>
					<button
						onClick={() => setViewMode('timeline')}
						className={clsx(
							'flex items-center gap-1 rounded-full px-4 py-2 text-sm transition',
							viewMode === 'timeline'
								? 'bg-emerald-500 text-black'
								: 'bg-white/10 text-white hover:bg-white/20'
						)}
					>
						<CalendarDays className='h-4 w-4' />
						План
					</button>
					<button
						onClick={exportICS}
						className='flex items-center gap-1 rounded-full border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-200 hover:text-emerald-100'
					>
						<Download className='h-4 w-4' />
						Экспорт .ics
					</button>
				</div>
			</motion.div>

			{/* Статистика */}
			<div className='mb-10 rounded-2xl border border-emerald-500/20 bg-black/40 p-6 backdrop-blur'>
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					<div className='rounded-xl border border-white/5 bg-white/5 p-4'>
						<p className='text-sm text-emerald-200'>Готово</p>
						<p className='mt-2 text-3xl font-semibold text-white'>{stats.completed}</p>
						<p className='mt-1 text-xs text-gray-400'>Задач завершено</p>
          </div>
					<div className='rounded-xl border border-white/5 bg-white/5 p-4'>
						<p className='text-sm text-blue-200'>В работе</p>
						<p className='mt-2 text-3xl font-semibold text-white'>{stats.inProgress}</p>
						<p className='mt-1 text-xs text-gray-400'>Сейчас выполняешь</p>
          </div>
					<div className='rounded-xl border border-white/5 bg-white/5 p-4'>
						<p className='text-sm text-emerald-200'>Доход</p>
						<p className='mt-2 text-3xl font-semibold text-white'>
							{formatCurrency(stats.totalEarned)}
						</p>
						<p className='mt-1 text-xs text-gray-400'>
							Средний чек {formatCurrency(stats.avgCheck || 0)}
						</p>
          </div>
					<div className='rounded-xl border border-white/5 bg-white/5 p-4'>
						<p className='text-sm text-amber-200'>Средний срок</p>
						<p className='mt-2 text-3xl font-semibold text-white'>
							{stats.avgTimeDays ? stats.avgTimeDays.toFixed(1) : '--'} дн.
						</p>
						<p className='mt-1 text-xs text-gray-400'>От старта до завершения</p>
        </div>
				</div>
				<div className='mt-6 h-2 rounded-full bg-gray-900'>
					<div
						style={{ width: `${percentages.open}%` }}
						className='h-full rounded-l-full bg-amber-400/70'
					/>
					<div
						style={{ width: `${percentages.inProgress}%` }}
						className='h-full bg-blue-500/70'
          />
          <div
            style={{ width: `${percentages.completed}%` }}
						className='h-full bg-emerald-500/80'
          />
          <div
            style={{ width: `${percentages.cancelled}%` }}
						className='h-full rounded-r-full bg-red-600/70'
          />
        </div>
      </div>

			{/* Фильтры */}
			<div className='mb-8 rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur'>
				<div className='mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300'>
					<Filter className='h-4 w-4' />
					Фильтры и пресеты
        </div>
				<div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
					<div className='grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
						<div className='flex flex-col gap-1'>
							<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
								Поиск
							</span>
							<input
								type='text'
								value={filters.search}
								onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
								placeholder='Название, описание, заказчик...'
								className='rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400'
							/>
						</div>
						<SelectField
							label='Столбцы'
							value={filters.statuses[0] ?? ''}
							onChange={newValue => {
								if (!newValue) {
									setFilters(prev => ({ ...prev, statuses: [] }))
								} else {
									setFilters(prev => ({
										...prev,
										statuses: [newValue as KanbanColumnType],
									}))
								}
							}}
							options={[
								{ value: '', label: 'Все' },
								...COLUMN_ORDER.map(column => ({
									value: column,
									label: COLUMN_META[column].title,
								})),
							]}
						/>
						<SelectField
							label='Заказчик'
							value={filters.customerId}
							onChange={value =>
								setFilters(prev => ({
									...prev,
									customerId: value,
								}))
							}
							options={[
								{ value: 'all', label: 'Все' },
								...uniqueCustomers.map(customer => ({
									value: customer.id,
									label: customer.name,
								})),
							]}
						/>
						<div className='flex flex-col gap-1'>
							<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
								Мин. бюджет
							</span>
							<div className='relative'>
								<span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500'>
									₽
								</span>
								<input
									type='number'
									min={0}
									value={filters.minBudget}
									onChange={event =>
										setFilters(prev => ({ ...prev, minBudget: event.target.value }))
									}
									placeholder='0'
									className='w-full rounded-xl border border-white/10 bg-black/40 px-7 py-2 text-sm text-white outline-none focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
							</div>
						</div>
						<div className='flex flex-col gap-1'>
							<span className='text-[10px] uppercase tracking-[0.2em] text-emerald-300/80'>
								Макс. бюджет
							</span>
							<div className='relative'>
								<span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500'>
									₽
								</span>
								<input
									type='number'
									min={0}
									value={filters.maxBudget}
									onChange={event =>
										setFilters(prev => ({ ...prev, maxBudget: event.target.value }))
									}
									placeholder='0'
									className='w-full rounded-xl border border-white/10 bg-black/40 px-7 py-2 text-sm text-white outline-none focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
							</div>
						</div>
					</div>
					<div className='flex flex-col gap-3'>
						<div className='flex items-center gap-3 text-xs text-gray-400'>
							<FilterToggle
								label='Только с заметками'
								checked={filters.onlyWithNotes}
								onChange={value =>
									setFilters(prev => ({ ...prev, onlyWithNotes: value }))
								}
							/>
						</div>
						<div className='flex flex-wrap gap-2'>
							<button
								onClick={() =>
									setFilters({
										search: '',
										statuses: [],
										customerId: 'all',
										minBudget: '',
										maxBudget: '',
										onlyWithNotes: false,
									})
								}
								className='inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-emerald-400 hover:text-emerald-300'
							>
								Сбросить
							</button>
							<button
								onClick={handleSavePreset}
								className='inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-200 hover:text-emerald-100'
							>
								<Save className='h-3 w-3' />
								Сохранить пресет
							</button>
						</div>
					</div>
				</div>

				{savedPresets.length > 0 && (
					<div className='mt-4 flex flex-wrap items-center gap-2'>
						{savedPresets.map(preset => (
							<button
								key={preset.id}
								onClick={() => handleApplyPreset(preset)}
								className='group inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-gray-200 transition hover:border-emerald-400/60 hover:text-emerald-200'
							>
								{preset.name}
								<X
									className='h-3 w-3 text-gray-500 transition group-hover:text-red-400'
									onClick={event => {
										event.stopPropagation()
										handleDeletePreset(preset.id)
									}}
								/>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Основная зона */}
			{filteredTasksFlat.length === 0 ? (
				<div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 p-12 text-center text-sm text-emerald-200'>
					<AlertCircle className='h-8 w-8 text-emerald-300' />
					<p>Задач не найдено под текущий фильтр. Попробуйте обновить условия или сбросить фильтры.</p>
				</div>
			) : viewMode === 'kanban' ? (
				<DndContext
					sensors={sensors}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
					collisionDetection={closestCorners}
				>
					<div className='grid gap-4 xl:grid-cols-4'>
						{COLUMN_ORDER.map(columnId => (
							<KanbanColumn
								key={columnId}
								columnId={columnId}
								tasks={filteredColumns[columnId]}
								totalCount={columns[columnId].length}
								isFiltered={
									filteredColumns[columnId].length !== columns[columnId].length
								}
								isSyncing={isSyncing}
								isActiveColumn={activeColumnId === columnId}
								customerLookup={customerLookup}
								onSaveNote={handleSaveNote}
								onQuickMove={handleQuickMove}
							/>
						))}
					</div>
				</DndContext>
			) : viewMode === 'list' ? (
				<div className='space-y-3'>
					{filteredTasksFlat.map(task => (
						<div
							key={task.id}
							className='rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-emerald-400/30 hover:shadow-[0_10px_25px_rgba(16,185,129,0.15)]'
						>
							<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
								<div>
									<Link
										href={`/tasks/${task.id}`}
										className='text-lg font-semibold text-emerald-300 hover:text-emerald-200'
									>
                    {task.title}
									</Link>
									<p className='text-xs text-gray-500 mt-1'>
										{COLUMN_META[task.executorKanbanColumn].title} ·{' '}
										{task.deadline ? `Дедлайн ${formatDate(task.deadline)}` : 'Без дедлайна'}
                  </p>
                </div>
								<div className='flex flex-wrap gap-2'>
									<button
										onClick={() => handleQuickMove(task.id, 'TODO')}
										className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-amber-400 hover:text-amber-200 transition'
									>
										К началу
									</button>
									<button
										onClick={() => handleQuickMove(task.id, 'IN_PROGRESS')}
										className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-blue-400 hover:text-blue-200 transition'
									>
										В работу
									</button>
									<button
										onClick={() => handleQuickMove(task.id, 'REVIEW')}
										className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-purple-400 hover:text-purple-200 transition'
									>
										На проверку
									</button>
									<button
										onClick={() => handleQuickMove(task.id, 'DONE')}
										className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-emerald-400 hover:text-emerald-200 transition'
									>
										Готово
									</button>
								</div>
							</div>
							<p className='mt-2 text-sm text-gray-300'>
								{task.description || 'Нет описания'}
							</p>
							<div className='mt-3 grid gap-3 text-xs text-gray-400 sm:grid-cols-2 lg:grid-cols-4'>
								<div>
									<p className='text-gray-500'>Заказчик</p>
									{task.customer?.id ? (
                    <Link
											href={`/users/${task.customer.id}`}
											className='text-white hover:text-emerald-200 transition'
                    >
											{customerLookup.get(task.customer.id)?.name ??
												task.customer.fullName ??
												task.customer.email ??
												'—'}
                    </Link>
                  ) : (
										task.customer?.fullName ?? task.customer?.email ?? '—'
									)}
								</div>
								<div>
									<p className='text-gray-500'>Бюджет</p>
									<p className='text-white'>
										{task.price > 0 ? formatCurrency(task.price) : '—'}
									</p>
								</div>
								<div>
									<p className='text-gray-500'>Создано</p>
									<p className='text-white'>{formatDate(task.createdAt)}</p>
								</div>
								<div>
									<p className='text-gray-500'>Заметка</p>
									<p className='text-white'>{task.executorNote ?? '—'}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className='space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6'>
					{timelineGroups.map(group => (
						<div key={group.date} className='rounded-xl border border-white/5 bg-white/5 p-4'>
							<div className='flex items-center justify-between'>
								<h3 className='text-lg font-semibold text-emerald-300'>{group.label}</h3>
								<span className='text-xs text-gray-500'>{group.tasks.length} задач</span>
							</div>
							<div className='mt-3 space-y-3'>
								{group.tasks.map(task => (
									<div
										key={task.id}
										className='rounded-xl border border-white/10 bg-black/40 p-3 transition hover:border-emerald-300/40'
									>
										<div className='flex items-center justify-between'>
                <Link
                  href={`/tasks/${task.id}`}
												className='text-sm font-semibold text-white hover:text-emerald-200'
                >
												{task.title}
                </Link>
											<span className='rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60'>
												{COLUMN_META[task.executorKanbanColumn].title}
											</span>
										</div>
										<p className='mt-1 text-xs text-gray-400'>
											{task.customer?.fullName ?? task.customer?.email ?? 'Заказчик неизвестен'}
										</p>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
      )}
    </div>
  )
}
