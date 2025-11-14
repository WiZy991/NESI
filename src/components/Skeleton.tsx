/**
 * Универсальные skeleton loaders для улучшения UX
 */

import clsx from 'clsx'

interface SkeletonProps {
	className?: string
	variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
	width?: string | number
	height?: string | number
	lines?: number
}

/**
 * Базовый skeleton компонент
 */
export function Skeleton({
	className,
	variant = 'rectangular',
	width,
	height,
}: SkeletonProps) {
	const baseClasses = 'animate-pulse bg-gray-700/50'
	
	const variantClasses = {
		text: 'rounded',
		circular: 'rounded-full',
		rectangular: '',
		rounded: 'rounded-lg',
	}

	return (
		<div
			className={clsx(baseClasses, variantClasses[variant], className)}
			style={{
				width: width || '100%',
				height: height || '1rem',
			}}
			aria-label="Загрузка..."
		/>
	)
}

/**
 * Skeleton для текста (несколько строк)
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
	return (
		<div className={clsx('space-y-2', className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					variant="text"
					width={i === lines - 1 ? '80%' : '100%'}
					height="0.875rem"
				/>
			))}
		</div>
	)
}

/**
 * Skeleton для карточки задачи
 */
export function TaskCardSkeleton() {
	return (
		<div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
			<Skeleton variant="rounded" height="1.25rem" width="80%" />
			<SkeletonText lines={2} />
			<div className="flex items-center justify-between">
				<Skeleton variant="rounded" width="100px" height="1.5rem" />
				<Skeleton variant="circular" width="32px" height="32px" />
			</div>
		</div>
	)
}

/**
 * Skeleton для списка задач
 */
export function TaskListSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<TaskCardSkeleton key={i} />
			))}
		</div>
	)
}

/**
 * Skeleton для сообщения в чате
 */
export function MessageSkeleton() {
	return (
		<div className="flex gap-3 p-3">
			<Skeleton variant="circular" width="40px" height="40px" />
			<div className="flex-1 space-y-2">
				<Skeleton variant="text" width="120px" height="0.75rem" />
				<SkeletonText lines={2} />
			</div>
		</div>
	)
}

/**
 * Skeleton для списка сообщений
 */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: count }).map((_, i) => (
				<MessageSkeleton key={i} />
			))}
		</div>
	)
}

/**
 * Skeleton для профиля пользователя
 */
export function ProfileSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Skeleton variant="circular" width="80px" height="80px" />
				<div className="flex-1 space-y-2">
					<Skeleton variant="rounded" width="200px" height="1.5rem" />
					<Skeleton variant="rounded" width="150px" height="1rem" />
				</div>
			</div>
			<SkeletonText lines={4} />
		</div>
	)
}

/**
 * Skeleton для уведомлений
 */
export function NotificationSkeleton() {
	return (
		<div className="flex gap-3 p-3 border-b border-gray-800">
			<Skeleton variant="circular" width="40px" height="40px" />
			<div className="flex-1 space-y-2">
				<Skeleton variant="rounded" width="60%" height="0.875rem" />
				<Skeleton variant="rounded" width="40%" height="0.75rem" />
			</div>
		</div>
	)
}

/**
 * Skeleton для списка уведомлений
 */
export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div>
			{Array.from({ length: count }).map((_, i) => (
				<NotificationSkeleton key={i} />
			))}
		</div>
	)
}

