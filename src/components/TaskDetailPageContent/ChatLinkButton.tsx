'use client'

import Link from 'next/link'

type ChatLinkButtonProps = {
	taskId: string
	isCustomer: boolean
}

export function ChatLinkButton({ taskId, isCustomer }: ChatLinkButtonProps) {
	return (
		<Link
			href={`/chats?taskId=${taskId}`}
			className='block bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] group'
		>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform'>
						<span className='text-lg'>💬</span>
					</div>
					<div>
						<h3 className='text-lg font-semibold text-emerald-300 group-hover:text-emerald-400 transition-colors'>
							Чат по задаче
						</h3>
						<p className='text-sm text-gray-400'>
							Общайтесь с {isCustomer ? 'исполнителем' : 'заказчиком'} в
							реальном времени
						</p>
					</div>
				</div>
				<svg
					className='w-6 h-6 text-emerald-400 group-hover:translate-x-1 transition-transform'
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth={2}
						d='M9 5l7 7-7 7'
					/>
				</svg>
			</div>
		</Link>
	)
}

