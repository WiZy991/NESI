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
	token?: string
	onNotificationRead?: () => void
}

export function ToastNotification({
	notification,
	onClose,
	token,
	onNotificationRead,
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

	const handleClick = async () => {
		handleClose()

		// Удаляем уведомления в зависимости от типа
		if (token) {
			try {
				// Для сообщений - удаляются через handleSelectChat в chats/page.tsx
				// Остальные типы удаляем здесь
				if (notification.type !== 'message' && notification.link) {
					console.log('🗑️ Удаление уведомлений по ссылке:', notification.link)
					
					// Удаляем уведомления с этой ссылкой
					await fetch('/api/notifications/mark-read-by-link', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ link: notification.link }),
					})

					// Уведомляем родителя об обновлении счетчика
					if (onNotificationRead) {
						onNotificationRead()
					}
				}
			} catch (error) {
				console.error('Ошибка при удалении уведомлений:', error)
			}
		}

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
			case 'badge':
				return '🏅'
			default:
				return '🔔'
		}
	}

	// Специальный стиль для уведомлений о достижениях
	const isBadgeNotification = notification.type === 'badge'

	return (
		<div
			className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 sm:bottom-6 ${
				isBadgeNotification 
					? 'bg-gradient-to-br from-yellow-900/40 via-emerald-900/40 to-yellow-900/40 border-2 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.4)]' 
					: 'bg-gray-900 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
			} rounded-xl p-4 cursor-pointer transition-all duration-300 z-[9999] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] sm:hover:scale-105 ${
				isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
			}`}
			onClick={handleClick}
		>
			<button
				onClick={e => {
					e.stopPropagation()
					handleClose()
				}}
				className='absolute top-2 right-2 w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all text-lg sm:text-sm z-10'
				aria-label="Закрыть уведомление"
			>
				✕
			</button>

			<div className='flex items-start space-x-3 pr-6'>
				<div className='text-3xl sm:text-2xl flex-shrink-0'>{getIcon()}</div>
				<div className='flex-1 min-w-0'>
					<p className='text-sm sm:text-sm font-semibold text-emerald-400 mb-1'>
						{notification.title}
					</p>
					<p className='text-sm sm:text-sm text-gray-200 line-clamp-2'>
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
	token,
	onNotificationRead,
}: {
	notifications: ToastNotification[]
	onClose: (id: string) => void
	token?: string
	onNotificationRead?: () => void
}) {
	return (
		<div className='fixed bottom-0 right-0 left-0 sm:left-auto p-4 sm:p-6 z-[9999] flex flex-col items-stretch sm:items-end gap-4'>
			{notifications.map((notification) => (
				<div 
					key={notification.id} 
					className='w-full sm:w-auto'
				>
					<ToastNotification
						notification={notification}
						onClose={() => onClose(notification.id)}
						token={token}
						onNotificationRead={onNotificationRead}
					/>
				</div>
			))}
		</div>
	)
}
