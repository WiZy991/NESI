'use client'

import type { DisputeInfo } from './types'

interface DisputeStatusProps {
	disputeInfo: DisputeInfo | null
}

export function DisputeStatus({ disputeInfo }: DisputeStatusProps) {
	if (!disputeInfo) return null

	if (disputeInfo.status === 'open') {
		return (
			<div className='mt-6 p-5 rounded-xl bg-yellow-900/20 border border-yellow-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.1)]'>
				<h2 className='text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2'>
					⚖️ Спор на рассмотрении
				</h2>
				<p className='text-gray-300 leading-relaxed'>
					Администратор изучает материалы по задаче. Пожалуйста, ожидайте решения —
					как только оно будет принято, вы увидите его здесь.
				</p>
			</div>
		)
	}

	if (disputeInfo.status === 'resolved') {
		return (
			<div className='mt-6 p-5 rounded-xl bg-emerald-900/20 border border-emerald-600/40 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.25)]'>
				<h2 className='text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2'>
					✅ Решение администратора
				</h2>
				<p className='text-gray-200 mb-1'>
					Спор решён{' '}
					<span className='font-semibold text-emerald-400'>
						{disputeInfo.adminDecision === 'customer'
							? 'в пользу заказчика'
							: 'в пользу исполнителя'}
					</span>
				</p>
				{disputeInfo.resolution ? (
					<blockquote className='text-gray-300 italic border-l-4 border-emerald-500/60 pl-3 mt-2'>
						«{disputeInfo.resolution}»
					</blockquote>
				) : (
					<p className='text-gray-500 italic mt-2'>
						Комментарий администратора отсутствует.
					</p>
				)}
				<p className='text-xs text-gray-500 mt-3 italic'>
					Система автоматически обновила статус задачи на основании решения
					администратора.
				</p>
			</div>
		)
	}

	if (disputeInfo.status === 'rejected') {
		return (
			<div className='mt-6 p-5 rounded-xl bg-red-900/20 border border-red-700/40 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]'>
				<h2 className='text-lg font-semibold text-red-400 mb-2 flex items-center gap-2'>
					❌ Спор отклонён
				</h2>
				<p className='text-gray-300 leading-relaxed'>
					Администратор отклонил спор. Решение считается окончательным.
				</p>
			</div>
		)
	}

	return null
}

