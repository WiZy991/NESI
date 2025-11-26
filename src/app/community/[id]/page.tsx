'use client'

import EmojiPicker from '@/components/EmojiPicker'
import LoadingSpinner from '@/components/LoadingSpinner'
import ReportModal from '@/components/ReportModal'
import VideoPlayer from '@/components/VideoPlayer'
import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import {
	Check,
	Copy,
	Edit3,
	Flag,
	Flame,
	Heart,
	Home,
	Image,
	Loader2,
	MessageSquare,
	MoreHorizontal,
	Plus,
	Reply,
	Send,
	Smile,
	Trash2,
	User,
	UserCircle2,
	X,
	XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

// 🔧 Утилита для корректных ссылок на аватары
function resolveAvatarUrl(avatar?: string | null): string {
	if (!avatar) return '/default-avatar.png'
	if (!avatar.startsWith('http') && !avatar.startsWith('/'))
		return `/api/files/${avatar}`
	return avatar
}

function resolveMediaUrl(imageUrl?: string | null): string {
	if (!imageUrl) return ''
	// Если уже полный URL (http/https) или начинается с /uploads/, используем как есть
	if (
		imageUrl.startsWith('http://') ||
		imageUrl.startsWith('https://') ||
		imageUrl.startsWith('/uploads/')
	) {
		return imageUrl
	}
	// Если начинается с /api/files/, используем как есть
	if (imageUrl.startsWith('/api/files/')) {
		return imageUrl
	}
	// Если начинается с /, используем как есть
	if (imageUrl.startsWith('/')) {
		return imageUrl
	}
	// Иначе используем через /api/files/
	return `/api/files/${imageUrl}`
}

type PollOption = {
	id: string
	text: string
	order: number
	votes: number
}

type PollData = {
	options: PollOption[]
	totalVotes: number
	userVoteOptionId: string | null
}

type Post = {
	id: string
	title: string
	content: string
	imageUrl?: string | null
	mediaType?: string | null
	createdAt: string
	author: {
		id: string
		fullName: string | null
		email: string
		avatarUrl?: string | null
		avatarFileId?: string | null
	}
	comments: Comment[]
	_count: { likes: number }
	isPoll?: boolean
	poll?: PollData | null
}

type Comment = {
	id: string
	content: string
	createdAt: string
	parentId?: string | null
	author: {
		id: string
		fullName: string | null
		email: string
		avatarUrl?: string | null
		avatarFileId?: string | null
	}
}

// 🧩 Построение дерева комментариев
function buildTree(comments: Comment[]) {
	const byId = new Map<string, Comment & { children: Comment[] }>()
	const roots: (Comment & { children: Comment[] })[] = []
	comments.forEach(c => byId.set(c.id, { ...c, children: [] }))
	comments.forEach(c => {
		const node = byId.get(c.id)!
		if (c.parentId && byId.get(c.parentId))
			byId.get(c.parentId)!.children.push(node)
		else roots.push(node)
	})
	return roots
}

export default function CommunityPostPage() {
	const { user, token } = useUser()
	const { id } = useParams()
	const router = useRouter()
	const { confirm, Dialog } = useConfirm()

	const [post, setPost] = useState<Post | null>(null)
	const [loading, setLoading] = useState(true)
	const [commentText, setCommentText] = useState('')
	const [sending, setSending] = useState(false)
	const [liked, setLiked] = useState(false)
	const [openMenu, setOpenMenu] = useState<string | null>(null)
	const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({})
	const [replyText, setReplyText] = useState<Record<string, string>>({})
	const [reportTarget, setReportTarget] = useState<{
		type: 'post' | 'comment'
		id: string
	} | null>(null)
	const [commentFile, setCommentFile] = useState<File | null>(null)
	const [commentFilePreview, setCommentFilePreview] = useState<string>('')
	const [showEmojiPicker, setShowEmojiPicker] = useState(false)
	const [uploadingFile, setUploadingFile] = useState(false)
	const [isEditingPost, setIsEditingPost] = useState(false)
	const [editPostContent, setEditPostContent] = useState('')
	const [editPostTitle, setEditPostTitle] = useState('')
	const [savingPost, setSavingPost] = useState(false)
	const [isPostExpanded, setIsPostExpanded] = useState(false)
	const [pollData, setPollData] = useState<PollData | null>(null)
	const [pollVoteLoading, setPollVoteLoading] = useState<string | null>(null)

	// Закрытие меню при клике вне его
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (openMenu && !(e.target as Element).closest('[data-menu-container]')) {
				setOpenMenu(null)
			}
		}
		if (openMenu) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [openMenu])

	const fetchPost = async () => {
		try {
			const res = await fetch(`/api/community/${id}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				cache: 'no-store',
			})
			const data = await res.json()
			setPost(data.post)
			setPollData(data.post?.poll ?? null)
			setLiked(data.liked || false)
		} catch (err) {
			console.error('Ошибка загрузки поста:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchPost()
	}, [id])

	// 🔦 Автоматическая прокрутка и подсветка комментария при переходе из админки
	useEffect(() => {
		if (!post) return

		const hash = typeof window !== 'undefined' ? window.location.hash : ''
		if (!hash.startsWith('#comment-')) return

		const commentId = hash.replace('#comment-', '')

		// немного подождем пока DOM нарисуется
		setTimeout(() => {
			const el = document.getElementById(`comment-${commentId}`)
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' })
				el.classList.add(
					'ring-2',
					'ring-emerald-400',
					'ring-offset-2',
					'ring-offset-transparent'
				)
				setTimeout(() => {
					el.classList.remove(
						'ring-2',
						'ring-emerald-400',
						'ring-offset-2',
						'ring-offset-transparent'
					)
				}, 3000)
			}
		}, 400)
	}, [post])

	const tree = useMemo(
		() => (post ? buildTree(post.comments || []) : []),
		[post]
	)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			// Проверяем тип файла (только изображения)
			const isImage = file.type.startsWith('image/')
			if (!isImage) {
				alert('Можно загружать только изображения (JPG, PNG, GIF, WEBP)')
				e.target.value = '' // Очищаем input
				return
			}

			// Проверяем размер (максимум 5MB для изображений в комментариях)
			const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
			if (file.size > MAX_IMAGE_SIZE) {
				alert(
					`Файл слишком большой. Максимум ${MAX_IMAGE_SIZE / 1024 / 1024} MB`
				)
				e.target.value = '' // Очищаем input
				return
			}

			setCommentFile(file)

			// Создаём превью
			const reader = new FileReader()
			reader.onloadend = () => {
				setCommentFilePreview(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const uploadFile = async (file: File): Promise<string | null> => {
		try {
			setUploadingFile(true)
			const formData = new FormData()
			formData.append('file', file)

			const res = await fetch('/api/upload/chat-file', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			if (!res.ok) {
				const error = await res.json().catch(() => ({}))
				const errorMessage =
					error.error ||
					`Ошибка загрузки файла: ${res.status} ${res.statusText}`
				console.error('Ошибка загрузки файла:', error)
				alert(errorMessage)
				return null
			}

			const data = await res.json()
			// API возвращает url, но может быть и id
			const fileUrl = data.url || `/api/files/${data.id}`
			return fileUrl
		} catch (err: any) {
			console.error('Ошибка загрузки файла:', err)
			alert('Ошибка загрузки файла: ' + (err?.message || 'Неизвестная ошибка'))
			return null
		} finally {
			setUploadingFile(false)
		}
	}

	const sendComment = async () => {
		if (!token) {
			alert('Чтобы оставить комментарий, войдите в аккаунт.')
			router.push('/login')
			return
		}
		if (!commentText.trim() && !commentFile) return

		setSending(true)
		try {
			let imageUrl: string | null = null
			let mediaType: string = 'image'

			// Загружаем файл если есть
			if (commentFile) {
				imageUrl = await uploadFile(commentFile)
				if (!imageUrl) {
					setSending(false)
					return
				}

				// Определяем тип медиа
				const isVideo = commentFile.type.startsWith('video/')
				const isGif = commentFile.type === 'image/gif'
				mediaType = isVideo ? 'video' : 'image'
			}

			const body: any = {}
			if (commentText.trim()) {
				body.content = commentText.trim()
			}
			if (imageUrl) {
				body.imageUrl = imageUrl
				body.mediaType = mediaType
			}

			const res = await fetch(`/api/community/${id}/comment`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			})

			if (res.ok) {
				setCommentText('')
				setCommentFile(null)
				setCommentFilePreview('')
				fetchPost()
			} else {
				const error = await res.json().catch(() => ({}))
				const errorMessage =
					error.error ||
					error.details ||
					`Ошибка отправки: ${res.status} ${res.statusText}`
				console.error('Ошибка отправки комментария:', error)
				alert(errorMessage)
			}
		} catch (err: any) {
			console.error('Ошибка комментария:', err)
			alert(
				'Ошибка отправки комментария: ' + (err?.message || 'Неизвестная ошибка')
			)
		} finally {
			setSending(false)
		}
	}

	const insertEmoji = (emoji: string) => {
		setCommentText(prev => prev + emoji)
	}

	const sendReply = async (parentId: string) => {
		const text = replyText[parentId]?.trim()
		if (!text) {
			toast.error('Введите текст ответа')
			return
		}
		
		if (!token) {
			toast.error('Необходимо авторизоваться')
			return
		}
		
		try {
			console.log('Отправка ответа на комментарий:', { parentId, text: text.substring(0, 50), postId: id })
			
			const requestBody = { content: text, parentId }
			console.log('Тело запроса:', requestBody)
			
			const res = await fetch(`/api/community/${id}/comment`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(requestBody),
			})
			
			const responseData = await res.json().catch(() => ({}))
			console.log('Ответ сервера:', { status: res.status, ok: res.ok, data: responseData })
			
			if (res.ok) {
				// Очищаем поле только после успешной отправки
				setReplyText(s => ({ ...s, [parentId]: '' }))
				setReplyOpen(s => ({ ...s, [parentId]: false }))
				fetchPost()
				toast.success('Ответ отправлен')
			} else {
				let errorMessage = `Ошибка ${res.status}: ${res.statusText}`
				if (responseData && typeof responseData === 'object') {
					if (typeof responseData.error === 'string') {
						errorMessage = responseData.error
					} else if (responseData.error && typeof responseData.error === 'object') {
						errorMessage = JSON.stringify(responseData.error)
					} else if (Array.isArray(responseData.errors)) {
						errorMessage = responseData.errors.join(', ')
					}
				} else if (typeof responseData === 'string') {
					errorMessage = responseData
				}
				toast.error(errorMessage)
				console.error('Ошибка отправки ответа:', { status: res.status, responseData, error: responseData?.error })
			}
		} catch (e: any) {
			console.error('Ошибка ответа на комментарий:', e)
			let errorMsg = 'Ошибка сети при отправке ответа'
			if (e?.message) {
				errorMsg = e.message
			} else if (typeof e === 'string') {
				errorMsg = e
			} else if (e && typeof e === 'object') {
				if (e.error) {
					errorMsg = typeof e.error === 'string' ? e.error : JSON.stringify(e.error)
				} else {
					errorMsg = JSON.stringify(e)
				}
			}
			toast.error(errorMsg)
		}
	}

	const toggleLike = async () => {
		try {
			const res = await fetch(`/api/community/${id}/like`, {
				method: 'POST',
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
			if (res.ok) {
				const data = await res.json()
				setLiked(data.liked)
				fetchPost()
			}
		} catch (err) {
			console.error('Ошибка лайка:', err)
		}
	}

	const renderPoll = () => {
		if (!post?.isPoll || !pollData) return null
		const options = [...pollData.options].sort(
			(a, b) => (a.order ?? 0) - (b.order ?? 0)
		)
		const totalVotes =
			pollData.totalVotes ??
			options.reduce((sum, option) => sum + (option.votes || 0), 0)

		return (
			<div className='mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3'>
				<div className='flex items-center justify-between'>
					<h3 className='text-base font-semibold text-emerald-300'>Опрос</h3>
					<span className='text-xs text-gray-400'>
						{totalVotes > 0
							? `Всего голосов: ${totalVotes}`
							: 'Голосов пока нет'}
					</span>
				</div>
				<div className='space-y-2'>
					{options.map(option => {
						const votes = option.votes || 0
						const percentage =
							totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
						const isSelected = pollData.userVoteOptionId === option.id
						const isDisabled =
							!token || (pollVoteLoading && pollVoteLoading !== option.id)

						return (
							<button
								key={option.id}
								type='button'
								onClick={() => handlePollVote(option.id)}
								disabled={isDisabled}
								className={`w-full text-left px-4 py-3 rounded-lg border transition ${
									isSelected
										? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
										: 'border-gray-700 hover:border-emerald-500/40 hover:bg-gray-900/60 text-gray-200'
								} ${!token ? 'opacity-60 cursor-not-allowed' : ''}`}
							>
								<div className='flex items-center justify-between text-sm'>
									<span className='font-medium'>{option.text}</span>
									<span className='text-xs text-gray-400'>
										{pollVoteLoading === option.id
											? '…'
											: `${percentage}% • ${votes}`}
									</span>
								</div>
								<div className='mt-2 h-2 bg-gray-800 rounded-full overflow-hidden'>
									<div
										className={`h-full rounded-full ${
											isSelected ? 'bg-emerald-400' : 'bg-emerald-600/50'
										}`}
										style={{ width: `${percentage}%` }}
									/>
								</div>
							</button>
						)
					})}
				</div>
				<p className='text-xs text-gray-500'>
					{token
						? pollData.userVoteOptionId
							? 'Вы можете изменить свой выбор, нажав на другой вариант.'
							: 'Выберите вариант, чтобы проголосовать.'
						: 'Авторизуйтесь, чтобы проголосовать в опросе.'}
				</p>
			</div>
		)
	}

	const handlePollVote = async (optionId: string) => {
		if (!token) {
			alert('Чтобы проголосовать, войдите в аккаунт.')
			return
		}
		if (pollVoteLoading) return

		setPollVoteLoading(optionId)
		try {
			const res = await fetch(`/api/community/${id}/poll`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ optionId }),
			})
			if (res.ok) {
				const data = await res.json().catch(() => ({}))
				if (data?.poll) {
					setPollData(data.poll)
				}
			} else {
				const error = await res.json().catch(() => ({}))
				alert(error.error || 'Не удалось проголосовать')
			}
		} catch (err) {
			console.error('Ошибка голосования:', err)
			alert('Во время голосования произошла ошибка')
		} finally {
			setPollVoteLoading(null)
		}
	}

	const copyLink = (link: string) => {
		navigator.clipboard.writeText(link)
		alert('📋 Ссылка скопирована!')
	}

	const deleteItem = async (endpoint: string) => {
		await confirm({
			title: 'Удаление поста',
			message: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				const res = await fetch(endpoint, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					toast.success('Пост удалён')
					router.push('/community')
				} else {
					toast.error('Ошибка при удалении поста')
				}
			},
		})
	}

	const startEditingPost = () => {
		if (!post) return
		setEditPostContent(post.content)
		setEditPostTitle(post.title || '')
		setIsEditingPost(true)
		setOpenMenu(null)
	}

	const savePostEdit = async () => {
		if (!editPostContent.trim() && !editPostTitle.trim()) {
			alert('Пост не может быть пустым')
			return
		}

		setSavingPost(true)
		try {
			const res = await fetch(`/api/community/${id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					content: editPostContent.trim(),
					title: editPostTitle.trim(),
				}),
			})

			if (res.ok) {
				setIsEditingPost(false)
				fetchPost()
				alert('✅ Пост обновлён')
			} else {
				const error = await res.json().catch(() => ({}))
				alert('Ошибка сохранения: ' + (error.error || res.statusText))
			}
		} catch (err) {
			alert('Ошибка сети при сохранении поста')
			console.error(err)
		} finally {
			setSavingPost(false)
		}
	}

	const cancelPostEdit = () => {
		setIsEditingPost(false)
		setEditPostContent('')
		setEditPostTitle('')
	}

	if (loading) return <LoadingSpinner />
	if (!post)
		return (
			<p className='text-center text-gray-400 mt-20 text-lg'>
				Пост не найден 😕
			</p>
		)

	return (
		<div className='min-h-screen text-white'>
			{reportTarget && (
				<ReportModal
					target={reportTarget}
					onClose={() => setReportTarget(null)}
				/>
			)}

			<div className='max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-6 py-8'>
				{/* ЛЕВАЯ КОЛОНКА */}
				<aside className='hidden lg:flex flex-col w-60 border-r border-gray-800 pr-4'>
					<h2 className='text-sm text-gray-400 uppercase mb-4'>РАЗДЕЛЫ</h2>
					<nav className='flex flex-col gap-2 text-sm'>
						<Link
							href='/community'
							className='flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600/20 text-emerald-300'
						>
							<Home className='w-4 h-4' /> Новые
						</Link>
						<Link
							href='/community?sort=popular'
							className='flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition'
						>
							<Flame className='w-4 h-4' /> Популярные
						</Link>
						{user && (
							<Link
								href='/community?filter=my'
								className='flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition'
							>
								<User className='w-4 h-4' /> Мои темы
							</Link>
						)}
						<Link
							href='/community/new'
							className='flex items-center gap-2 px-3 py-2 mt-4 rounded-md bg-emerald-600 hover:bg-emerald-700 justify-center font-medium transition'
						>
							<Plus className='w-4 h-4' /> Создать тему
						</Link>
					</nav>
					<div className='mt-10 border-t border-gray-800 pt-4 text-xs text-gray-500 space-y-1'>
						<p>NESI Community © 🌿{new Date().getFullYear()}</p>
					</div>
				</aside>

				{/* ОСНОВНОЙ КОНТЕНТ */}
				<main className='flex-1 max-w-3xl mx-auto space-y-10'>
					<article className='p-6 rounded-2xl border border-gray-800 bg-transparent shadow-[0_0_25px_rgba(0,255,180,0.05)] relative'>
						<header className='flex items-center justify-between mb-4'>
							<Link
								href={`/users/${post.author.id}`}
								className='group flex items-center gap-3 hover:bg-emerald-900/10 p-2 rounded-lg border border-transparent hover:border-emerald-500/30 transition'
							>
								{post.author.avatarFileId || post.author.avatarUrl ? (
									<img
										src={resolveAvatarUrl(
											post.author.avatarFileId || post.author.avatarUrl
										)}
										alt='avatar'
										className='w-12 h-12 rounded-full object-cover border border-emerald-700/40'
									/>
								) : (
									<UserCircle2 className='w-12 h-12 text-emerald-400 group-hover:text-emerald-300 transition' />
								)}
								<div>
									<h2 className='text-emerald-300 font-semibold group-hover:text-emerald-400 transition'>
										{post.author.fullName || post.author.email}
									</h2>
									<p className='text-xs text-gray-500'>
										{new Date(post.createdAt).toLocaleString('ru-RU', {
											day: '2-digit',
											month: 'long',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</p>
								</div>
							</Link>

							{/* Меню */}
							<div className='relative' data-menu-container>
								<button
									onClick={e => {
										e.stopPropagation()
										setOpenMenu(openMenu === post.id ? null : post.id)
									}}
									className='p-1 hover:text-emerald-400'
								>
									<MoreHorizontal className='w-5 h-5' />
								</button>
								{openMenu === post.id && (
									<>
										{/* Overlay для закрытия меню */}
										<div 
											className='fixed inset-0 z-[9997]'
											onClick={() => setOpenMenu(null)}
										/>
										<div
											className='absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9998]'
											onClick={e => e.stopPropagation()}
										>
										<button
											onClick={() => {
												copyLink(window.location.href)
												setOpenMenu(null)
											}}
											className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full'
										>
											<Copy className='w-4 h-4' /> Копировать ссылку
										</button>
										<button
											onClick={() => {
												setReportTarget({ type: 'post', id: post.id })
												setOpenMenu(null)
											}}
											className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-red-400 w-full'
										>
											<Flag className='w-4 h-4' /> Пожаловаться
										</button>
										{user?.id === post.author.id && (
											<>
												<button
													onClick={() => {
														startEditingPost()
														setOpenMenu(null)
													}}
													className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-emerald-400 transition w-full'
												>
													<Edit3 className='w-4 h-4' /> Редактировать
												</button>
												<button
													onClick={() => {
														deleteItem(`/api/community/${post.id}`)
														setOpenMenu(null)
													}}
													className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-pink-400 w-full'
												>
													<Trash2 className='w-4 h-4' /> Удалить
												</button>
											</>
										)}
										</div>
									</>
								)}
							</div>
						</header>

						{isEditingPost ? (
							<div className='space-y-4'>
								<div>
									<label className='block text-sm font-medium text-gray-400 mb-2'>
										Заголовок (необязательно)
									</label>
									<input
										type='text'
										value={editPostTitle}
										onChange={e => setEditPostTitle(e.target.value)}
										placeholder='Заголовок поста...'
										className='w-full px-4 py-2 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-400 mb-2'>
										Содержание
									</label>
									<textarea
										value={editPostContent}
										onChange={e => setEditPostContent(e.target.value)}
										rows={8}
										placeholder='Содержание поста...'
										className='w-full px-4 py-2 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition resize-y'
									/>
								</div>
								<div className='flex gap-2'>
									<button
										onClick={savePostEdit}
										disabled={savingPost}
										className='flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
									>
										{savingPost ? (
											<Loader2 className='w-4 h-4 animate-spin' />
										) : (
											<Check className='w-4 h-4' />
										)}
										Сохранить
									</button>
									<button
										onClick={cancelPostEdit}
										disabled={savingPost}
										className='flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
									>
										<X className='w-4 h-4' />
										Отмена
									</button>
								</div>
							</div>
						) : (
							<>
								{post.title && (
									<h1 className='text-2xl font-bold text-emerald-400 mb-3'>
										{post.title}
									</h1>
								)}
								<div>
									<p
										className={`text-gray-200 leading-relaxed whitespace-pre-wrap break-words ${
											!isPostExpanded && post.content.length > 500
												? 'line-clamp-8'
												: ''
										}`}
									>
										{post.content}
									</p>
									{post.content.length > 500 && (
										<button
											onClick={() => setIsPostExpanded(!isPostExpanded)}
											className='text-emerald-400 hover:text-emerald-300 text-sm mt-2 font-medium transition'
										>
											{isPostExpanded ? 'Свернуть' : 'Развернуть'}
										</button>
									)}
								</div>
							</>
						)}

						{!isEditingPost && renderPoll()}

						{post.imageUrl &&
							(() => {
								// Определяем тип медиа
								const isVideo =
									post.mediaType === 'video' ||
									(post.imageUrl &&
										/\.(mp4|webm|mov|avi|mkv)$/i.test(post.imageUrl))
								return (
									<div
										className='mt-4 w-full h-[400px] overflow-hidden rounded-xl border border-gray-800'
										onClick={e => e.stopPropagation()}
									>
										{isVideo ? (
											<VideoPlayer
												src={post.imageUrl}
												className='w-full h-full'
												onError={e => {
													console.error('Ошибка загрузки видео:', post.imageUrl)
													if (e.currentTarget) {
														e.currentTarget.style.display = 'none'
													}
												}}
											/>
										) : (
											<img
												src={post.imageUrl}
												alt='post'
												className='w-full h-full object-contain object-center'
												loading='lazy'
												onError={e => {
													console.error(
														'Ошибка загрузки изображения:',
														post.imageUrl
													)
													e.currentTarget.style.display = 'none'
												}}
											/>
										)}
									</div>
								)
							})()}

						<footer className='mt-6 flex items-center gap-4 text-sm'>
							<button
								onClick={toggleLike}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
									liked
										? 'bg-pink-600 border-pink-500 text-white'
										: 'border-pink-500/40 text-gray-300 hover:bg-pink-700/20'
								}`}
							>
								<Heart
									className={`w-4 h-4 ${
										liked ? 'fill-pink-500 text-pink-500' : 'text-pink-400'
									}`}
								/>
								{post._count.likes}
							</button>

							<div className='flex items-center gap-2 text-gray-400'>
								<MessageSquare className='w-4 h-4' />
								{post.comments.length}
							</div>
						</footer>
					</article>

					{/* Комментарии */}
					<section>
						<h2 className='text-2xl font-semibold text-emerald-400 mb-5 flex items-center gap-2'>
							💬 Комментарии
						</h2>
						{tree.length === 0 ? (
							<p className='text-gray-500 text-center py-8 border border-gray-800 rounded-lg bg-transparent'>
								Комментариев пока нет. Будь первым!
							</p>
						) : (
							<div className='space-y-4'>
								{tree.map(root => (
									<CommentNode
										key={root.id}
										node={root}
										depth={0}
										userId={user?.id}
										token={token}
										fetchPost={fetchPost}
										replyOpen={replyOpen}
										setReplyOpen={setReplyOpen}
										replyText={replyText}
										setReplyText={setReplyText}
										sendReply={sendReply}
										postId={id}
										onReport={setReportTarget}
									/>
								))}
							</div>
						)}

						{user ? (
							<div className='mt-8 border-t border-gray-800 pt-6'>
								<h3 className='text-lg font-semibold text-emerald-300 mb-3'>
									Добавить комментарий
								</h3>

								{/* Превью файла */}
								{commentFilePreview && (
									<div className='mb-3 relative inline-block'>
										<img
											src={commentFilePreview}
											alt='Preview'
											className='max-w-xs max-h-48 rounded-lg border border-gray-700'
										/>
										<button
											onClick={() => {
												setCommentFile(null)
												setCommentFilePreview('')
											}}
											className='absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition'
										>
											<XCircle className='w-4 h-4' />
										</button>
									</div>
								)}

								<div className='relative'>
									<textarea
										value={commentText}
										onChange={e => setCommentText(e.target.value)}
										rows={3}
										placeholder='Напиши что-нибудь...'
										className='w-full p-3 pr-20 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition'
									/>

									{/* Кнопки действий */}
									<div className='absolute bottom-3 right-3 flex items-center gap-2'>
										<label className='cursor-pointer p-1.5 hover:bg-emerald-500/20 rounded transition'>
											<Image className='w-4 h-4 text-gray-400 hover:text-emerald-400' />
											<input
												type='file'
												accept='image/*'
												onChange={handleFileChange}
												className='hidden'
											/>
										</label>
										<div className='relative'>
											<button
												onClick={e => {
													e.stopPropagation()
													setShowEmojiPicker(!showEmojiPicker)
												}}
												className={`p-1.5 hover:bg-emerald-500/20 rounded transition ${
													showEmojiPicker ? 'bg-emerald-500/20' : ''
												}`}
											>
												<Smile className='w-4 h-4 text-gray-400 hover:text-emerald-400' />
											</button>
											{showEmojiPicker && (
												<EmojiPicker
													onSelect={insertEmoji}
													onClose={() => setShowEmojiPicker(false)}
													position='top'
												/>
											)}
										</div>
									</div>
								</div>

								<button
									onClick={sendComment}
									disabled={
										sending ||
										uploadingFile ||
										(!commentText.trim() && !commentFile)
									}
									className='mt-3 flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
								>
									{sending || uploadingFile ? (
										<Loader2 className='w-5 h-5 animate-spin' />
									) : (
										<Send className='w-5 h-5' />
									)}
									{uploadingFile
										? 'Загрузка...'
										: sending
										? 'Отправка...'
										: 'Отправить'}
								</button>
							</div>
						) : (
							<div className='mt-8 border-t border-gray-800 pt-6'>
								<div className='text-center py-6 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30'>
									<p className='text-gray-300 mb-3'>
										Чтобы оставить комментарий, войдите в аккаунт
									</p>
									<button
										onClick={() => router.push('/login')}
										className='px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition'
									>
										Войти
									</button>
								</div>
							</div>
						)}
					</section>
				</main>
			</div>
			{Dialog}
		</div>
	)
}

// 🗨️ Компонент комментария
function CommentNode({
	node,
	depth,
	userId,
	token,
	fetchPost,
	replyOpen,
	setReplyOpen,
	replyText,
	setReplyText,
	sendReply,
	postId,
	onReport,
}: any) {
	const [openMenu, setOpenMenu] = useState(false)
	const [editing, setEditing] = useState(false)
	const [editText, setEditText] = useState(node.content)
	const time = new Date(node.createdAt).toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	})

	// Закрытие меню при клике вне его
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (openMenu && !(e.target as Element).closest('[data-menu-container]')) {
				setOpenMenu(false)
			}
		}
		if (openMenu) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [openMenu])

	const saveEdit = async () => {
		try {
			const res = await fetch(`/api/community/${postId}/comment/${node.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ content: editText }),
			})
			if (res.ok) {
				setEditing(false)
				fetchPost()
			} else {
				const err = await res.json().catch(() => ({}))
				alert('Ошибка сохранения: ' + (err.error || res.statusText))
			}
		} catch (e) {
			alert('Ошибка сети при сохранении комментария')
		}
	}

	const deleteComment = async () => {
		if (!token) {
			toast.error('Необходимо авторизоваться')
			return
		}
		
		const confirmed = await confirm({
			title: 'Удаление комментария',
			message: 'Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить.',
			type: 'danger',
			confirmText: 'Удалить',
			cancelText: 'Отмена',
			onConfirm: async () => {
				const res = await fetch(`/api/community/${postId}/comment/${node.id}`, {
					method: 'DELETE',
					headers: { 
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})
				
				if (!res.ok) {
					const responseData = await res.json().catch(() => ({}))
					const errorMessage = typeof responseData?.error === 'string' 
						? responseData.error 
						: 'Ошибка при удалении комментария'
					toast.error(errorMessage)
					throw new Error(errorMessage)
				}
				
				toast.success('Комментарий удалён')
				fetchPost()
			},
		})
		
		// Если пользователь отменил, ничего не делаем
		if (!confirmed) return
	}

	return (
		<div>
			<div
				id={`comment-${node.id}`}
				className='p-2.5 sm:p-3 rounded-lg border bg-gray-900/40 border-gray-800/50 hover:border-emerald-500/30 transition-all relative group'
				style={{
					marginLeft: depth ? depth * 16 : 0,
				}}
			>
				<div className='flex items-start gap-2.5 mb-1.5'>
					<div className='flex-shrink-0'>
						{node.author.avatarFileId || node.author.avatarUrl ? (
							<img
								src={resolveAvatarUrl(
									node.author.avatarFileId || node.author.avatarUrl
								)}
								alt='avatar'
								className='w-7 h-7 rounded-full object-cover border border-gray-700'
							/>
						) : (
							<User className='w-7 h-7 text-emerald-400 opacity-70' />
						)}
					</div>
					<div className='flex-1 min-w-0'>
						<div className='flex items-center justify-between gap-2 mb-0.5'>
							<div className='flex items-center gap-2 min-w-0'>
								<Link
									href={`/users/${node.author.id}`}
									className='font-medium text-sm text-emerald-300 hover:text-emerald-400 transition truncate'
								>
									{node.author.fullName || node.author.email}
								</Link>
								<span className='text-xs text-gray-500 flex-shrink-0'>
									{time}
								</span>
							</div>

							<div className='relative flex-shrink-0' data-menu-container>
								<button
									onClick={e => {
										e.stopPropagation()
										setOpenMenu(!openMenu)
									}}
									className='hover:text-emerald-400'
								>
									<MoreHorizontal className='w-4 h-4' />
								</button>

								{openMenu && (
									<>
										{/* Overlay для закрытия меню */}
										<div 
											className='fixed inset-0 z-[9997]'
											onClick={() => setOpenMenu(false)}
										/>
										<div
											className='absolute right-0 top-full mt-6 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9998]'
											onClick={e => e.stopPropagation()}
										>
											<button
												onClick={() => {
													navigator.clipboard.writeText(
														window.location.href + '#' + node.id
													)
													setOpenMenu(false)
												}}
												className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full'
											>
												<Copy className='w-4 h-4' /> Копировать ссылку
											</button>
											{userId === node.author.id ? (
												<>
													<button
														onClick={() => {
															setEditing(true)
															setOpenMenu(false)
														}}
														className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-emerald-400 transition w-full'
													>
														<Edit3 className='w-4 h-4' /> Редактировать
													</button>
													<button
														onClick={() => {
															deleteComment()
															setOpenMenu(false)
														}}
														className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-pink-400 w-full'
													>
														<Trash2 className='w-4 h-4' /> Удалить
													</button>
												</>
											) : (
												<button
													onClick={() => {
														onReport({ type: 'comment', id: node.id })
														setOpenMenu(false)
													}}
													className='flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-red-400 w-full'
												>
													<Flag className='w-4 h-4' /> Пожаловаться
												</button>
											)}
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{editing ? (
					<div className='space-y-2 mt-2'>
						<textarea
							value={editText}
							onChange={e => setEditText(e.target.value)}
							rows={3}
							className='w-full px-4 py-2 rounded-lg bg-black/60 border border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition resize-y'
						/>
						<div className='flex gap-2'>
							<button
								onClick={saveEdit}
								className='flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
							>
								<Check className='w-4 h-4' />
								Сохранить
							</button>
							<button
								onClick={() => setEditing(false)}
								className='flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 font-semibold transition'
							>
								<X className='w-4 h-4' />
								Отмена
							</button>
						</div>
					</div>
				) : (
					<div className='space-y-1.5 mt-1'>
						{node.content && (
							<p className='text-sm text-gray-300 whitespace-pre-wrap leading-relaxed'>
								{node.content}
							</p>
						)}
						{node.imageUrl && (
							<div className='mt-1.5'>
								{node.mediaType === 'video' ? (
									<VideoPlayer
										src={resolveMediaUrl(node.imageUrl)}
										className='max-w-xs rounded-md border border-gray-700/50'
										onError={e => {
											console.error(
												'Ошибка загрузки видео в комментарии:',
												node.imageUrl,
												resolveMediaUrl(node.imageUrl)
											)
											if (e.currentTarget) {
												e.currentTarget.style.display = 'none'
											}
										}}
									/>
								) : (
									<img
										src={resolveMediaUrl(node.imageUrl)}
										alt='Comment media'
										className='max-w-[200px] sm:max-w-xs max-h-48 rounded-md border border-gray-700/50 object-contain cursor-pointer hover:opacity-90 transition'
										onError={e => {
											console.error(
												'Ошибка загрузки изображения в комментарии:',
												node.imageUrl,
												'Resolved URL:',
												resolveMediaUrl(node.imageUrl)
											)
											e.currentTarget.style.display = 'none'
										}}
									/>
								)}
							</div>
						)}
					</div>
				)}

				{/* Кнопка ответа */}
				<div className='mt-1.5 flex items-center gap-3'>
					<button
						className='text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1'
						onClick={() =>
							setReplyOpen((s: any) => ({
								...s,
								[node.id]: !s[node.id],
							}))
						}
					>
						<Reply className='w-3.5 h-3.5' />
						Ответить
					</button>
				</div>

				{replyOpen[node.id] && (
					<div className='mt-2 pt-2 border-t border-gray-800/50'>
						<textarea
							value={replyText[node.id] || ''}
							onChange={e =>
								setReplyText((s: any) => ({
									...s,
									[node.id]: e.target.value,
								}))
							}
							rows={2}
							placeholder='Ваш ответ…'
							className='w-full p-2 text-sm rounded-lg bg-black/40 border border-gray-700/50 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition'
						/>
						<div className='mt-2'>
							<button
								type='button'
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									sendReply(node.id)
								}}
								disabled={!replyText[node.id]?.trim()}
								className='flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all'
							>
								<Send className='w-4 h-4' /> Отправить ответ
							</button>
						</div>
					</div>
				)}
			</div>

			{node.children?.length > 0 &&
				node.children.map((child: any) => (
					<CommentNode
						key={child.id}
						node={{ ...child, children: (child as any).children || [] }}
						depth={Math.min(depth + 1, 6)}
						userId={userId}
						token={token}
						fetchPost={fetchPost}
						replyOpen={replyOpen}
						setReplyOpen={setReplyOpen}
						replyText={replyText}
						setReplyText={setReplyText}
						sendReply={sendReply}
						postId={postId}
						onReport={onReport}
					/>
				))}
		</div>
	)
}
