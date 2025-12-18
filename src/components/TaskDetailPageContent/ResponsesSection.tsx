'use client'

import Link from 'next/link'
import AssignExecutorButton from '../AssignExecutorButton'
import AccountTypeBadge from '../AccountTypeBadge'
import { getUserProfileLink } from './utils'
import type { Task } from './types'
import { LevelBadge } from '../LevelBadge'
import { getLevelVisuals } from '@/lib/level/rewards'
import '@/styles/level-animations.css'
import PriceComparisonWidget from '../PriceComparisonWidget'

type ResponsesSectionProps = {
	task: Task
	currentUserId?: string
	isCustomer: boolean
}

export function ResponsesSection({
	task,
	currentUserId,
	isCustomer,
}: ResponsesSectionProps) {
	if (!isCustomer) {
		return null
	}

	// Если задача уже назначена исполнителю, не показываем отклики
	if (task.executorId) {
		return null
	}

	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
			<div className='flex items-center gap-3 mb-6'>
				<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
					<span className='text-sm'>💬</span>
				</div>
				<h3 className='text-lg font-semibold text-emerald-300'>
					Отклики исполнителей
				</h3>
				<span className='bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full text-sm font-medium'>
					{task.responses.length}
				</span>
			</div>

			{task.responses.length === 0 ? (
				<div className='text-center py-8'>
					<div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center'>
						<span className='text-2xl text-gray-500'>💭</span>
					</div>
					<p className='text-gray-500 text-lg'>Пока нет откликов</p>
					<p className='text-gray-600 text-sm mt-1'>
						Исполнители смогут откликнуться на вашу задачу
					</p>
				</div>
			) : (
				<div className='space-y-4'>
					{task.responses?.map((response: any) => {
						const userLevel = response.userLevel || 1
						const visuals = getLevelVisuals(userLevel)
						
						// Определяем класс рамки на основе уровня
						const borderClass = 
							userLevel >= 6
								? 'border-yellow-400/50 hover:border-yellow-400/70 level-6-animated'
								: userLevel === 5
								? 'border-yellow-400/40 hover:border-yellow-400/60 level-5-animated'
								: userLevel === 4
								? 'border-purple-400/40 hover:border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
								: userLevel === 3
								? 'border-blue-400/40 hover:border-blue-400/60 shadow-[0_0_15px_rgba(96,165,250,0.15)]'
								: userLevel === 2
								? 'border-green-400/40 hover:border-green-400/60 shadow-[0_0_15px_rgba(74,222,128,0.15)]'
								: 'border-emerald-500/20 hover:border-emerald-500/40'

						return (
							<div
								key={response.id}
								className={`bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-4 md:p-6 border-2 ${borderClass} transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm`}
							>
								<div className='flex items-start justify-between mb-4'>
									<div className='flex items-center gap-3'>
										<div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border-2 ${visuals.borderClass || 'border-emerald-500'}`}>
											<span className='text-lg'>{visuals.icon || '👤'}</span>
										</div>
										<div>
											<div className='flex items-center gap-2 flex-wrap'>
												<Link
													href={getUserProfileLink(currentUserId, response.user.id)}
													className='text-emerald-400 hover:text-emerald-300 font-semibold text-lg transition-colors'
												>
													{response.user.fullName || response.user.email}
												</Link>
												<LevelBadge level={userLevel} size="sm" />
												<AccountTypeBadge accountType={response.user.accountType} size="xs" />
											</div>
											<p className='text-sm text-gray-400'>
												📅{' '}
												{new Date(response.createdAt).toLocaleDateString('ru-RU')}
											</p>
										</div>
									</div>
									{response.price && (
										<div className='text-right'>
											<div className='bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-2'>
												💰 {typeof response.price === 'number' ? response.price.toLocaleString('ru-RU') : response.price} ₽
											</div>
											<PriceComparisonWidget
												subcategoryId={task.subcategoryId || task.subcategory?.id || null}
												responsePrice={typeof response.price === 'number' ? response.price : parseFloat(String(response.price).replace(/\s/g, '')) || null}
												taskId={task.id}
												taskTitle={task.title || null}
												taskDescription={task.description || null}
											/>
										</div>
									)}
								</div>

							{response.message && (
								<div className='bg-gray-900/30 rounded-lg p-3 md:p-4 mb-4 border border-gray-800/50'>
									<p className='text-gray-200 leading-relaxed'>
										{response.message}
									</p>
								</div>
							)}

							{task.status === 'open' && isCustomer && (
								<div className='flex justify-end'>
									<AssignExecutorButton
										taskId={task.id}
										executorId={response.userId}
									/>
								</div>
							)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

