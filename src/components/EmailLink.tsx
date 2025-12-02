'use client'

import { useRef, useState } from 'react'

interface EmailLinkProps {
	email: string
	className?: string
	children?: React.ReactNode
}

export default function EmailLink({
	email,
	className = '',
	children,
}: EmailLinkProps) {
	const [showMenu, setShowMenu] = useState(false)
	const [showAbove, setShowAbove] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)

	const emailServices = [
		{
			name: 'Gmail',
			url: `https://mail.google.com/mail/?view=cm&to=${email}`,
			icon: '📧',
		},
		{
			name: 'Яндекс.Почта',
			url: `https://mail.yandex.ru/compose?to=${email}`,
			icon: '📨',
		},
		{
			name: 'Mail.ru',
			url: `https://e.mail.ru/compose/?mailto=${email}`,
			icon: '📮',
		},
		{
			name: 'Outlook',
			url: `https://outlook.live.com/mail/deeplink/compose?to=${email}`,
			icon: '📬',
		},
	]

	const handleCopy = () => {
		navigator.clipboard.writeText(email)
		alert('Email скопирован в буфер обмена!')
		setShowMenu(false)
	}

	// Вычисляем позицию меню синхронно при клике, до показа меню
	const handleToggleMenu = () => {
		if (!showMenu && buttonRef.current) {
			// Вычисляем позицию перед показом меню
			const rect = buttonRef.current.getBoundingClientRect()
			const viewportHeight = window.innerHeight
			
			// Если кнопка находится в нижней половине экрана, показываем меню сверху
			const shouldShowAbove = rect.bottom > viewportHeight / 2
			setShowAbove(shouldShowAbove)
		}
		setShowMenu(!showMenu)
	}

	return (
		<span className='relative inline-block'>
			<button
				ref={buttonRef}
				onClick={handleToggleMenu}
				className={`${className} cursor-pointer transition-colors`}
			>
				{children || email}
			</button>

			{showMenu && (
				<>
					{/* Backdrop */}
					<div
						className='fixed inset-0 z-40'
						onClick={() => setShowMenu(false)}
					/>

					{/* Menu */}
					<div
						className={`absolute left-0 z-50 bg-black/95 border border-emerald-500/40 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] min-w-[200px] overflow-hidden ${
							showAbove ? 'bottom-full mb-2' : 'top-full mt-2'
						}`}
					>
						<div className='p-2 border-b border-emerald-500/20 text-xs text-gray-400'>
							Открыть в:
						</div>

						{emailServices.map(service => (
							<a
								key={service.name}
								href={service.url}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 transition text-white'
								onClick={() => setShowMenu(false)}
							>
								<span className='text-xl'>{service.icon}</span>
								<span>{service.name}</span>
							</a>
						))}

						<button
							onClick={handleCopy}
							className='w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 transition text-white border-t border-emerald-500/20'
						>
							<span className='text-xl'>📋</span>
							<span>Скопировать email</span>
						</button>
					</div>
				</>
			)}
		</span>
	)
}
