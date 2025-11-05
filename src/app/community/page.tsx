'use client'

import LoadingSpinner from '@/components/LoadingSpinner'
import ReportModal from '@/components/ReportModal'
import { useUser } from '@/context/UserContext'
import {
	Compass,
	Flame,
	Heart,
	Home,
	MessageSquare,
	MoreHorizontal,
	Plus,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/* ===============================
   🔧 Утилита для корректных аватаров
=============================== */
function resolveAvatarUrl(avatar?: string | null) {
	if (!avatar) return null
	if (!avatar.startsWith('http') && !avatar.startsWith('/'))
		return `/api/files/${avatar}`
	return avatar
}

/* ===============================
   📄 Основная страница Community
=============================== */
export default function CommunityPage() {
	const { user, token } = useUser()
	const router = useRouter()
	const [posts, setPosts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState<'new' | 'popular' | 'my'>('new')
	const [likeLoading, setLikeLoading] = useState<string | null>(null)
	const [openMenu, setOpenMenu] = useState<string | null>(null)
	const [reportTarget, setReportTarget] = useState<{
		type: 'post'
		id: string
	} | null>(null)

	// загрузка фильтра из URL
	useEffect(() => {
		if (typeof window === 'undefined') return
		const params = new URLSearchParams(window.location.search)
		if (params.get('sort') === 'popular') setFilter('popular')
		else if (params.get('filter') === 'my') setFilter('my')
		else setFilter('new')
	}, [])

	// загрузка постов
	useEffect(() => {
		const fetchPosts = async () => {
			try {
				const res = await fetch('/api/community', { cache: 'no-store' })
				const data = await res.json()
				setPosts(data.posts || [])
			} catch (err) {
				console.error('Ошибка загрузки постов:', err)
			} finally {
				setLoading(false)
			}
		}
		fetchPosts()
	}, [])

	// изменение фильтра с обновлением URL
	const changeFilter = (type: 'new' | 'popular' | 'my') => {
		setFilter(type)
		if (type === 'popular') router.push('/community?sort=popular')
		else if (type === 'my') router.push('/community?filter=my')
		else router.push('/community')
	}

	if (loading) return <LoadingSpinner />

	// фильтрация постов
	const filtered =
		filter === 'my'
			? posts.filter(p => p.author.id === user?.id)
			: filter === 'popular'
			? [...posts].sort(
					(a, b) =>
						b._count.likes +
						b._count.comments -
						(a._count.likes + a._count.comments)
			  )
			: [...posts].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			  )

	// топ 5 постов справа
	const topPosts = [...posts]
		.sort(
			(a, b) =>
				b._count.comments +
				b._count.likes -
				(a._count.comments + a._count.likes)
		)
		.slice(0, 5)

	// лайк
	const toggleLike = async (postId: string) => {
		if (!token) return
		setLikeLoading(postId)
		try {
			const res = await fetch(`/api/community/${postId}/like`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setPosts(prev =>
					prev.map(p =>
						p.id === postId
							? {
									...p,
									liked: data.liked,
									_count: {
										...p._count,
										likes: data.liked ? p._count.likes + 1 : p._count.likes - 1,
									},
							  }
							: p
					)
				)
			}
		} catch (err) {
			console.error('Ошибка лайка:', err)
		} finally {
			setLikeLoading(null)
		}
	}

	// копировать ссылку
	const copyLink = (id: string) => {
		navigator.clipboard.writeText(`${window.location.origin}/community/${id}`)
		alert('📋 Ссылка на пост скопирована!')
	}

	// удаление поста
	const deletePost = async (id: string) => {
		if (!confirm('Удалить этот пост?')) return
		try {
			const res = await fetch(`/api/community/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})
			if (res.ok) {
				setPosts(prev => prev.filter(p => p.id !== id))
				alert('✅ Пост удалён')
			} else {
				const err = await res.json().catch(() => ({}))
				alert('Ошибка удаления: ' + (err.error || res.statusText))
			}
		} catch (e) {
			alert('Ошибка сети при удалении поста')
			console.error(e)
		}
	}

	return (
		<div className='min-h-screen text-white'>
			<div className='max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 px-3 sm:px-6 py-6 sm:py-8'>
				{/* ЛЕВАЯ КОЛОНКА - боковая панель фильтров (десктоп) */}
				<aside className='hidden lg:flex flex-col w-60 border-r border-gray-800 pr-4'>
					<h2 className='text-sm text-gray-400 uppercase mb-4'>РАЗДЕЛЫ</h2>
					<nav className='flex flex-col gap-2 text-sm'>
						<button
							onClick={() => changeFilter('new')}
							className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
								filter === 'new'
									? 'bg-emerald-600/20 text-emerald-300'
									: 'text-gray-400 hover:text-white hover:bg-gray-800/50'
							}`}
						>
							<Home className='w-4 h-4' /> Новые
						</button>

						<button
							onClick={() => changeFilter('popular')}
							className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
								filter === 'popular'
									? 'bg-emerald-600/20 text-emerald-300'
									: 'text-gray-400 hover:text-white hover:bg-gray-800/50'
							}`}
						>
							<Flame className='w-4 h-4' /> Популярные
						</button>

						{user && (
							<button
								onClick={() => changeFilter('my')}
								className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
									filter === 'my'
										? 'bg-emerald-600/20 text-emerald-300'
										: 'text-gray-400 hover:text-white hover:bg-gray-800/50'
								}`}
							>
								<User className='w-4 h-4' /> Мои темы
							</button>
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

				{/* МОБИЛЬНАЯ ПАНЕЛЬ ФИЛЬТРОВ И ДЕЙСТВИЙ */}
				<div className='lg:hidden space-y-4'>
					{/* Заголовок и кнопка создания */}
					<div className='flex items-center justify-between gap-3'>
						<h1 className='text-xl sm:text-2xl font-bold text-emerald-400'>
							Сообщества
						</h1>
						<Link
							href='/community/new'
							className='flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
						>
							<Plus className='w-4 h-4' />
							<span className='text-sm sm:text-base'>Создать</span>
						</Link>
					</div>

					{/* Фильтры в виде табов */}
					<div className='flex gap-2 overflow-x-auto pb-2'>
						<button
							onClick={() => changeFilter('new')}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
								filter === 'new'
									? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
									: 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-emerald-500/30 hover:text-emerald-400'
							}`}
						>
							<Home className='w-4 h-4' />
							<span>Новые</span>
						</button>

						<button
							onClick={() => changeFilter('popular')}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
								filter === 'popular'
									? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
									: 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-emerald-500/30 hover:text-emerald-400'
							}`}
						>
							<Flame className='w-4 h-4' />
							<span>Популярные</span>
						</button>

						{user && (
							<button
								onClick={() => changeFilter('my')}
								className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
									filter === 'my'
										? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
										: 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-emerald-500/30 hover:text-emerald-400'
								}`}
							>
								<User className='w-4 h-4' />
								<span>Мои</span>
							</button>
						)}
					</div>
				</div>

				{/* КОНТЕНТ */}
				<main className='flex-1 max-w-2xl'>
					{filtered.length === 0 ? (
						<div className='text-center py-12 mt-6 lg:mt-20'>
							<div className='text-5xl mb-4'>📭</div>
							<p className='text-gray-400 text-lg'>
								Постов пока нет. Будь первым, кто создаст тему 🚀
							</p>
						</div>
					) : (
						<div className='flex flex-col gap-3 sm:gap-4'>
							{filtered.map(post => (
								<div
									key={post.id}
									className='group border border-gray-800 rounded-xl p-3 sm:p-4 lg:p-4 hover:border-emerald-500/40 transition-all bg-transparent backdrop-blur-sm relative'
								>
									{/* Автор */}
									<div className='flex items-start justify-between text-xs sm:text-sm text-gray-400 relative'>
										<Link
											href={`/users/${post.author.id}`}
											className='group flex items-center gap-2 sm:gap-3 hover:bg-emerald-900/10 p-1.5 sm:p-2 rounded-lg border border-transparent hover:border-emerald-500/30 transition'
										>
											{post.author.avatarFileId || post.author.avatarUrl ? (
												<img
													src={resolveAvatarUrl(
														post.author.avatarFileId || post.author.avatarUrl
													)}
													alt='avatar'
													className='w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-emerald-700/40'
												/>
											) : (
												<div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-700/20 flex items-center justify-center'>
													<User className='w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:text-emerald-300 transition' />
												</div>
											)}
											<div className='flex flex-col leading-tight'>
												<span className='text-emerald-300 font-medium text-xs sm:text-sm group-hover:text-emerald-400 transition'>
													{post.author.fullName || post.author.email}
												</span>
												<span className='text-xs text-gray-500 hidden sm:block'>
													{new Date(post.createdAt).toLocaleString('ru-RU', {
														day: '2-digit',
														month: 'long',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</span>
												<span className='text-xs text-gray-500 sm:hidden'>
													{new Date(post.createdAt).toLocaleDateString('ru-RU')}
												</span>
											</div>
										</Link>

										{/* Меню */}
										<div className='relative'>
											<button
												onClick={() =>
													setOpenMenu(openMenu === post.id ? null : post.id)
												}
												className='p-1 hover:text-emerald-400 transition'
											>
												<MoreHorizontal className='w-4 h-4 sm:w-5 sm:h-5' />
											</button>

											{openMenu === post.id && (
												<div className='absolute right-0 mt-2 w-40 sm:w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20'>
													<button
														onClick={() => {
															copyLink(post.id)
															setOpenMenu(null)
														}}
														className='block w-full text-left px-3 sm:px-4 py-2 text-sm hover:bg-gray-800 transition'
													>
														📋 Ссылка
													</button>

													<button
														onClick={() => {
															setReportTarget({ type: 'post', id: post.id })
															setOpenMenu(null)
														}}
														className='block w-full text-left px-3 sm:px-4 py-2 text-sm hover:bg-gray-800 text-red-400 transition'
													>
														🚨 Пожаловаться
													</button>

													{user?.id === post.author.id && (
														<button
															onClick={() => {
																deletePost(post.id)
																setOpenMenu(null)
															}}
															className='block w-full text-left px-3 sm:px-4 py-2 text-sm hover:bg-gray-800 text-pink-500 transition'
														>
															🗑 Удалить
														</button>
													)}
												</div>
											)}
										</div>
									</div>

									{/* Контент поста */}
									<Link
										href={`/community/${post.id}`}
										className='block mt-2 sm:mt-3'
									>
										{post.title && (
											<h2 className='text-base sm:text-lg font-semibold text-white group-hover:text-emerald-400 transition line-clamp-2'>
												{post.title}
											</h2>
										)}
										<p className='text-sm sm:text-base text-gray-300 mt-1 whitespace-pre-line line-clamp-2 sm:line-clamp-3'>
											{post.content}
										</p>
										{post.imageUrl && (
											<div className='mt-3'>
												<img
													src={post.imageUrl}
													alt=''
													className='rounded-md border border-gray-800 group-hover:border-emerald-600/40 transition w-full object-cover max-h-[250px] sm:max-h-[350px] lg:max-h-[450px]'
													onError={(e) => {
														console.error('Ошибка загрузки изображения:', post.imageUrl)
														e.currentTarget.style.display = 'none'
													}}
												/>
											</div>
										)}
									</Link>

									{/* Панель */}
									<div className='mt-3 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400'>
										<button
											onClick={e => {
												e.preventDefault()
												e.stopPropagation()
												toggleLike(post.id)
											}}
											disabled={likeLoading === post.id}
											className={`flex items-center gap-1 px-2 py-1 rounded-md border border-transparent cursor-pointer transition ${
												post.liked
													? 'text-pink-500 bg-pink-500/10 border-pink-500/40 hover:bg-pink-500/20'
													: 'hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10'
											}`}
										>
											<Heart
												className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
													post.liked ? 'fill-pink-500 text-pink-500' : ''
												}`}
											/>
											<span className='text-xs sm:text-sm'>
												{post._count.likes}
											</span>
										</button>

										<Link
											href={`/community/${post.id}`}
											onClick={e => e.stopPropagation()}
											className='flex items-center gap-1 hover:text-blue-400 transition'
										>
											<MessageSquare className='w-3.5 h-3.5 sm:w-4 sm:h-4' />{' '}
											<span className='text-xs sm:text-sm'>
												{post._count.comments}
											</span>
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</main>

				{/* ПРАВАЯ КОЛОНКА */}
				<aside className='hidden lg:flex flex-col w-72 border-l border-gray-800 pl-4'>
					<h2 className='text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
						<Compass className='w-4 h-4' /> Последние посты
					</h2>
					<div className='space-y-3'>
						{topPosts.map(p => (
							<Link
								href={`/community/${p.id}`}
								key={p.id}
								className='flex items-center gap-3 p-2 rounded-md hover:bg-emerald-600/10 transition'
							>
								{p.imageUrl ? (
									<img
										src={p.imageUrl}
										alt=''
										className='w-14 h-14 object-cover rounded-md border border-gray-800'
									/>
								) : (
									<div className='w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center text-gray-500 text-xs'>
										нет фото
									</div>
								)}
								<div className='flex-1'>
									<p className='text-sm font-medium text-gray-200 line-clamp-2'>
										{p.title || p.content.slice(0, 60)}
									</p>
									<p className='text-xs text-gray-500 mt-1'>
										❤️ {p._count.likes} • 💬 {p._count.comments}
									</p>
								</div>
							</Link>
						))}
					</div>
				</aside>
			</div>

			{/* Модалка жалобы */}
			{reportTarget && (
				<ReportModal
					target={reportTarget}
					onClose={() => setReportTarget(null)}
				/>
			)}
		</div>
	)
}
