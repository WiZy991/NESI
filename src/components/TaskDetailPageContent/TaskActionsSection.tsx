'use client'

import CancelExecutorButton from '../CancelExecutorButton'
import CompleteTaskButton from '../CompleteTaskButton'
import TaskActionsClient from '../TaskActionsClient'
import type { Task } from './types'

type TaskActionsSectionProps = {
	task: Task
	isCustomer: boolean
}

export function TaskActionsSection({ task, isCustomer }: TaskActionsSectionProps) {
	if (!isCustomer) {
		return null
	}

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

				{task.status === 'in_progress' && (
					<div className='flex flex-wrap gap-3'>
						<CompleteTaskButton taskId={task.id} authorId={task.customerId} />
						<CancelExecutorButton taskId={task.id} />
					</div>
				)}
			</div>
		</div>
	)
}

