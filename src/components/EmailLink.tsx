'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
	const [isMounted, setIsMounted] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		setIsMounted(true)
	}, [])

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
			const menuHeight = 250 // Примерная высота меню
			const spaceBelow = viewportHeight - rect.bottom
			
			// Если кнопка находится в нижней половине экрана или места внизу недостаточно, показываем меню сверху
			const shouldShowAbove = rect.bottom > viewportHeight / 2 || spaceBelow < menuHeight
			setShowAbove(shouldShowAbove)
			
			setMenuPosition({
				top: shouldShowAbove ? rect.top - 8 : rect.bottom + 8,
				left: rect.left,
			})
		}
		setShowMenu(!showMenu)
	}

	// Обновляем позицию при скролле/ресайзе
	useEffect(() => {
		if (showMenu && buttonRef.current) {
			const updatePosition = () => {
				if (buttonRef.current) {
					const rect = buttonRef.current.getBoundingClientRect()
					const viewportHeight = window.innerHeight
					const menuHeight = 250
					const spaceBelow = viewportHeight - rect.bottom
					
					const shouldShowAbove = rect.bottom > viewportHeight / 2 || spaceBelow < menuHeight
					setShowAbove(shouldShowAbove)
					
					setMenuPosition({
						top: shouldShowAbove ? rect.top - 8 : rect.bottom + 8,
						left: rect.left,
					})
				}
			}

			updatePosition()
			window.addEventListener('scroll', updatePosition, true)
			window.addEventListener('resize', updatePosition)

			return () => {
				window.removeEventListener('scroll', updatePosition, true)
				window.removeEventListener('resize', updatePosition)
			}
		} else if (!showMenu) {
			setMenuPosition(null)
		}
	}, [showMenu])

	return (
		<span className='relative inline-block'>
			<button
				ref={buttonRef}
				onClick={handleToggleMenu}
				className={`${className} cursor-pointer transition-colors`}
			>
				{children || email}
			</button>

		{showMenu && menuPosition && isMounted && typeof document !== 'undefined' && document.body && createPortal(
			<>
				{/* Backdrop */}
				<div
					className='fixed inset-0 z-[9997]'
					onClick={() => setShowMenu(false)}
				/>

				{/* Menu */}
				<div
					className='fixed z-[9998] bg-black/95 border border-emerald-500/40 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] min-w-[200px] overflow-hidden'
					style={{
						top: `${menuPosition.top}px`,
						left: `${menuPosition.left}px`,
						transform: showAbove ? 'translateY(-100%)' : 'none',
					}}
					onClick={(e) => e.stopPropagation()}
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
			</>,
			document.body
		)}
		</span>
	)
}
