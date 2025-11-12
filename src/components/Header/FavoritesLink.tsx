'use client'

import { Heart } from 'lucide-react'
import Link from 'next/link'

export const FavoritesLink = ({ className }: { className?: string }) => (
	<Link
		href='/tasks/favorites'
		className={className}
		title='Избранное'
		aria-label='Избранное'
		data-onboarding-target='nav-favorites'
	>
		<Heart className='w-4 h-4' />
	</Link>
)

