'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
	AlertCircle,
	ClipboardList,
	ExternalLink,
	History,
	Loader2,
	NotebookPen,
	Sparkles,
	Users,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import {
	addDays,
	addMonths,
	endOfMonth,
	format,
	isSameDay,
	isSameMonth,
	startOfMonth,
	startOfWeek,
} from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale'
import { toast } from 'sonner'

import { useUser } from '@/context/UserContext'

type KanbanColumnType = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

interface ExecutorTask {
	id: string
	title: string
	description: string | null
	price: number
	rawPrice: string | number | null
	escrowAmount: number
	deadline: string | null
	status: string
	executorNote: string | null
	executorKanbanColumn: KanbanColumnType
	executorKanbanOrder: number
	createdAt: string
	updatedAt: string
	completedAt: string | null
	executorPlannedStart: string | null
	executorPlannedDeadline: string | null
	executorPlanNote: string | null
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
	escrowAmount?: string | number | null
	executorPlannedStart?: string | null
	executorPlannedDeadline?: string | null
	executorPlanNote?: string | null
	createdAt: string
	updatedAt: string
	completedAt?: string | null
	customer?: {
		id?: string
		fullName?: string | null
		email?: string | null
	} | null
}

const ACTIVE_PRIORITY: KanbanColumnType[] = ['IN_PROGRESS', 'REVIEW', 'TODO']

const STATUS_META: Record<
	KanbanColumnType | 'CANCELLED',
	{ label: string; badge: string; description: string }
> = {
	TODO: {
		label: 'Назначена',
		badge: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
		description: 'Можно начинать работу, как только будешь готов.',
	},
	IN_PROGRESS: {
		label: 'В работе',
		badge: 'border-blue-400/40 bg-blue-400/10 text-blue-100',
		description: 'Ты сейчас выполняешь эту задачу.',
	},
	REVIEW: {
		label: 'На проверке',
		badge: 'border-purple-400/40 bg-purple-400/10 text-purple-100',
		description: 'Ждём обратную связь от заказчика.',
	},
	DONE: {
		label: 'Завершена',
		badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
		description: 'Задача закрыта, можно переходить к следующей.',
	},
	CANCELLED: {
		label: 'Отменена',
		badge: 'border-red-500/50 bg-red-500/10 text-red-200',
		description: 'Задача отменена заказчиком.',
	},
}

function getExecutorStatusMeta(task: ExecutorTask) {
	if (task.status === 'cancelled') return STATUS_META.CANCELLED
	if (task.status === 'completed') return STATUS_META.DONE
	if (task.status === 'in_progress') return STATUS_META.IN_PROGRESS
	return STATUS_META[task.executorKanbanColumn] ?? STATUS_META.TODO
}

