'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ToastNotification = {
	id: string
	type: string
	title: string
	message: string
	link?: string
	userId?: string
	senderId?: string
	timestamp: string
}

type ToastNotificationProps = {
	notification: ToastNotification
	onClose: () => void
}

export function ToastNotification({
	notification,
	onClose,
}: ToastNotificationProps) {
	const router = useRouter()
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Анимация появления
		setTimeout(() => setIsVisible(true), 10)

		// Автоматическое закрытие через 7 секунд
		const timer = setTimeout(() => {
			handleClose()
		}, 7000)

		return () => clearTimeout(timer)
	}, [])

	const handleClose = () => {
		setIsVisible(false)
		setTimeout(onClose, 300) // Даём время на анимацию исчезновения
	}

	const handleClick = () => {
		handleClose()

		// Переход по ссылке
		if (notification.userId || notification.senderId) {
			const targetId = notification.userId || notification.senderId
			router.push(`/chats?open=${targetId}`)
			return
		}

		if (notification.link) {
			router.push(notification.link)
		}
	}

	// Определяем иконку в зависимости от типа уведомления
	const getIcon = () => {
		switch (notification.type) {
			case 'message':
				return '💬'
			case 'task':
				return '📋'
			case 'response':
				return '📝'
			case 'hire':
				return '📑'
			case 'review':
				return '⭐'
			case 'payment':
				return '💰'
			default:
				return '🔔'
		}
	}

	return (
		<div
			className={`fixed bottom-6 right-6 w-96 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] p-4 cursor-pointer transition-all duration-300 z-[9999] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:scale-105 ${
				isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
			}`}
			onClick={handleClick}
		>
			<button
				onClick={e => {
					e.stopPropagation()
					handleClose()
				}}
				className='absolute top-2 right-2 text-gray-400 hover:text-white transition'
			>
				✕
			</button>

			<div className='flex items-start space-x-3'>
				<div className='text-3xl'>{getIcon()}</div>
				<div className='flex-1 min-w-0'>
					<p className='text-sm font-semibold text-emerald-400 mb-1'>
						{notification.title}
					</p>
					<p className='text-sm text-gray-200 line-clamp-2'>
						{notification.message}
					</p>
					<p className='text-xs text-gray-500 mt-2'>Нажмите, чтобы перейти →</p>
				</div>
			</div>

			{/* Прогресс-бар для визуализации времени */}
			<div className='absolute bottom-0 left-0 h-1 bg-emerald-500/30 w-full rounded-b-xl overflow-hidden'>
				<div
					className='h-full bg-emerald-500 animate-progress'
					style={{
						animation: 'progress 7s linear',
					}}
				/>
			</div>

			<style jsx>{`
				@keyframes progress {
					from {
						width: 100%;
					}
					to {
						width: 0%;
					}
				}
				.animate-progress {
					animation: progress 7s linear;
				}
			`}</style>
		</div>
	)
}

export function ToastContainer({
	notifications,
	onClose,
}: {
	notifications: ToastNotification[]
	onClose: (id: string) => void
}) {
	return (
		<div className='fixed bottom-0 right-0 p-6 space-y-4 z-[9999] pointer-events-none'>
			{notifications.map(notification => (
				<div key={notification.id} className='pointer-events-auto'>
					<ToastNotification
						notification={notification}
						onClose={() => onClose(notification.id)}
					/>
				</div>
			))}
		</div>
	)
}
