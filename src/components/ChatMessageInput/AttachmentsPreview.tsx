'use client'

import { FileText } from 'lucide-react'
import VoicePlayer from '../VoicePlayer'
import type { ComposerAttachment } from './types'
import { formatFileSize, getTruncatedFileName } from './utils'

interface AttachmentsPreviewProps {
	attachments: ComposerAttachment[]
	audioPreviewUrl: string | null
	onRemove: (attachmentId: string) => void
	onRetry: (attachmentId: string) => void
}

export function AttachmentsPreview({
	attachments,
	audioPreviewUrl,
	onRemove,
	onRetry,
}: AttachmentsPreviewProps) {
	if (attachments.length === 0) return null

	return (
		<div className='mb-3 space-y-3'>
			{attachments.map(attachment => {
				const isUploading = attachment.status === 'uploading'
				const isError = attachment.status === 'error'
				const progress = Math.round(attachment.uploadProgress)
				const isVoice = attachment.kind === 'voice'
				const isActiveVoice =
					isVoice && attachment.audioPreviewUrl === audioPreviewUrl

				if (
					isVoice &&
					attachment.audioPreviewUrl &&
					attachment.voiceMetadata
				) {
					return (
						<div
							key={attachment.id}
							className='rounded-lg border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm px-2 py-1.5 shadow-sm max-w-fit'
						>
							<VoicePlayer
								audioUrl={attachment.audioPreviewUrl}
								waveform={attachment.voiceMetadata.waveform || []}
								duration={attachment.voiceMetadata.duration || 0}
							/>
							{isUploading && (
								<div className='mt-1.5 w-full bg-emerald-500/10 rounded-full h-0.5 overflow-hidden'>
									<div
										className='h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-200'
										style={{ width: `${progress}%` }}
									/>
								</div>
							)}
							{isError && (
								<div className='mt-1.5 flex items-center gap-2'>
									<button
										type='button'
										onClick={() => onRetry(attachment.id)}
										className='px-2 py-0.5 text-[10px] rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors'
									>
										Повторить
									</button>
								</div>
							)}
							<div className='mt-1.5 flex items-center justify-between'>
								<div className='text-[10px] text-gray-400 truncate'>
									{getTruncatedFileName(attachment.name)}
								</div>
								<button
									type='button'
									onClick={() => onRemove(attachment.id)}
									className='w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/20 text-red-300 transition-colors flex-shrink-0'
									aria-label='Удалить вложение'
								>
									<svg
										className='w-3 h-3'
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
						</div>
					)
				}

				const renderPreview = () => {
					if (attachment.kind === 'image' && attachment.previewUrl) {
						return (
							<img
								src={attachment.previewUrl}
								alt={attachment.name}
								className='w-16 h-16 rounded-xl object-cover border border-slate-700/60'
							/>
						)
					}

					if (attachment.kind === 'video') {
						return (
							<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
								<svg
									className='w-6 h-6'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z'
									/>
								</svg>
							</div>
						)
					}

					if (attachment.kind === 'audio') {
						return (
							<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
								<svg
									className='w-6 h-6'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M9 19V6l12-2v13M5 11v8m-2-8h4'
									/>
								</svg>
							</div>
						)
					}

					return (
						<div className='w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-slate-300'>
							<FileText className='w-5 h-5' />
						</div>
					)
				}

				return (
					<div
						key={attachment.id}
						className={`rounded-2xl border ${
							isError
								? 'border-red-400/60 bg-red-500/5'
								: 'border-slate-700/60 bg-slate-800/60'
						} backdrop-blur-sm px-4 py-3 shadow-lg`}
					>
						<div className='flex items-center gap-3'>
							{renderPreview()}
							<div className='flex-1 min-w-0'>
								<div className='flex items-center justify-between gap-3'>
									<div className='min-w-0'>
										<div className='text-sm font-semibold text-slate-100 truncate'>
											{getTruncatedFileName(attachment.name)}
										</div>
										<div className='text-xs text-gray-400 flex items-center gap-1'>
											<span>{formatFileSize(attachment.size)}</span>
											{isUploading && <span>· {progress}%</span>}
										</div>
									</div>
									<div className='flex items-center gap-1'>
										{isError && (
											<button
												type='button'
												onClick={() => onRetry(attachment.id)}
												className='px-2 py-1 text-[11px] rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors'
											>
												Повторить
											</button>
										)}
										<button
											type='button'
											onClick={() => onRemove(attachment.id)}
											className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-300 transition-colors'
											aria-label='Удалить вложение'
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
								</div>
								{isUploading && (
									<div className='mt-2 w-full bg-slate-700/40 rounded-full h-1 overflow-hidden'>
										<div
											className='h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-200'
											style={{ width: `${progress}%` }}
										/>
									</div>
								)}
								{isError && (
									<div className='mt-2 text-xs text-amber-200 flex items-center gap-1'>
										<svg
											className='w-3 h-3'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
											/>
										</svg>
										<span>Не удалось загрузить</span>
									</div>
								)}
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}