type Hint = {
	id: string
	title: string
	description: string
	tone: 'positive' | 'neutral' | 'warning'
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type CalendarPopoverProps = {
	selectedIso: string | null
	onSelect: (date: Date) => void
	onClose: () => void
}

function CalendarPopover({ selectedIso, onSelect, onClose }: CalendarPopoverProps) {
	const initialDate = selectedIso ? new Date(selectedIso) : new Date()
	const [month, setMonth] = useState(startOfMonth(initialDate))

	const weeks = useMemo(() => {
		const start = startOfWeek(month, { weekStartsOn: 1 })
		const end = endOfMonth(month)
		const rows: Date[][] = []
		let current = start
		while (rows.length < 6) {
			const row: Date[] = []
			for (let i = 0; i < 7; i++) {
				row.push(current)
				current = addDays(current, 1)
			}
			rows.push(row)
			if (current > end && isSameMonth(rows[rows.length - 1][6], end)) break
		}
		return rows
	}, [month])

	const selectedDate = selectedIso ? new Date(selectedIso) : null

	return (
		<div className='flex flex-col gap-3 rounded-2xl border border-emerald-400/40 bg-slate-950/95 p-4 shadow-[0_20px_40px_rgba(16,185,129,0.3)] backdrop-blur'>
			<div className='flex items-center justify-between text-sm text-emerald-100'>
				<button
					type='button'
					onClick={() => setMonth(prev => addMonths(prev, -1))}
					className='inline-flex items-center rounded-md border border-emerald-400/20 px-2 py-1 transition hover:border-emerald-300 hover:text-emerald-50'
				>
					<ChevronLeft className='h-4 w-4' />
				</button>
				<span className='font-semibold'>{format(month, 'LLLL yyyy', { locale: ruLocale })}</span>
				<button
					type='button'
					onClick={() => setMonth(prev => addMonths(prev, 1))}
					className='inline-flex items-center rounded-md border border-emerald-400/20 px-2 py-1 transition hover:border-emerald-300 hover:text-emerald-50'
				>
					<ChevronRight className='h-4 w-4' />
				</button>
			</div>
			<div className='grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.2em] text-emerald-300/80'>
				{WEEKDAY_LABELS.map(label => (
					<div key={label}>{label}</div>
				))}
			</div>
			<div className='grid grid-cols-7 gap-1 text-sm'>
				{weeks.flat().map(day => {
					const isSelected = selectedDate && isSameDay(day, selectedDate)
					const isCurrentMonth = isSameMonth(day, month)
					return (
						<button
							type='button'
							key={day.toISOString()}
							onClick={() => {
								onSelect(day)
								onClose()
							}}
							className={clsx(
								'rounded-xl px-2 py-2 transition focus:outline-none',
								isSelected
									? 'bg-emerald-500 text-slate-950 font-semibold'
									: isCurrentMonth
										? 'bg-white/5 text-emerald-100 hover:bg-emerald-500/20'
										: 'bg-white/5 text-emerald-100/40 hover:bg-emerald-500/10'
							)}
						>
							{format(day, 'd')}
						</button>
					)
				})}
			</div>
			<button
				type='button'
				onClick={onClose}
				className='self-end rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 transition hover:border-emerald-300 hover:text-emerald-100'
			>
				Закрыть
			</button>
		</div>
	)
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

	const resolveBudget = (value: string | number | null | undefined): number => {
		if (value === null || value === undefined) return 0
		if (typeof value === 'number') return value
		const numeric = Number.parseFloat(value.replace(/\s/g, ''))
		return Number.isFinite(numeric) ? numeric : 0
	}

	const escrowAmount = resolveBudget(raw.escrowAmount)
	const basePrice = resolveBudget(raw.price)
	const priceValue = escrowAmount > 0 ? escrowAmount : basePrice

	let effectiveColumn: KanbanColumnType =
		column === 'REVIEW' ? 'IN_PROGRESS' : column

	switch (raw.status?.toLowerCase()) {
		case 'in_progress':
			effectiveColumn = 'IN_PROGRESS'
			break
		case 'completed':
			effectiveColumn = 'DONE'
			break
		case 'cancelled':
			effectiveColumn = 'TODO' // отменённые задачи скрываем из активного канбана
			break
		default:
			break
	}

	return {
		id: raw.id,
		title: raw.title,
		description: raw.description ?? null,
		price: priceValue,
		rawPrice: raw.escrowAmount ?? raw.price ?? null,
		escrowAmount,
		deadline: raw.deadline ?? null,
		status: raw.status ?? 'in_progress',
		executorNote: raw.executorNote ?? null,
		executorKanbanColumn: STATUS_META[effectiveColumn] ? effectiveColumn : 'TODO',
		executorKanbanOrder:
			typeof raw.executorKanbanOrder === 'number' ? raw.executorKanbanOrder : 0,
		executorPlannedStart: raw.executorPlannedStart ?? null,
		executorPlannedDeadline: raw.executorPlannedDeadline ?? null,
		executorPlanNote: raw.executorPlanNote ?? null,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
		completedAt: raw.completedAt ?? null,
		customer: raw.customer ?? null,
	}
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}

function formatDate(value: string | null): string {
	if (!value) return '—'
	try {
		return format(new Date(value), 'd MMM yyyy', { locale: ruLocale })
	} catch {
		return value
	}
}

function formatDateTime(value: string | null): string {
	if (!value) return '—'
	try {
		return format(new Date(value), 'd MMM yyyy, HH:mm', { locale: ruLocale })
	} catch {
		return value
	}
}

function pickCurrentTasks(tasks: ExecutorTask[]): ExecutorTask[] {
	// Активные задачи - это те, которые в работе или в активных колонках канбана
	const activeTasks = tasks.filter(task => {
		// Задача активна, если:
		// 1. Статус "в работе" (in_progress)
		// 2. ИЛИ колонка канбана в активных (TODO, IN_PROGRESS, REVIEW)
		// 3. И НЕ завершена/отменена
		const isActiveStatus = task.status === 'in_progress'
		const isActiveColumn = ACTIVE_PRIORITY.includes(task.executorKanbanColumn)
		const isNotCompleted = task.status !== 'completed' && task.status !== 'cancelled'
		const isNotDone = task.executorKanbanColumn !== 'DONE'
		
		return (isActiveStatus || isActiveColumn) && isNotCompleted && isNotDone
	})

	// Сортируем по приоритету колонки и дате создания
	return activeTasks.sort((a, b) => {
		const priorityDiff =
			ACTIVE_PRIORITY.indexOf(a.executorKanbanColumn) -
			ACTIVE_PRIORITY.indexOf(b.executorKanbanColumn)
		if (priorityDiff !== 0) return priorityDiff
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
	})
}

function pickHistoryTasks(tasks: ExecutorTask[], currentTaskIds: string[]): ExecutorTask[] {
	// В историю попадают только завершенные или отмененные задачи
	return tasks
		.filter(task => {
			const isCompleted = task.status === 'completed' || task.status === 'cancelled'
			const isDone = task.executorKanbanColumn === 'DONE'
			const isNotCurrent = !currentTaskIds.includes(task.id)
			return (isCompleted || isDone) && isNotCurrent
		})
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		)
}

