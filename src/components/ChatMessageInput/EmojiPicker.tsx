'use client'

import { createPortal } from 'react-dom'
import { emojiList } from './utils'

interface EmojiPickerProps {
	isOpen: boolean
	onClose: () => void
	onSelect: (emoji: string) => void
	isMobileView: boolean
	viewportWidth: number
}

export function EmojiPicker({
	isOpen,
	onClose,
	onSelect,
	isMobileView,
	viewportWidth,
}: EmojiPickerProps) {
	if (!isOpen || typeof window === 'undefined') return null

	return createPortal(
		<>
			<div
				className='fixed inset-0 z-[9998] bg-transparent'
				onClick={onClose}
			/>
			<div
				className='fixed z-[9999]'
				style={{
					bottom: isMobileView ? 140 : 80,
					right: isMobileView ? 12 : 24,
					left: isMobileView ? 12 : 'auto',
					width: isMobileView
						? Math.min(280, viewportWidth - 24)
						: 260,
				}}
				onClick={e => e.stopPropagation()}
			>
				<div className='bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-3 animate-scaleFadeIn'>
					<div className='grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar'>
						{emojiList.map(emoji => (
							<button
								key={emoji}
								onClick={() => {
									onSelect(emoji)
									onClose()
								}}
								className='w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-700/80 flex items-center justify-center text-xl sm:text-2xl transition-all hover:scale-110 active:scale-95 touch-manipulation'
								aria-label={`Эмодзи ${emoji}`}
							>
								{emoji}
							</button>
						))}
					</div>
				</div>
			</div>
		</>,
		document.body
	)
}

