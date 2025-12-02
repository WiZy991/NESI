'use client'

import CancelExecutorButton from '../CancelExecutorButton'
import CompleteTaskButton from '../CompleteTaskButton'
import TaskActionsClient from '../TaskActionsClient'
import type { Task } from './types'

type TaskActionsSectionProps = {
	task: Task
	isCustomer: boolean
	disputeInfo?: {
		status: 'open' | 'resolved' | 'rejected'
		adminDecision?: 'customer' | 'executor'
		resolution?: string | null
	} | null
}

export function TaskActionsSection({ task, isCustomer, disputeInfo }: TaskActionsSectionProps) {
	if (!isCustomer) {
		return null
	}

	// Проверяем, есть ли решенный спор в пользу исполнителя
	const isDisputeResolvedForExecutor = 
		disputeInfo?.status === 'resolved' && 
		disputeInfo?.adminDecision === 'executor'

	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
			<div className='flex items-center gap-3 mb-4'>
				<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
					<span className='text-sm'>⚡</span>
				</div>
				<h3 className='text-lg font-semibold text-emerald-300'>Действия</h3>
			</div>
			<div className='space-y-4'>
				<TaskActionsClient
					taskId={task.id}
					authorId={task.customerId}
					status={task.status}
				/>

				{task.status === 'in_progress' && !isDisputeResolvedForExecutor && (
					<div className='flex flex-wrap gap-3'>
						<CompleteTaskButton taskId={task.id} authorId={task.customerId} />
						<CancelExecutorButton taskId={task.id} />
					</div>
				)}

				{isDisputeResolvedForExecutor && (
					<div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4'>
						<p className='text-yellow-400 text-sm'>
							⚠️ Спор по этой задаче решен в пользу исполнителя. Действия недоступны.
						</p>
					</div>
				)}
			</div>
		</div>
	)
}