function buildHints(currentTask: ExecutorTask | null, historyTasks: ExecutorTask[]): Hint[] {
	const hints: Hint[] = []

	if (!currentTask) {
		hints.push({
			id: 'no-current',
			title: 'Нет активной задачи',
			description: 'Как только заказчик назначит тебя на новую задачу, она появится здесь.',
			tone: 'neutral',
		})
		if (historyTasks.length > 0) {
			hints.push({
				id: 'history',
				title: `Последняя задача: ${historyTasks[0].title}`,
				description: `Обновлена ${formatDateTime(historyTasks[0].updatedAt)}.`,
				tone: 'positive',
			})
		}
		return hints
	}

	const statusMeta = getExecutorStatusMeta(currentTask)
	hints.push({
		id: 'status',
		title: `Статус: ${statusMeta.label}`,
		description: statusMeta.description,
		tone: 'neutral',
	})

	if (currentTask.executorNote) {
		hints.push({
			id: 'note',
			title: 'Заметка добавлена',
			description: 'Если план поменяется — обнови заметку, чтобы ничего не забыть.',
			tone: 'positive',
		})
	} else {
		hints.push({
			id: 'note',
			title: 'Добавь короткий план',
			description: 'Запиши, что нужно сделать первым делом — это поможет быстрее включиться.',
			tone: 'warning',
		})
	}

	if (currentTask.executorPlannedDeadline) {
		hints.push({
			id: 'plan-deadline',
			title: 'Твой дедлайн по задаче',
			description: `Запланировано на ${formatDateTime(currentTask.executorPlannedDeadline)}.`,
			tone: 'neutral',
		})
	} else {
		hints.push({
			id: 'plan-missing',
			title: 'Запланируй дедлайн для себя',
			description: 'Определи удобную дату выполнения — так проще удерживать темп.',
			tone: 'warning',
		})
	}

	if (currentTask.executorPlanNote) {
		hints.push({
			id: 'plan-note',
			title: 'Есть личные шаги',
			description: currentTask.executorPlanNote,
			tone: 'positive',
		})
	}

	hints.push({
		id: 'updated-at',
		title: 'Последнее обновление',
		description: `Задача обновлялась ${formatDateTime(currentTask.updatedAt)}.`,
		tone: 'neutral',
	})

	const lastDone = historyTasks.find(task => task.executorKanbanColumn === 'DONE')
	if (lastDone) {
		hints.push({
			id: 'recent-done',
			title: `Недавно завершено: ${lastDone.title}`,
			description: `Закрыта ${formatDateTime(lastDone.updatedAt)} — отличный темп!`,
			tone: 'positive',
		})
	}

	return hints.slice(0, 3)
}

