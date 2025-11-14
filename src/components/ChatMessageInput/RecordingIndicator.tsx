'use client'

import { formatDuration } from './utils'

interface RecordingIndicatorProps {
	recordingTime: number
	onCancel: () => void
}

export function RecordingIndicator({ recordingTime, onCancel }: RecordingIndicatorProps) {
	return (
		<div className='mb-3 px-4 py-2.5 bg-red-500/20 backdrop-blur-sm border border-red-400/40 rounded-xl flex items-center justify-between text-sm transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2 shadow-lg'>
			<div className='flex items-center gap-2'>
				<span className='inline-flex w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse'></span>
				<span className='text-red-200 font-medium'>Идёт запись...</span>
			</div>
			<div className='flex items-center gap-3'>
				<span className='text-red-300 font-mono text-sm'>
					{formatDuration(recordingTime)}
				</span>
				<button
					type='button'
					onClick={onCancel}
					className='text-xs text-red-300 hover:text-red-200 transition px-2 py-1 rounded-md hover:bg-red-500/20'
				>
					Отменить
				</button>
			</div>
		</div>
	)
}

