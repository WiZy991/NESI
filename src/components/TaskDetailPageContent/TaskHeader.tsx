'use client'

import Link from 'next/link'
import { Link as LinkIcon } from 'lucide-react'
import { copyToClipboard, getTaskUrl } from '@/lib/copyToClipboard'
import { toast } from 'sonner'
import FavoriteTaskButton from '../FavoriteTaskButton'
import AccountTypeBadge from '../AccountTypeBadge'
import { getUserProfileLink } from './utils'
import type { Task } from './types'

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&#x2F;/g, '/')
		.replace(/&#x2f;/g, '/')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
}

interface TaskHeaderProps {
	task: Task
	currentUserId?: string
}

export function TaskHeader({ task, currentUserId }: TaskHeaderProps) {
	return (
		<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-sm hover:shadow-[0_0_60px_rgba(16,185,129,0.4)] transition-all duration-500 group'>
			{/* Декоративные элементы */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700' />
			<div className='absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-700' />

			<div className='relative p-6 md:p-8 space-y-4 md:space-y-6'>
				{/* Заголовок с иконкой */}
				<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
					<div className='flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg'>
						<span className='text-2xl'>📋</span>
					</div>
					<div className='flex-1'>
						<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-2'>
							<h1 className='text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight flex-1 break-words'>
								{task.title}
							</h1>
							{/* Кнопки действий */}
							<div className='flex items-center gap-2 flex-shrink-0 sm:self-start'>
								{currentUserId && (
									<FavoriteTaskButton
										taskId={task.id}
										size='md'
										className='p-2 hover:bg-emerald-500/20 rounded-lg'
									/>
								)}
								<button
									onClick={async () => {
										const url = getTaskUrl(task.id)
										const success = await copyToClipboard(url)
										if (success) {
											toast.success('Ссылка скопирована')
										} else {
											toast.error('Не удалось скопировать ссылку')
										}
									}}
									className='p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all'
									title='Копировать ссылку на задачу'
									aria-label='Копировать ссылку'
								>
									<LinkIcon className='w-5 h-5' />
								</button>
							</div>
						</div>
						<div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400'>
							<div className='flex items-center gap-2 flex-wrap'>
								<span className='w-2 h-2 rounded-full bg-emerald-400'></span>
								<span>Автор</span>
								<Link
									href={getUserProfileLink(currentUserId, task.customer.id)}
									className='text-emerald-400 hover:text-emerald-300 font-medium transition-colors'
								>
									{task.customer?.fullName || 'Без имени'}
								</Link>
								<AccountTypeBadge accountType={task.customer.accountType} companyName={task.customer.companyName} size="xs" />
							</div>
							<div className='flex items-center gap-2'>
								<span className='text-gray-500'>•</span>
								<span>
									📅 {new Date(task.createdAt).toLocaleDateString('ru-RU')}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Описание */}
				<div className='bg-black/30 rounded-xl p-4 md:p-6 border border-gray-700/50'>
					<h3 className='text-base md:text-lg font-semibold text-emerald-300 mb-3 flex items-center gap-2'>
						<span>📝</span>
						Описание задачи
					</h3>
					<p className='text-gray-200 text-base md:text-lg leading-relaxed whitespace-pre-line break-words'>
						{decodeHtmlEntities(task.description)}
					</p>
				</div>
			</div>
		</div>
	)
}