type StatsSnapshot = {
	total: number
	active: number
	done: number
}

const PLATFORM_STATUS_LABELS: Record<string, string> = {
	open: 'Открыта',
	in_progress: 'В работе',
	review: 'На проверке',
	completed: 'Выполнена',
	cancelled: 'Отменена',
}

function StatsSummary({ stats }: { stats: StatsSnapshot }) {
	return (
		<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
			<StatCard label='Всего задач' value={stats.total} tone='neutral' />
			<StatCard label='Сейчас в работе' value={stats.active} tone='positive' />
			<StatCard label='Завершено' value={stats.done} tone='positive' subtle />
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
	tone: 'positive' | 'neutral' | 'warning'
	subtle?: boolean
}) {
	const toneClass =
		tone === 'positive'
			? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100'
			: tone === 'warning'
				? 'border-amber-400/40 bg-amber-400/5 text-amber-100'
				: 'border-white/10 bg-white/5 text-gray-200'

	return (
		<div
			className={clsx(
				'rounded-xl border px-4 py-5 transition',
				toneClass,
				!subtle && 'hover:border-emerald-400/50 hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)]'
			)}
		>
			<p className='text-xs uppercase tracking-[0.2em]'>{label}</p>
			<p className='mt-3 text-2xl font-semibold'>{value}</p>
				</div>
	)
}

function ContextHints({ hints }: { hints: Hint[] }) {
	if (hints.length === 0) return null

	return (
		<div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
			{hints.map(hint => (
				<div
					key={hint.id}
					className={clsx(
						'flex items-start gap-3 rounded-2xl border px-4 py-3',
						hint.tone === 'positive' && 'border-emerald-400/30 bg-emerald-400/5',
						hint.tone === 'warning' && 'border-amber-400/40 bg-amber-400/5',
						hint.tone === 'neutral' && 'border-white/10 bg-white/5'
					)}
				>
					<Sparkles className='mt-1 h-4 w-4 text-emerald-200' />
					<div>
						<p className='text-sm font-medium text-white'>{hint.title}</p>
						<p className='mt-1 text-xs text-gray-300'>{hint.description}</p>
			</div>
				</div>
			))}
		</div>
	)
}

