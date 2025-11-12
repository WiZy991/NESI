'use client'

interface SkeletonLoaderProps {
	width?: string | number
	height?: string | number
	className?: string
	rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
	variant?: 'text' | 'rectangular' | 'circular'
}

export function SkeletonLoader({
	width,
	height,
	className = '',
	rounded = 'md',
	variant = 'rectangular',
}: SkeletonLoaderProps) {
	const roundedClasses = {
		none: '',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full',
	}

	const variantClasses = {
		text: 'h-4',
		rectangular: '',
		circular: 'rounded-full',
	}

	const style: React.CSSProperties = {}
	if (width) style.width = typeof width === 'number' ? `${width}px` : width
	if (height) style.height = typeof height === 'number' ? `${height}px` : height

	return (
		<div
			className={`bg-slate-700/50 animate-pulse ${roundedClasses[rounded]} ${variantClasses[variant]} ${className}`}
			style={style}
			aria-label='Загрузка...'
			role='status'
		/>
	)
}

// Предустановленные скелетоны для часто используемых элементов
export function TaskCardSkeleton() {
	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 animate-pulse'>
			<div className='space-y-4'>
				<div className='flex items-start gap-4'>
					<SkeletonLoader width={48} height={48} rounded='lg' variant='rectangular' />
					<div className='flex-1 space-y-2'>
						<SkeletonLoader height={24} rounded='md' variant='text' className='w-3/4' />
						<SkeletonLoader height={16} rounded='md' variant='text' className='w-1/2' />
					</div>
				</div>
				<SkeletonLoader height={60} rounded='md' variant='rectangular' />
			</div>
		</div>
	)
}

export function ChatListSkeleton() {
	return (
		<div className='space-y-2'>
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className='bg-black/40 rounded-lg p-3 border border-slate-700/50 animate-pulse'
				>
					<div className='flex items-center gap-3'>
						<SkeletonLoader width={40} height={40} rounded='full' variant='circular' />
						<div className='flex-1 space-y-2'>
							<SkeletonLoader height={16} rounded='md' variant='text' className='w-1/3' />
							<SkeletonLoader height={14} rounded='md' variant='text' className='w-2/3' />
						</div>
					</div>
				</div>
			))}
		</div>
	)
}

export function MessageSkeleton() {
	return (
		<div className='flex gap-3 animate-pulse'>
			<SkeletonLoader width={32} height={32} rounded='full' variant='circular' />
			<div className='flex-1 space-y-2'>
				<SkeletonLoader height={16} rounded='md' variant='text' className='w-24' />
				<SkeletonLoader height={60} rounded='lg' variant='rectangular' />
			</div>
		</div>
	)
}

export function InfoPanelSkeleton() {
	return (
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 animate-pulse'
				>
					<div className='space-y-3'>
						<SkeletonLoader height={20} rounded='md' variant='text' className='w-1/2' />
						<SkeletonLoader height={24} rounded='md' variant='text' className='w-3/4' />
					</div>
				</div>
			))}
		</div>
	)
}

