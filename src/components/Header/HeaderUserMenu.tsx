'use client'

import Link from 'next/link'

interface HeaderUserMenuProps {
	menuOpen: boolean
	setMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void
	menuRef: React.RefObject<HTMLDivElement>
	unreadMessagesCount: number
	userRole: string
	canUseGroupFeatures?: boolean
	onLogout: () => void
	linkStyle: string
}

export function HeaderUserMenu({
	menuOpen,
	setMenuOpen,
	menuRef,
	unreadMessagesCount,
	userRole,
	canUseGroupFeatures = false,
	onLogout,
	linkStyle,
}: HeaderUserMenuProps) {
	return (
		<div className='relative' ref={menuRef}>
			<button
				onClick={() => setMenuOpen(v => !v)}
				className={linkStyle}
				data-onboarding-target='more-menu'
			>
				Ещё ▾
			</button>
			{menuOpen && (
				<div
					className='absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[10001] animate-fadeInDown overflow-hidden'
					data-onboarding-menu='more'
				>
					<div className='py-2'>
						<Link
							href='/chats'
							className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400 relative'
							onClick={() => setMenuOpen(false)}
							data-onboarding-target='more-menu-chats'
						>
							💬 Чаты
							{unreadMessagesCount > 0 && (
								<span className='absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
									{unreadMessagesCount}
								</span>
							)}
						</Link>
						<Link
							href='/community'
							className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
							onClick={() => setMenuOpen(false)}
							data-onboarding-target='more-menu-community'
						>
							🏘️ Сообщество
						</Link>
						<Link
							href='/hire'
							className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
							onClick={() => setMenuOpen(false)}
							data-onboarding-target='more-menu-hire'
						>
							📑 Запросы найма
						</Link>
					</div>

					<div className='border-t border-emerald-500/20 py-2'>
						<Link
							href='/analytics'
							className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
							onClick={() => setMenuOpen(false)}
							data-onboarding-target='more-menu-analytics'
						>
							📊 Аналитика
						</Link>
						{userRole === 'executor' && (
							<>
								<Link
									href='/portfolio'
									className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
									onClick={() => setMenuOpen(false)}
									data-onboarding-target='more-menu-portfolio'
								>
									💼 Портфолио
								</Link>
								{canUseGroupFeatures && (
									<Link
										href='/teams'
										className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
										onClick={() => setMenuOpen(false)}
										data-onboarding-target='more-menu-teams'
									>
										👥 Команды
									</Link>
								)}
							</>
						)}
					</div>

					<div className='border-t border-emerald-500/20 py-2'>
						<Link
							href='/settings'
							className='block px-4 py-2.5 hover:bg-emerald-500/10 ios-transition-fast text-gray-200 hover:text-emerald-400'
							onClick={() => setMenuOpen(false)}
							data-onboarding-target='more-menu-settings'
						>
							⚙️ Настройки
						</Link>

						<button
							onClick={() => {
								setMenuOpen(false)
								onLogout()
							}}
							className='block w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 ios-transition-fast hover:text-red-300'
						>
							🚪 Выйти
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

