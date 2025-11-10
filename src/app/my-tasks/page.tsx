'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	DndContext,
	DragEndEvent,
	DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
	closestCorners,
	KeyboardSensor,
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
	ClipboardList,
	Filter,
	Loader2,
	Plus,
	Users,
	ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'

import { useUser } from '@/context/UserContext'

type KanbanColumnType = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

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

interface KanbanTask {
	id: string
	title: string
	description: string | null
	status: string
	price: number | null
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

const COLUMN_ORDER: KanbanColumnType[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']

const COLUMN_META: Record<
	KanbanColumnType,
	{ title: string; subtitle: string; accent: string; border: string }
> = {
	TODO: {
		title: 'Новые',
		subtitle: 'То, что ждёт старта',
		accent: 'bg-yellow-500/10',
		border: 'border-yellow-500/40',
	},
	IN_PROGRESS: {
		title: 'В работе',
		subtitle: 'Сейчас выполняется',
		accent: 'bg-blue-500/10',
		border: 'border-blue-500/40',
	},
	REVIEW: {
		title: 'На проверке',
		subtitle: 'Нужно подтвердить результат',
		accent: 'bg-purple-500/10',
		border: 'border-purple-500/40',
	},
	DONE: {
		title: 'Завершено',
		subtitle: 'Закрытые задачи',
		accent: 'bg-emerald-500/10',
		border: 'border-emerald-500/40',
	},
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
	review: 'На проверке',
  completed: 'Выполнена',
  cancelled: 'Отменена',
}

function createEmptyColumns(): Record<KanbanColumnType, KanbanTask[]> {
	return {
		TODO: [],
		IN_PROGRESS: [],
		REVIEW: [],
		DONE: [],
	}
}

function cloneColumns(
	columns: Record<KanbanColumnType, KanbanTask[]>
): Record<KanbanColumnType, KanbanTask[]> {
	return {
		TODO: columns.TODO.map(task => ({ ...task })),
		IN_PROGRESS: columns.IN_PROGRESS.map(task => ({ ...task })),
		REVIEW: columns.REVIEW.map(task => ({ ...task })),
		DONE: columns.DONE.map(task => ({ ...task })),
	}
}

function normalizeTask(task: RawTask): KanbanTask {
	const rawColumn = typeof task.kanbanColumn === 'string' ? task.kanbanColumn : 'TODO'
	const column = rawColumn.toUpperCase() as KanbanColumnType
	return {
		id: task.id,
		title: task.title,
		description: task.description ?? null,
		status: task.status,
		price: task.price ? Number(task.price) : null,
		deadline: task.deadline,
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

function sortColumn(tasks: KanbanTask[]): KanbanTask[] {
	return [...tasks].sort((a, b) => {
		if (a.kanbanOrder !== b.kanbanOrder) {
			return a.kanbanOrder - b.kanbanOrder
		}
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
	})
}

function formatPrice(value: number | null) {
	if (value === null || Number.isNaN(value)) return '—'
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}

function findTaskLocation(
	columns: Record<KanbanColumnType, KanbanTask[]>,
	taskId: string
) {
	for (const column of COLUMN_ORDER) {
		const index = columns[column].findIndex(task => task.id === taskId)
		if (index !== -1) {
			return { column, index }
		}
	}
	return null
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

type KanbanColumnProps = {
	columnId: KanbanColumnType
	tasks: KanbanTask[]
	totalCount: number
	isFiltered: boolean
	isSyncing: boolean
	isActiveColumn: boolean
}

function KanbanColumn({
	columnId,
	tasks,
	totalCount,
	isFiltered,
	isSyncing,
	isActiveColumn,
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
			style={{
				zIndex: isActiveColumn ? 1000 : undefined,
			}}
		>
			<div className="flex items-start justify-between gap-2 p-4">
				<div>
					<h3 className="text-lg font-semibold text-white flex items-center gap-2">
						{meta.title}
						<span className="rounded-full bg-white/10 px-2 text-sm text-white/80">
							{totalCount}
						</span>
					</h3>
					<p className="text-xs text-gray-400">{meta.subtitle}</p>
				</div>
			</div>

			<div className="flex-1 space-y-3 p-4">
				{tasks.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
						Нет задач
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
								disabled={isFiltered || isSyncing}
							/>
						))}
					</SortableContext>
				)}
			</div>
		</div>
	)
}

type KanbanTaskCardProps = {
	task: KanbanTask
	disabled: boolean
}

type TaskCardContentProps = {
	task: KanbanTask
}

function TaskCardContent({ task }: TaskCardContentProps) {
	return (
		<div
			className={clsx(
				'rounded-2xl border border-white/10 bg-slate-950/80 p-4 transition',
				'hover:border-emerald-400/50 hover:shadow-[0_10px_25px_rgba(16,185,129,0.15)]',
				'cursor-grab active:cursor-grabbing select-none',
				'will-change-transform'
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<Link
					href={`/tasks/${task.id}`}
					className="text-base font-semibold text-emerald-300 transition hover:text-emerald-200"
				>
					{task.title}
				</Link>
				<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
					{STATUS_LABELS[task.status] || task.status}
				</span>
			</div>

			{task.description && (
				<p className="mt-2 line-clamp-3 text-sm text-gray-300">{task.description}</p>
			)}

			<div className="mt-4 space-y-2 text-xs text-gray-400">
				<div className="flex items-center justify-between">
					<span>Бюджет</span>
					<strong className="text-sm text-white">{formatPrice(task.price)}</strong>
				</div>
				<div className="flex items-center justify-between">
					<span>Исполнитель</span>
					{task.executor ? (
						<Link
							className="flex items-center gap-1 text-sm text-sky-300 transition hover:text-sky-200"
							href={`/users/${task.executor.id}`}
						>
							<Users className="h-3.5 w-3.5" />
							{task.executor.fullName ?? task.executor.email ?? 'Без имени'}
						</Link>
					) : (
						<span className="text-sm text-gray-500">Не назначен</span>
					)}
				</div>
			</div>
		</div>
	)
}

function KanbanTaskCard({ task, disabled }: KanbanTaskCardProps) {
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
			className="relative"
			{...attributes}
			{...listeners}
		>
			<TaskCardContent task={task} />
		</div>
	)
}

export default function MyTasksPage() {
	const { token, user } = useUser()
  const router = useRouter()

	const [columns, setColumns] = useState<Record<KanbanColumnType, KanbanTask[]>>(
		createEmptyColumns()
	)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [filters, setFilters] = useState<FiltersState>({
		executor: 'all',
		minBudget: '',
		maxBudget: '',
	})
	const [isSyncing, setIsSyncing] = useState(false)
	const [activeColumnId, setActiveColumnId] = useState<KanbanColumnType | null>(null)

	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

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

			const grouped = createEmptyColumns()
			for (const task of normalized) {
				grouped[task.kanbanColumn].push(task)
			}

			for (const columnId of COLUMN_ORDER) {
				grouped[columnId] = sortColumn(grouped[columnId])
			}

			setColumns(grouped)
		} catch (error: unknown) {
			const message = extractErrorMessage(error, 'Произошла ошибка при загрузке')
			console.error('Ошибка загрузки задач:', error)
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

	const allTasks = useMemo(
		() => COLUMN_ORDER.flatMap(column => columns[column]),
		[columns]
	)

	const stats = useMemo(() => {
		const open = columns.TODO.length
		const inProgress = columns.IN_PROGRESS.length + columns.REVIEW.length
		const completed = columns.DONE.length
		const cancelled = allTasks.filter(task => task.status === 'cancelled').length

		return {
			open,
			in_progress: inProgress,
			completed,
			cancelled,
		}
	}, [allTasks, columns])

	const totalForProgress = Math.max(
		stats.open + stats.in_progress + stats.completed + stats.cancelled,
		1
	)

	const percentages = {
		open: (stats.open / totalForProgress) * 100,
		in_progress: (stats.in_progress / totalForProgress) * 100,
		completed: (stats.completed / totalForProgress) * 100,
		cancelled: (stats.cancelled / totalForProgress) * 100,
	}

	const executorOptions = useMemo(() => {
		const map = new Map<string, { id: string; label: string }>()
		for (const task of allTasks) {
			if (task.executor) {
				map.set(task.executor.id, {
					id: task.executor.id,
					label: task.executor.fullName ?? task.executor.email ?? 'Без имени',
				})
			}
		}
		return Array.from(map.values())
	}, [allTasks])

	const isFiltering =
		filters.executor !== 'all' || filters.minBudget !== '' || filters.maxBudget !== ''

	const filteredColumns = useMemo(() => {
		const result = createEmptyColumns()
		const minBudget = filters.minBudget ? Number(filters.minBudget) : null
		const maxBudget = filters.maxBudget ? Number(filters.maxBudget) : null

		for (const columnId of COLUMN_ORDER) {
			result[columnId] = columns[columnId].map((task, index) => ({
				...task,
				kanbanOrder: index,
			})).filter(task => {
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
		}

		return result
	}, [columns, filters])

	const persistKanban = useCallback(
		async (
			nextColumns: Record<KanbanColumnType, KanbanTask[]>,
			changedColumns: KanbanColumnType[],
			previousSnapshot: Record<KanbanColumnType, KanbanTask[]>
		) => {
			if (!token) return
			setIsSyncing(true)
			try {
				const updates: Array<{ id: string; column: KanbanColumnType; order: number }> = []

				const uniqueColumns = Array.from(new Set(changedColumns))
				for (const columnId of uniqueColumns) {
					nextColumns[columnId].forEach((task, index) => {
						updates.push({
							id: task.id,
							column: columnId,
							order: index,
						})
					})
				}

				const response = await fetch('/api/tasks/kanban', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ updates }),
				})

				if (!response.ok) {
					let errorMessage = 'Не удалось сохранить порядок'
					try {
						const errorBody = await response.json()
						if (errorBody?.error) {
							errorMessage = errorBody.error
						}
					} catch {
						// ignore JSON parse errors
					}
					throw new Error(`${errorMessage} (код ${response.status})`)
				}
			} catch (error: unknown) {
				const message = extractErrorMessage(error, 'Не удалось сохранить изменения')
				console.error('Ошибка сохранения канбана:', error)
				toast.error(message)
				setColumns(previousSnapshot)
			} finally {
				setIsSyncing(false)
			}
		},
		[token]
	)

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const taskId = event.active.id as string
			const location = findTaskLocation(columns, taskId)
			if (!location) {
				setActiveColumnId(null)
				return
			}
			setActiveColumnId(location.column)
		},
		[columns]
	)

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveColumnId(null)
			const { active, over } = event
			if (!over) {
				return
			}

			if (isFiltering || isSyncing) {
				return
			}

			const activeId = active.id as string
			const overId = over.id as string

			const start = findTaskLocation(columns, activeId)
			if (!start) {
				return
			}

			let destinationColumn: KanbanColumnType | null = null
			let destinationIndex = 0

			if ((COLUMN_ORDER as readonly string[]).includes(overId)) {
				destinationColumn = overId as KanbanColumnType
				destinationIndex = columns[destinationColumn].length
			} else {
				const overLocation = findTaskLocation(columns, overId)
				if (!overLocation) {
					return
				}
				destinationColumn = overLocation.column
				destinationIndex = overLocation.index
				if (start.column === destinationColumn && destinationIndex > start.index) {
					destinationIndex -= 1
				}
			}

			if (!destinationColumn) {
				return
			}

			if (
				start.column === destinationColumn &&
				start.index === destinationIndex
			) {
				return
			}

			const previousSnapshot = cloneColumns(columns)

			let nextState: Record<KanbanColumnType, KanbanTask[]> | null = null

			setColumns(prev => {
				const copy = cloneColumns(prev)
				const sourceTasks = copy[start.column]
				const [moved] = sourceTasks.splice(start.index, 1)

				if (!moved) {
					return prev
				}

				if (start.column === destinationColumn) {
					const reordered = arrayMove(copy[destinationColumn], start.index, destinationIndex)
					copy[destinationColumn] = reordered.map((task, index) => ({
						...task,
						kanbanOrder: index,
					}))
				} else {
					const destinationTasks = copy[destinationColumn]
					const updatedTask: KanbanTask = {
						...moved,
						kanbanColumn: destinationColumn,
					}
					destinationTasks.splice(destinationIndex, 0, updatedTask)

					copy[start.column] = copy[start.column].map((task, index) => ({
						...task,
						kanbanOrder: index,
					}))
					copy[destinationColumn] = copy[destinationColumn].map((task, index) => ({
						...task,
						kanbanOrder: index,
					}))
				}

				// обновляем результирующее состояние с выравниванием индексов
				nextState = cloneColumns(copy)
				for (const columnId of COLUMN_ORDER) {
					nextState[columnId] = nextState[columnId].map((task, index) => ({
						...task,
						kanbanOrder: index,
					}))
				}

				return nextState
			})

			if (nextState) {
				void persistKanban(nextState, [start.column, destinationColumn], previousSnapshot)
			}
		},
		[columns, isFiltering, isSyncing, persistKanban]
	)

	const handleDragCancel = useCallback(() => {
		setActiveColumnId(null)
	}, [])

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
			<div className="mt-16 text-center text-gray-400">
				<p>Авторизуйтесь, чтобы просматривать свои задачи.</p>
				<div className="mt-4">
					<Link
						className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
						href="/auth/login"
					>
						Войти
					</Link>
				</div>
			</div>
		)
  }

  return (
		<div className="mx-auto max-w-[1400px] px-4 pb-16 pt-12 text-white">
			<motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<h1 className="flex items-center gap-2 text-3xl font-bold text-emerald-400">
						<ClipboardList className="h-7 w-7 text-emerald-400" />
						Канбан по моим задачам
					</h1>
					<p className="mt-1 text-sm text-gray-400">
						Тяните карточки между колонками, чтобы управлять потоком задач.
					</p>
        </div>
				<Link
					className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
					href="/tasks/new"
				>
					<Plus className="h-4 w-4" />
					Создать задачу
				</Link>
			</motion.div>

			<div className="mb-10 grid gap-4 rounded-2xl border border-emerald-500/20 bg-black/40 p-6 backdrop-blur-md md:grid-cols-4">
				{(['open', 'in_progress', 'completed', 'cancelled'] as const).map(status => (
					<div key={status} className="rounded-xl border border-white/5 bg-white/5 p-4">
						<p className="text-sm text-gray-400">
							{STATUS_LABELS[status] || status}
						</p>
						<div className="mt-2 text-2xl font-semibold text-white">
							{/* @ts-expect-error known keys */ stats[status]}
          </div>
        </div>
				))}
				<div className="col-span-full h-2 rounded-full bg-gray-900">
					<div style={{ width: `${percentages.open}%` }} className="h-full bg-yellow-400/70" />
          <div
            style={{ width: `${percentages.in_progress}%` }}
						className="h-full bg-blue-500/70"
          />
          <div
            style={{ width: `${percentages.completed}%` }}
						className="h-full bg-emerald-500/80"
          />
          <div
            style={{ width: `${percentages.cancelled}%` }}
						className="h-full bg-red-600/70"
          />
        </div>
      </div>

			<div className="mb-6 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur">
				<div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300">
					<Filter className="h-4 w-4" />
					Фильтры
				</div>
				<div className="flex flex-wrap items-end gap-4">
					<div className="flex flex-col gap-2">
						<span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
							Исполнитель
						</span>
						<div className="relative">
							<select
								className="min-w-[200px] appearance-none rounded-xl border border-emerald-400/30 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(16,185,129,0.08)] outline-none transition focus:border-emerald-300 focus:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
								value={filters.executor}
								onChange={event => handleFilterChange({ executor: event.target.value })}
							>
								<option value="all">Все исполнители</option>
								<option value="unassigned">Без исполнителя</option>
								{executorOptions.map(option => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/80" />
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
							Мин. бюджет
						</span>
						<div className="relative">
							<input
								type="number"
								min={0}
								value={filters.minBudget}
								onChange={event => handleFilterChange({ minBudget: event.target.value })}
								placeholder="₽"
								className="w-28 rounded-xl border border-emerald-400/30 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(16,185,129,0.08)] outline-none transition focus:border-emerald-300 focus:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
							/>
							<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300/70">
								₽
							</span>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
							Макс. бюджет
						</span>
						<div className="relative">
							<input
								type="number"
								min={0}
								value={filters.maxBudget}
								onChange={event => handleFilterChange({ maxBudget: event.target.value })}
								placeholder="₽"
								className="w-28 rounded-xl border border-emerald-400/30 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(16,185,129,0.08)] outline-none transition focus:border-emerald-300 focus:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
							/>
							<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300/70">
								₽
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={clearFilters}
						className="inline-flex items-center rounded-full border border-emerald-400/30 px-5 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-200 hover:text-emerald-100"
					>
						Очистить фильтры
					</button>
              </div>
				{isFiltering && (
					<p className="mt-3 text-xs text-yellow-300/90">
						Пока активны фильтры, перетаскивание задач отключено. Очистите фильтры, чтобы
						менять порядок.
                </p>
              )}
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20 text-gray-400">
					<Loader2 className="mr-3 h-5 w-5 animate-spin" />
					Загружаем задачи...
				</div>
			) : error ? (
				<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
					{error}
				</div>
			) : (
				<DndContext
					sensors={sensors}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
					collisionDetection={closestCorners}
				>
					<div className="grid gap-4 xl:grid-cols-4">
						{COLUMN_ORDER.map(columnId => (
							<KanbanColumn
								key={columnId}
								columnId={columnId}
								tasks={filteredColumns[columnId]}
								totalCount={columns[columnId].length}
								isFiltered={isFiltering}
								isSyncing={isSyncing}
								isActiveColumn={activeColumnId === columnId}
							/>
						))}
					</div>
				</DndContext>
      )}
    </div>
  )
}

