'use client'

import { SkeletonLoader } from '../SkeletonLoader'

export function PostSkeleton() {
	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 animate-pulse'>
			<div className='flex items-start gap-3 mb-4'>
				<SkeletonLoader width={40} height={40} rounded='full' variant='circular' />
				<div className='flex-1 space-y-2'>
					<SkeletonLoader height={16} rounded='md' variant='text' className='w-1/3' />
					<SkeletonLoader height={14} rounded='md' variant='text' className='w-1/4' />
				</div>
			</div>
			<SkeletonLoader height={60} rounded='md' variant='rectangular' className='mb-3' />
			<div className='flex items-center gap-4'>
				<SkeletonLoader height={20} rounded='md' variant='text' className='w-16' />
				<SkeletonLoader height={20} rounded='md' variant='text' className='w-16' />
			</div>
		</div>
	)
}

export function PostListSkeleton() {
	return (
		<div className='space-y-4'>
			{Array.from({ length: 5 }).map((_, i) => (
				<PostSkeleton key={i} />
			))}
		</div>
	)
}