function CurrentTaskCard({
	task,
	onSaveNote,
	onSavePlan,
	isSavingNote,
	isSavingPlan,
}: {
	task: ExecutorTask
	onSaveNote: (note: string) => Promise<void>
	onSavePlan: (plan: { plannedDeadline: string | null; planNote: string }) => Promise<void>
	isSavingNote: boolean
	isSavingPlan: boolean
}) {
	const [noteDraft, setNoteDraft] = useState('')
	const [planDate, setPlanDate] = useState('')
	const [planTime, setPlanTime] = useState('')
	const [planNote, setPlanNote] = useState('')
	const [showCalendar, setShowCalendar] = useState(false)

	const initialDeadlineRef = useRef<string | null>(task.executorPlannedDeadline ?? null)
	const calendarRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		initialDeadlineRef.current = task.executorPlannedDeadline ?? null
		if (task.executorPlannedDeadline) {
			const date = new Date(task.executorPlannedDeadline)
			const pad = (num: number) => String(num).padStart(2, '0')
			setPlanDate(date.toISOString().slice(0, 10))
			setPlanTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
		} else {
			setPlanDate('')
			setPlanTime('')
		}
		setPlanNote('')
		setNoteDraft('')
		setShowCalendar(false)
	}, [task.id])

	useEffect(() => {
		if (!showCalendar) return
		const handleClickOutside = (event: MouseEvent) => {
			if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
				setShowCalendar(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [showCalendar])

	const statusMeta = getExecutorStatusMeta(task)
	const customerName =
		task.customer?.fullName ?? task.customer?.email ?? (task.customer?.id ? `ID ${task.customer.id.slice(0, 6)}` : 'Не указан')

	const buildDraftIso = () => {
		if (!planDate && !planTime) return null
		const pad = (num: number) => String(num).padStart(2, '0')
		const base = initialDeadlineRef.current ? new Date(initialDeadlineRef.current) : null
		const datePart = planDate || (base ? base.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
		const timePart =
			planTime || (base ? `${pad(base.getHours())}:${pad(base.getMinutes())}` : '19:00')
		return new Date(`${datePart}T${timePart}`).toISOString()
	}

	const draftIso = buildDraftIso()
	const currentIso = initialDeadlineRef.current ? new Date(initialDeadlineRef.current).toISOString() : null
	const deadlineChanged = draftIso !== null && draftIso !== currentIso
	const planNoteChanged = planNote.trim().length > 0
	const isPlanDirty = deadlineChanged || planNoteChanged

	const handleNoteSubmit = async () => {
		const text = noteDraft.trim()
		if (!text) return
		await onSaveNote(text)
		setNoteDraft('')
	}

	const handlePlanSubmit = async () => {
		const nextDeadline = draftIso ?? currentIso
		await onSavePlan({
			plannedDeadline: nextDeadline,
			planNote: planNote.trim(),
		})
		initialDeadlineRef.current = nextDeadline
		setPlanDate('')
		setPlanTime('')
		setPlanNote('')
		setShowCalendar(false)
	}

	const handlePlanReset = async () => {
		await onSavePlan({ plannedDeadline: null, planNote: '' })
		initialDeadlineRef.current = null
		setPlanDate('')
		setPlanTime('')
		setPlanNote('')
		setShowCalendar(false)
	}

	return (
		<div className='rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur'>
			<div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
				<div>
					<p className='text-xs uppercase tracking-[0.3em] text-emerald-300/70'>
						Активная задача
					</p>
					<h2 className='mt-2 text-2xl font-semibold text-white'>{task.title}</h2>
					<p className='mt-2 text-sm text-gray-300'>
						Создана {formatDate(task.createdAt)} · Обновлена {formatDateTime(task.updatedAt)}
					</p>
				</div>
				<span
					className={clsx(
						'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest',
						statusMeta.badge
					)}
				>
					{statusMeta.label}
				</span>
			</div>

			{task.description && (
				<p className='mt-4 text-sm text-gray-200'>{task.description}</p>
			)}

			<div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
				<InfoRow label='Бюджет' tone='accent'>
					{task.price > 0 ? formatCurrency(task.price) : 'Не указан'}
				</InfoRow>
				<InfoRow label='Заказчик'>
					{task.customer?.id ? (
						<Link
							href={`/users/${task.customer.id}`}
							className='inline-flex items-center gap-1 text-sm text-sky-200 hover:text-sky-100'
						>
							<Users className='h-3.5 w-3.5' />
							{customerName}
						</Link>
					) : (
						customerName
					)}
				</InfoRow>
				<InfoRow label='Статус платформы' tone='status'>
					{PLATFORM_STATUS_LABELS[task.status] ?? task.status}
				</InfoRow>
				</div>

			<div className='mt-4 grid gap-4 md:grid-cols-2'>
				<InfoRow label='Мой дедлайн' tone='accent'>
					{task.executorPlannedDeadline ? formatDateTime(task.executorPlannedDeadline) : 'Не установлен'}
				</InfoRow>
				<InfoRow label='Моя заметка' tone='note'>
					{task.executorNote ? task.executorNote : '—'}
				</InfoRow>
				<InfoRow label='Ключевые шаги' tone='note'>
					{task.executorPlanNote ? task.executorPlanNote : '—'}
				</InfoRow>
			</div>

			<div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex items-center gap-2 text-sm text-gray-200'>
						<NotebookPen className='h-4 w-4 text-emerald-300' />
						Заметка исполнителя
					</div>
					<div className='flex gap-2'>
				<button
							type='button'
							className='rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 transition hover:border-white/30 hover:text-white'
							onClick={() => setNoteDraft('')}
							disabled={!noteDraft}
						>
							Очистить
				</button>
				<button
							type='button'
							className='inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60'
							onClick={() => void handleNoteSubmit()}
							disabled={isSavingNote || noteDraft.trim().length === 0}
						>
							{isSavingNote ? (
								<Loader2 className='h-3.5 w-3.5 animate-spin' />
							) : (
								<>
									Сохранить заметку
								</>
							)}
				</button>
					</div>
				</div>
				<textarea
					value={noteDraft}
					onChange={event => setNoteDraft(event.target.value)}
					rows={4}
					className='mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-emerald-400'
					placeholder='Опиши план или важные нюансы, чтобы быстро вернуться к задаче.'
				/>
			</div>

			<div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex flex-col gap-1 text-sm text-gray-200'>
						<span className='font-semibold text-white'>Мой дедлайн</span>
						<span className='text-xs text-gray-400'>
							Определи удобную дату завершения — платформа напомнит об этом в подсказках.
						</span>
					</div>
					<div className='flex flex-wrap gap-2'>
						<button
							type='button'
							onClick={() => setShowCalendar(prev => !prev)}
							className={clsx(
								'rounded-full border px-3 py-1 text-xs transition',
								showCalendar
									? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
									: 'border-white/10 text-gray-200 hover:border-emerald-300 hover:text-emerald-100'
							)}
						>
							Календарь
						</button>
					</div>
				</div>
				<div className='mt-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4'>
					<div className='flex flex-col gap-2 md:w-64'>
						<input
							type='date'
							value={planDate}
							onChange={event => setPlanDate(event.target.value)}
							className='rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-emerald-500/10 focus:shadow-[0_0_0_2px_rgba(16,185,129,0.25)] focus-visible:ring-0'
						/>
						<input
							type='time'
							value={planTime}
							onChange={event => setPlanTime(event.target.value)}
							className='rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-emerald-500/10 focus:shadow-[0_0_0_2px_rgba(16,185,129,0.25)] focus-visible:ring-0'
						/>
					</div>
					<div className='flex-1'>
				<textarea
							value={planNote}
							onChange={event => setPlanNote(event.target.value)}
							rows={2}
							className='w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-400'
							placeholder='Опиши личные шаги для выполнения задачи'
						/>
					</div>
				</div>
				<div className='mt-3 flex justify-end'>
					<button
						type='button'
						onClick={() => void handlePlanReset()}
						disabled={isSavingPlan}
						className='mr-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-red-400 hover:text-red-200 disabled:opacity-60'
					>
						Сбросить план
					</button>
						<button
							type='button'
						onClick={() => void handlePlanSubmit()}
						disabled={!isPlanDirty || isSavingPlan}
						className='inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60'
					>
						{isSavingPlan ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : 'Сохранить мой план'}
						</button>
					</div>

				{showCalendar && (
					<div ref={calendarRef} className='mt-4 flex justify-end'>
						<CalendarPopover
							selectedIso={
								planDate
									? `${planDate}T${planTime || '19:00'}`
									: initialDeadlineRef.current ?? null
							}
							onSelect={date => {
								const iso = date.toISOString()
								setPlanDate(iso.slice(0, 10))
								setPlanTime(iso.slice(11, 16))
							}}
							onClose={() => setShowCalendar(false)}
						/>
					</div>
				)}
				</div>

			<div className='mt-6 flex flex-wrap gap-2'>
				<Link
					href={`/tasks/${task.id}`}
					className='inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-sm text-emerald-100 transition hover:border-emerald-200 hover:text-emerald-50'
				>
					Открыть задачу полностью
					<ExternalLink className='h-4 w-4' />
				</Link>
			</div>
		</div>
	)
}

function InfoRow({
	label,
	children,
	tone = 'default',
}: {
	label: string
	children: React.ReactNode
	tone?: 'default' | 'status' | 'note' | 'accent'
}) {
	const toneClass =
		tone === 'status'
			? 'border-emerald-400/30 bg-emerald-400/10'
			: tone === 'note'
				? 'border-sky-400/30 bg-sky-400/10'
				: tone === 'accent'
					? 'border-amber-400/30 bg-amber-400/10'
					: 'border-white/10 bg-white/5'

	return (
		<div className={clsx('rounded-xl p-4 transition', toneClass)}>
			<p className='text-xs uppercase tracking-[0.2em] text-gray-300'>{label}</p>
			<p className='mt-2 text-sm text-white'>{children}</p>
		</div>
	)
}

function HistoryTaskList({ tasks }: { tasks: ExecutorTask[] }) {
	if (tasks.length === 0) {
		return (
			<div className='flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-sm text-gray-300'>
				<History className='h-5 w-5 text-gray-500' />
				<p>История пока пустая. Как только завершишь задания, они появятся здесь.</p>
			</div>
		)
	}

	return (
		<div className='space-y-3'>
			{tasks.map(task => (
				<div
					key={task.id}
					className='flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-emerald-400/40 hover:shadow-[0_6px_16px_rgba(16,185,129,0.15)] md:flex-row md:items-start md:justify-between'
				>
					<div className='space-y-2'>
						<Link
							href={`/tasks/${task.id}`}
							className='text-base font-semibold text-white hover:text-emerald-200'
						>
							{task.title}
						</Link>
						<p className='mt-1 text-xs text-gray-400'>
							Обновлена {formatDateTime(task.updatedAt)}
						</p>
						{task.description && (
							<p className='mt-2 line-clamp-2 text-sm text-gray-300'>{task.description}</p>
						)}
						<div className='grid gap-2 text-xs'>
							{task.executorPlannedDeadline && (
								<div className='inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-100'>
									<span>Дедлайн:</span>
									<strong className='font-semibold text-white'>
										{formatDateTime(task.executorPlannedDeadline)}
									</strong>
								</div>
							)}
							{task.executorPlanNote && (
								<div className='rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sky-100'>
									<span className='font-semibold text-white'>Ключевые шаги:</span> {task.executorPlanNote}
								</div>
							)}
							{task.executorNote && (
								<div className='rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-100'>
									<span className='font-semibold text-white'>Заметка:</span> {task.executorNote}
								</div>
							)}
						</div>
					</div>
					<span
						className={clsx(
							'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest',
							getExecutorStatusMeta(task).badge
						)}
					>
						{getExecutorStatusMeta(task).label}
					</span>
				</div>
			))}
		</div>
	)
}

export default function ExecutorMyTasksPage() {
	const { token, user } = useUser()
	const [tasks, setTasks] = useState<ExecutorTask[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
	const [savingPlanId, setSavingPlanId] = useState<string | null>(null)

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
			setError(err instanceof Error ? err.message : 'Не удалось загрузить задачи')
      } finally {
        setLoading(false)
      }
	}, [token])

	useEffect(() => {
		if (token && user?.role === 'executor') {
			void loadTasks()
		}
	}, [token, user, loadTasks])

	const currentTasks = useMemo(() => pickCurrentTasks(tasks), [tasks])
	const historyTasks = useMemo(
		() => pickHistoryTasks(tasks, currentTasks.map(t => t.id)),
		[tasks, currentTasks]
	)
	// Для подсказок используем первую задачу (или null, если нет активных)
	const primaryTask = currentTasks.length > 0 ? currentTasks[0] : null
	const hints = useMemo(() => buildHints(primaryTask, historyTasks), [primaryTask, historyTasks])
	const stats = useMemo<StatsSnapshot>(() => {
		const active = tasks.filter(task => task.status === 'in_progress').length
		const done = tasks.filter(task => task.status === 'completed').length
		return {
			total: tasks.length,
			active,
			done,
		}
	}, [tasks])

	const handleSaveNote = useCallback(
		async (taskId: string, note: string) => {
			if (!token) {
				toast.error('Не удалось сохранить заметку: нет токена авторизации')
				return
			}
			setSavingNoteId(taskId)
			try {
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
				toast.success('Заметка обновлена')
			} catch (err: unknown) {
				console.error('Ошибка при сохранении заметки исполнителя:', err)
				toast.error(
					err instanceof Error ? err.message : 'Не удалось сохранить заметку'
				)
			} finally {
				setSavingNoteId(null)
			}
		},
		[token]
	)

	const handleSavePlan = useCallback(
		async (taskId: string, plan: { plannedDeadline: string | null; planNote: string }) => {
			if (!token) {
				toast.error('Не удалось сохранить план: нет токена авторизации')
				return
			}
			setSavingPlanId(taskId)
			try {
				const res = await fetch(`/api/my-tasks/${taskId}/plan`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
					body: JSON.stringify({
						plannedDeadline: plan.plannedDeadline,
						planNote: plan.planNote,
					}),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
					throw new Error(data.error || 'Не удалось сохранить план')
				}
				const data = (await res.json()) as {
					plan?: {
						id: string
						executorPlannedStart: string | null
						executorPlannedDeadline: string | null
						executorPlanNote: string | null
					}
				}
				const updatedPlan = data.plan
			setTasks(prev =>
				prev.map(task =>
						task.id === taskId
							? {
									...task,
									executorPlannedStart: updatedPlan?.executorPlannedStart ?? null,
									executorPlannedDeadline: updatedPlan?.executorPlannedDeadline ?? null,
									executorPlanNote: updatedPlan?.executorPlanNote ?? null,
							  }
							: task
					)
				)
				toast.success('Личный план обновлён')
			} catch (err: unknown) {
				console.error('Ошибка при сохранении плана исполнителя:', err)
				toast.error(err instanceof Error ? err.message : 'Не удалось сохранить план')
			} finally {
				setSavingPlanId(null)
			}
		},
		[token]
	)

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
		<>
			<style jsx global>{`
				input[type='date'],
				input[type='time'] {
					caret-color: #34d399;
				}

				input[type='date']::selection,
				input[type='time']::selection {
					background: rgba(16, 185, 129, 0.25);
					color: #f8fafc;
				}

				input[type='date']::-moz-selection,
				input[type='time']::-moz-selection {
					background: rgba(16, 185, 129, 0.25);
					color: #f8fafc;
				}
			`}</style>
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
						Следи за текущей задачей и держи под рукой историю выполненных работ.
					</p>
				</div>
			</motion.div>

			<StatsSummary stats={stats} />

			{hints.length > 0 && currentTasks.length > 0 && (
				<div className='mt-8'>
					<ContextHints hints={hints} />
					</div>
			)}

			<div className='mt-10 space-y-6'>
				{currentTasks.length > 0 ? (
					currentTasks.map(task => (
						<CurrentTaskCard
							key={task.id}
							task={task}
							onSaveNote={note => handleSaveNote(task.id, note)}
							onSavePlan={plan => handleSavePlan(task.id, plan)}
							isSavingNote={savingNoteId === task.id}
							isSavingPlan={savingPlanId === task.id}
						/>
					))
				) : (
					<div className='flex items-center gap-3 rounded-3xl border border-white/10 bg-black/40 px-6 py-10 text-sm text-gray-300'>
						<AlertCircle className='h-6 w-6 text-emerald-200' />
						<div>
							<p className='text-base font-semibold text-white'>Нет активных задач</p>
							<p className='mt-1 text-sm text-gray-400'>
								Как только заказчик назначит тебя на задачу, здесь появится блок с подробностями.
							</p>
						</div>
					</div>
				)}
			</div>

			<div className='mt-12 space-y-4'>
				<div className='flex items-center gap-2 text-sm font-semibold text-emerald-200'>
					<History className='h-4 w-4' />
					История задач
								</div>
				<HistoryTaskList tasks={historyTasks} />
								</div>
			</div>
		</>
  )
}

