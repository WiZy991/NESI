'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '@/context/UserContext'
import {
	X,
	Search,
	Download,
	Image as ImageIcon,
	FileText,
	Loader2,
	AlertCircle,
	RefreshCcw,
} from 'lucide-react'

type AttachmentType = 'all' | 'image' | 'doc'

type Attachment = {
	messageId: string
	fileId: string | null
	fileName: string | null
	mimeType: string | null
	size: number | null
	downloadUrl: string | null
	thumbnailUrl: string | null
	createdAt: string
	senderId: string
}

type AttachmentsModalProps = {
	isOpen: boolean
	onClose: () => void
	chatId: string
	chatType: 'private' | 'task'
	chatTitle: string
	onLocateMessage?: (messageId: string) => void
}

const TYPE_OPTIONS: Array<{ value: AttachmentType; label: string }> = [
	{ value: 'all', label: 'Все' },
	{ value: 'image', label: 'Изображения' },
	{ value: 'doc', label: 'Документы' },
]

const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
})

function formatBytes(bytes: number | null): string {
	if (bytes === null || typeof bytes !== 'number') return '—'
	if (bytes === 0) return '0 Б'
	const k = 1024
	const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	const value = bytes / Math.pow(k, i)
	return `${value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${sizes[i]}`
}

export default function AttachmentsModal({
	isOpen,
	onClose,
	chatId,
	chatType,
	chatTitle,
	onLocateMessage,
}: AttachmentsModalProps) {
	const { token } = useUser()
	const [attachments, setAttachments] = useState<Attachment[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [typeFilter, setTypeFilter] = useState<AttachmentType>('all')
	const [searchInput, setSearchInput] = useState('')
	const [appliedSearch, setAppliedSearch] = useState('')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		if (!isOpen) {
			setError(null)
			setAttachments([])
			return
		}
	}, [isOpen])

	const fetchAttachments = useCallback(async () => {
		if (!token || !isOpen) return

		setLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams()
			params.set('type', typeFilter)
			if (appliedSearch) {
				params.set('search', appliedSearch)
			}

			const res = await fetch(`/api/chats/${chatId}/attachments?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}))
				throw new Error(payload.error || `Ошибка ${res.status}`)
			}

			const data = await res.json()
			setAttachments(data.attachments || [])
		} catch (err: any) {
			console.error('Ошибка загрузки вложений:', err)
			setError(err?.message || 'Не удалось загрузить вложения')
			setAttachments([])
		} finally {
			setLoading(false)
		}
	}, [appliedSearch, chatId, isOpen, token, typeFilter])

	useEffect(() => {
		if (isOpen) {
			fetchAttachments()
		}
	}, [fetchAttachments, isOpen])

	const handleSubmitSearch = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			setAppliedSearch(searchInput.trim())
		},
		[searchInput]
	)

	const handleResetFilters = useCallback(() => {
		setTypeFilter('all')
		setSearchInput('')
		setAppliedSearch('')
	}, [])

	const content = useMemo(() => {
		if (!token) {
			return (
				<div className='flex flex-col items-center justify-center h-full gap-3 text-center text-slate-300'>
					<AlertCircle className='w-10 h-10 text-amber-300' />
					<p className='text-sm opacity-80'>Авторизуйтесь, чтобы увидеть вложения.</p>
				</div>
			)
		}

		if (loading) {
			return (
				<div className='flex flex-col items-center justify-center h-full gap-4 text-slate-200'>
					<Loader2 className='w-8 h-8 animate-spin text-emerald-400' />
					<span>Загружаем вложения…</span>
				</div>
			)
		}

		if (error) {
			return (
				<div className='flex flex-col items-center justify-center h-full gap-4 text-center text-red-300'>
					<AlertCircle className='w-10 h-10' />
					<div className='space-y-2'>
						<p className='text-lg font-semibold'>Не удалось загрузить вложения</p>
						<p className='text-sm opacity-80'>{error}</p>
					</div>
					<button
						onClick={() => fetchAttachments()}
						className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 transition-colors'
					>
						<RefreshCcw className='w-4 h-4' />
						<span>Повторить</span>
					</button>
				</div>
			)
		}

		if (attachments.length === 0) {
			return (
				<div className='flex flex-col items-center justify-center h-full gap-4 text-center text-slate-300'>
					<span className='text-5xl'>📭</span>
					<div className='space-y-1'>
						<p className='text-lg font-semibold'>Вложений не найдено</p>
						<p className='text-sm opacity-70'>
							Попробуйте изменить фильтр или отправьте файл в этот чат
						</p>
					</div>
				</div>
			)
		}

		return (
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-1'>
				{attachments.map(attachment => {
					const isImage = Boolean(attachment.thumbnailUrl)
					const formattedDate = DATE_FORMATTER.format(new Date(attachment.createdAt))

					return (
						<div
							key={attachment.messageId}
							className='group bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-3 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] transition-all duration-200'
						>
							<div className='relative w-full aspect-video rounded-xl overflow-hidden bg-slate-800/70 border border-slate-700/60 flex items-center justify-center'>
								{isImage && attachment.thumbnailUrl ? (
									<img
										src={attachment.thumbnailUrl}
										alt={attachment.fileName ?? 'Вложение'}
										className='object-cover w-full h-full transition-transform duration-200 group-hover:scale-[1.02]'
									/>
								) : (
									<div className='flex flex-col items-center justify-center text-slate-300 gap-2'>
										<FileText className='w-10 h-10 text-emerald-300/80' />
										<span className='text-xs opacity-80'>
											{attachment.mimeType ?? 'Файл'}
										</span>
									</div>
								)}
							</div>

							<div className='space-y-2 text-slate-200'>
								<div className='truncate text-sm font-semibold'>
									{attachment.fileName || 'Без названия'}
								</div>
								<div className='text-xs text-slate-400 flex items-center gap-2'>
									<span>{formatBytes(attachment.size)}</span>
									<span className='opacity-60'>•</span>
									<span>{formattedDate}</span>
								</div>
							</div>

							<div className='mt-auto flex items-center justify-between gap-2'>
								<button
									onClick={() => onLocateMessage?.(attachment.messageId)}
									className='flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 transition-colors text-sm'
								>
									<span className='text-base leading-none'>🔍</span>
									<span>К сообщению</span>
								</button>
								{attachment.downloadUrl ? (
									<a
										href={attachment.downloadUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:bg-slate-700/70 transition-colors text-sm'
									>
										<Download className='w-4 h-4' />
										<span>Скачать</span>
									</a>
								) : (
									<span className='text-xs text-slate-500 italic'>Ссылка недоступна</span>
								)}
							</div>
						</div>
					)
				})}
			</div>
		)
	}, [attachments, error, fetchAttachments, loading, onLocateMessage, token])

	if (!mounted || !isOpen) return null

	const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640

	return createPortal(
		<div
			className={`fixed inset-0 z-50 flex ${isMobileView ? 'items-end' : 'items-center justify-center'} bg-black/70 backdrop-blur-sm px-4 sm:px-6 ${isMobileView ? 'pb-0' : 'pb-6'} overflow-y-auto`}
			onClick={onClose}
		>
			<div
				className={`relative w-full ${isMobileView ? 'max-w-full h-[90vh] rounded-t-3xl' : 'max-w-5xl rounded-3xl'} bg-slate-950/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl ${isMobileView ? 'max-h-[90vh]' : 'max-h-[92vh]'} flex flex-col overflow-hidden mx-4`}
				onClick={event => event.stopPropagation()}
				style={{
					boxShadow: isMobileView 
						? '0 -10px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.1)'
						: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 30px rgba(16, 185, 129, 0.15)',
				}}
			>
				<header className='px-6 py-5 border-b border-emerald-500/20 flex items-start justify-between gap-4'>
					<div>
						<h2 className='text-2xl font-semibold text-emerald-300 flex items-center gap-3'>
							<span className='text-3xl'>📎</span>
							<span>Вложения чата</span>
						</h2>
						<p className='text-sm text-slate-300/80 mt-1 truncate'>
							{chatType === 'private' ? 'Приватный чат' : 'Чат задачи'} · {chatTitle}
						</p>
					</div>
					<button
						onClick={onClose}
						className='p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors'
						aria-label='Закрыть'
					>
						<X className='w-5 h-5' />
					</button>
				</header>

				<div className='px-6 pt-4 pb-2 border-b border-slate-800/50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between'>
					<div className='flex items-center gap-2 flex-wrap'>
						{TYPE_OPTIONS.map(option => (
							<button
								key={option.value}
								onClick={() => setTypeFilter(option.value)}
								className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
									typeFilter === option.value
										? 'bg-emerald-600/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
										: 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'
								}`}
							>
								{option.value === 'image' ? (
									<ImageIcon className='w-4 h-4' />
								) : option.value === 'doc' ? (
									<FileText className='w-4 h-4' />
								) : (
									<span className='text-base leading-none'>★</span>
								)}
								<span>{option.label}</span>
							</button>
						))}
					</div>

					<form onSubmit={handleSubmitSearch} className='flex items-center gap-2 w-full sm:w-auto'>
						<div className='relative flex-1 sm:w-64'>
							<input
								type='text'
								value={searchInput}
								onChange={event => setSearchInput(event.target.value)}
								placeholder='Поиск по имени файла...'
								className='w-full bg-slate-900/70 border border-slate-700/60 rounded-full py-2 pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:bg-slate-900/90 transition-colors'
							/>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70' />
							{searchInput && (
								<button
									type='button'
									className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white'
									onClick={() => {
										setSearchInput('')
										setAppliedSearch('')
									}}
									aria-label='Очистить поиск'
								>
									<X className='w-4 h-4' />
								</button>
							)}
						</div>
						<button
							type='submit'
							className='inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 transition-colors text-sm'
						>
							<Search className='w-4 h-4' />
							<span>Искать</span>
						</button>
						<button
							type='button'
							onClick={handleResetFilters}
							className='inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/40 border border-slate-700/60 text-slate-300 hover:bg-slate-800/60 transition-colors text-sm'
						>
							<RefreshCcw className='w-4 h-4' />
							<span>Сбросить</span>
						</button>
					</form>
				</div>

				<section className='flex-1 min-h-0 overflow-y-auto px-6 py-6 custom-scrollbar'>
					{content}
				</section>
			</div>
		</div>,
		document.body
	)
}

