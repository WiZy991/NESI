'use client'

import Link from 'next/link'
import { getStatusName, statusColors } from './utils'
import type { Task } from './types'
import AccountTypeBadge from '@/components/AccountTypeBadge'

interface TaskInfoPanelProps {
	task: Task
}

export function TaskInfoPanel({ task }: TaskInfoPanelProps) {
	return (
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
			{/* Статус */}
			<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] group'>
				<div className='flex items-center gap-3 mb-3'>
					<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
						<span className='text-lg'>📊</span>
					</div>
					<h3 className='text-base md:text-lg font-semibold text-white'>
						Статус
					</h3>
				</div>
				<div
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColors[task.status]}`}
				>
					<span className='text-sm font-medium'>{getStatusName(task.status)}</span>
				</div>
			</div>

			{/* Категория */}
			{task.subcategory && (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] group'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center'>
							<span className='text-lg'>🏷️</span>
						</div>
						<h3 className='text-base md:text-lg font-semibold text-white'>
							Категория
						</h3>
					</div>
					<div className='space-y-2'>
						<Link
							href={`/tasks?subcategory=${task.subcategory.id}`}
							className='text-white font-medium transition-colors hover:text-blue-300 block'
						>
							{task.subcategory.name}
						</Link>
						{task.subcategory.minPrice != null && Number(task.subcategory.minPrice) > 0 && (
							<div className='flex items-center gap-2 text-emerald-400'>
								<span className='text-lg'>💰</span>
								<span className='text-sm font-medium'>
									Мин. ставка:{' '}
									{Number(task.subcategory.minPrice).toLocaleString('ru-RU', {
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									})}{' '}
									₽
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Исполнитель или Цена */}
			{task.executor ? (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] group'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center'>
							<span className='text-lg'>👤</span>
						</div>
						<h3 className='text-base md:text-lg font-semibold text-white'>
							Исполнитель
						</h3>
					</div>
					<div className='flex items-center gap-2 flex-wrap'>
						<Link
							href={`/users/${task.executor.id}`}
							className='text-emerald-400 font-medium hover:text-emerald-300 hover:underline transition-colors'
						>
							{task.executor.fullName || task.executor.email}
						</Link>
						<AccountTypeBadge accountType={task.executor.accountType} size="sm" />
					</div>
				</div>
			) : (
				<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] group'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
							<span className='text-lg'>💰</span>
						</div>
						<h3 className='text-base md:text-lg font-semibold text-emerald-300'>
							Цена
						</h3>
					</div>
					<div className='text-2xl md:text-3xl font-bold text-emerald-400'>
						{task.price != null
							? Number(task.price).toLocaleString('ru-RU', {
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
							  })
							: '—'}{' '}
						₽
					</div>
				</div>
			)}
		</div>
	)
}

