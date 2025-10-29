'use client'

import AdminGuard from '@/components/AdminGuard'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
	{ href: '/admin', label: 'Главная', icon: '🏠' },
	{ href: '/admin/stats', label: 'Статистика', icon: '📊' },
	{ href: '/admin/users', label: 'Пользователи', icon: '👥' },
	{ href: '/admin/tasks', label: 'Задачи', icon: '📋' },
	{ href: '/admin/responses', label: 'Отклики', icon: '📝' },
	{ href: '/admin/reviews', label: 'Отзывы', icon: '⭐' },
	{ href: '/admin/finance', label: 'Финансы', icon: '💰' },
	{ href: '/admin/cert', label: 'Сертификация', icon: '🎓' },
	{ href: '/admin/disputes', label: 'Споры', icon: '⚖️' },
	{ href: '/admin/reports', label: 'Жалобы', icon: '🚨' },
	{ href: '/admin/feedback', label: 'Обратная связь', icon: '💬' },
]

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const pathname = usePathname()

	return (
		<AdminGuard>
			<div className='min-h-screen flex bg-gradient-to-br from-black via-gray-900 to-black text-gray-100'>
				{/* Сайдбар с неоновым стилем */}
				<aside className='w-72 border-r border-emerald-500/20 bg-black/40 backdrop-blur-sm relative'>
					{/* Декоративное свечение */}
					<div className='absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none' />

					<div className='relative z-10 p-6'>
						{/* Заголовок */}
						<div className='mb-8 pb-6 border-b border-emerald-500/20'>
							<h1 className='text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 mb-1'>
								Админ-панель
							</h1>
							<p className='text-xs text-gray-500'>Управление платформой</p>
						</div>

						{/* Навигация */}
						<nav className='space-y-1'>
							{menuItems.map(item => {
								const isActive =
									pathname === item.href ||
									(item.href !== '/admin' && pathname?.startsWith(item.href))

								return (
									<Link
										key={item.href}
										href={item.href}
										className={`
                      group flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200
                      ${
												isActive
													? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
													: 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent'
											}
                    `}
									>
										<span className='text-xl'>{item.icon}</span>
										<span className='font-medium text-sm'>{item.label}</span>
										{isActive && (
											<span className='ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
										)}
									</Link>
								)
							})}
						</nav>

						{/* Быстрые действия */}
						<div className='mt-8 p-4 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20'>
							<h3 className='text-xs font-semibold text-emerald-400 mb-3'>
								⚡ Быстрый доступ
							</h3>
							<div className='space-y-2 text-xs'>
								<a
									href='/'
									className='block text-gray-400 hover:text-emerald-400 transition'
								>
									← На главную сайта
								</a>
								<a
									href='/profile'
									className='block text-gray-400 hover:text-emerald-400 transition'
								>
									👤 Мой профиль
								</a>
							</div>
						</div>
					</div>
				</aside>

				{/* Контент с улучшенным фоном */}
				<main className='flex-1 overflow-y-auto'>
					<div className='max-w-7xl mx-auto p-8'>{children}</div>
				</main>
			</div>
		</AdminGuard>
	)
}
