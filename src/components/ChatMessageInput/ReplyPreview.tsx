'use client'

interface ReplyPreviewProps {
	replyTo: {
		id: string
		content: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	}
	onCancel: () => void
}

export function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
	return (
		<div className='mb-3 px-4 py-2.5 bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-xl flex items-start gap-3 text-xs sm:text-sm transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-top-2 shadow-lg'>
			<div className='flex-1 min-w-0'>
				<div className='text-slate-200 font-medium mb-1 flex items-center gap-2'>
					<span className='text-emerald-400/80'>↩️</span>
					<span>{replyTo.sender.fullName || replyTo.sender.email}</span>
				</div>
				<div className='text-gray-400 line-clamp-2 pl-6 border-l-2 border-emerald-400/30'>
					{replyTo.content || '📎 Файл'}
				</div>
			</div>
			<button
				type='button'
				onClick={onCancel}
				className='flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-600/60 text-gray-400 hover:text-white transition-all duration-150 ease-out'
				aria-label='Отменить ответ'
			>
				<svg
					className='w-4 h-4'
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth={2}
						d='M6 18L18 6M6 6l12 12'
					/>
				</svg>
			</button>
		</div>
	)
}

