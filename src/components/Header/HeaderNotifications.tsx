'use client'

import {
	AlertTriangle,
	Bell,
	CheckCircle,
	MessageSquare,
	Star,
} from 'lucide-react'
import { formatNotificationTime, getNotificationTypeLabel } from './utils'

interface Notification {
	id?: string
	type?: string
	title?: string
	message?: string
	sender?: string
	timestamp?: string
	createdAt?: string
	taskTitle?: string
	userId?: string
	senderId?: string
	link?: string
}

interface HeaderNotificationsProps {
	notifications: Notification[]
	unreadCount: number
	notifOpen: boolean
	setNotifOpen: (value: boolean | ((prev: boolean) => boolean)) => void
	onNotificationClick: (notif: Notification) => void
	onGoToNotifications: () => void
	setMobileMenuOpen: (value: boolean) => void
}

export function HeaderNotifications({
	notifications,
	unreadCount,
	notifOpen,
	setNotifOpen,
	onNotificationClick,
	onGoToNotifications,
	setMobileMenuOpen,
}: HeaderNotificationsProps) {
	return (
		<div className='relative' onClick={e => e.stopPropagation()}>
			<button
				onClick={e => {
					e.stopPropagation()
					setNotifOpen(v => !v)
				}}
				onDoubleClick={e => {
					e.preventDefault()
					e.stopPropagation()
					setNotifOpen(false)
					setTimeout(() => {
						window.location.href = '/notifications'
					}, 100)
				}}
				className='text-lg flex items-center gap-1 relative p-2'
				aria-label={`Уведомления${
					unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ''
				}`}
				aria-expanded={notifOpen}
				aria-haspopup='true'
				data-onboarding-target='notifications-bell'
			>
				<Bell className='w-5 h-5 text-emerald-400' />
				{unreadCount > 0 && (
					<span className='absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse'>
						{unreadCount}
					</span>
				)}
			</button>

			{notifOpen && (
				<div className='absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-80 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[100] overflow-hidden animate-fadeIn'>
					<div className='max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar'>
						{notifications.length === 0 ? (
							<div className='p-4 text-center text-gray-400'>
								<Bell className='w-6 h-6 mx-auto mb-2 text-gray-500' />
								<p className='text-sm'>Нет новых уведомлений</p>
							</div>
						) : (
							(() => {
								// Группируем уведомления по типу
								const grouped = notifications.reduce((acc, notif) => {
									const type = notif.type || 'other'
									if (!acc[type]) {
										acc[type] = []
									}
									acc[type].push(notif)
									return acc
								}, {} as Record<string, typeof notifications>)

								return Object.entries(grouped).map(
									([type, groupNotifs]) => (
										<div
											key={type}
											className='border-b border-gray-700/50 last:border-b-0'
										>
											{Object.keys(grouped).length > 1 && (
												<div className='px-3 py-2 bg-gray-800/40 border-b border-gray-700/30'>
													<span className='text-xs font-semibold text-emerald-400 uppercase tracking-wider'>
														{getNotificationTypeLabel(type)}
													</span>
													<span className='ml-2 text-xs text-gray-500'>
														({groupNotifs.length})
													</span>
												</div>
											)}
											{groupNotifs.map((notif, index) => (
												<div
													key={index}
													className='p-3 sm:p-4 border-b border-gray-700 hover:bg-gray-800/60 active:bg-gray-700/80 transition cursor-pointer touch-manipulation select-none'
													onClick={e => {
														e.stopPropagation()
														onNotificationClick(notif)
													}}
													onTouchStart={e => {
														e.currentTarget.classList.add(
															'bg-gray-800/80'
														)
													}}
													onTouchEnd={e => {
														e.currentTarget.classList.remove(
															'bg-gray-800/80'
														)
													}}
													role='button'
													tabIndex={0}
													onKeyDown={e => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault()
															onNotificationClick(notif)
														}
													}}
												>
													<div className='flex items-start space-x-3'>
														<div className='w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-emerald-900/40 border border-emerald-500/30 flex-shrink-0'>
															{notif.type === 'message' ? (
																<MessageSquare className='w-5 h-5 sm:w-4 sm:h-4 text-blue-400' />
															) : notif.type === 'review' ? (
																<Star className='w-5 h-5 sm:w-4 sm:h-4 text-yellow-400' />
															) : notif.type === 'task' ? (
																<CheckCircle className='w-5 h-5 sm:w-4 sm:h-4 text-green-400' />
															) : notif.type === 'warning' ? (
																<AlertTriangle className='w-5 h-5 sm:w-4 sm:h-4 text-red-500' />
															) : (
																<Bell className='w-5 h-5 sm:w-4 sm:h-4 text-emerald-400' />
															)}
														</div>
														<div className='flex-1 min-w-0'>
															<p className='text-sm sm:text-sm text-white font-medium line-clamp-2'>
																{notif.title}
															</p>
															<p className='text-xs text-gray-400 line-clamp-2'>
																{notif.sender ? (
																	<>
																		<strong className='text-gray-300'>
																			{notif.sender}
																		</strong>
																		<span className='text-gray-500'>
																			{' '}
																			—{' '}
																		</span>
																		{notif.message}
																	</>
																) : (
																	notif.message
																)}
															</p>
															{notif.taskTitle && (
																<p className='text-xs text-emerald-400 mt-1'>
																	📋 {notif.taskTitle}
																</p>
															)}
															{(notif.timestamp || notif.createdAt) && (
																<p className='text-xs text-gray-500 mt-1'>
																	{formatNotificationTime(
																		notif.timestamp || notif.createdAt!
																	)}
																</p>
															)}
														</div>
													</div>
												</div>
											))}
										</div>
									)
								)
							})()
						)}
					</div>
					<div className='p-3 sm:p-4 border-t border-emerald-500/20 bg-black/40'>
						<button
							type='button'
							onClick={e => {
								e.preventDefault()
								e.stopPropagation()
								setNotifOpen(false)
								setMobileMenuOpen(false)
								setTimeout(() => {
									window.location.href = '/notifications'
								}, 100)
							}}
							onTouchEnd={e => {
								e.preventDefault()
								e.stopPropagation()
								setNotifOpen(false)
								setMobileMenuOpen(false)
								setTimeout(() => {
									window.location.href = '/notifications'
								}, 100)
							}}
							className='w-full py-2.5 sm:py-2 text-emerald-400 hover:text-emerald-300 active:text-emerald-200 text-sm sm:text-base font-medium transition-all touch-manipulation text-center rounded-lg hover:bg-emerald-500/10 active:bg-emerald-500/30 active:scale-95'
						>
							Все уведомления →
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

