'use client'

import { SkeletonLoader } from '../SkeletonLoader'

export function SpecialistCardSkeleton() {
	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 animate-pulse'>
			<div className='flex items-start gap-4 mb-4'>
				<SkeletonLoader width={64} height={64} rounded='full' variant='circular' />
				<div className='flex-1 space-y-2'>
					<SkeletonLoader height={20} rounded='md' variant='text' className='w-2/3' />
					<SkeletonLoader height={16} rounded='md' variant='text' className='w-1/2' />
					<SkeletonLoader height={14} rounded='md' variant='text' className='w-1/3' />
				</div>
			</div>
			<div className='space-y-2'>
				<SkeletonLoader height={40} rounded='md' variant='rectangular' />
				<div className='flex gap-2'>
					<SkeletonLoader height={24} rounded='md' variant='text' className='w-20' />
					<SkeletonLoader height={24} rounded='md' variant='text' className='w-20' />
				</div>
			</div>
		</div>
	)
}

export function SpecialistListSkeleton() {
	return (
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
			{Array.from({ length: 6 }).map((_, i) => (
				<SpecialistCardSkeleton key={i} />
			))}
		</div>
	)
}

