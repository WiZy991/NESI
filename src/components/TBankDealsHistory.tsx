'use client'

import { useEffect, useState } from 'react'
import {
	FaChartLine,
	FaCheckCircle,
	FaSpinner,
	FaTimesCircle,
} from 'react-icons/fa'

type Deal = {
	id: string
	spAccumulationId: string
	status: string
	totalAmount: number
	paidAmount: number
	remainingBalance: number
	createdAt: string
	closedAt: string | null
	paymentsCount: number
	payoutsCount: number
}

export default function TBankDealsHistory({ token }: { token: string }) {
	const [deals, setDeals] = useState<Deal[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchDeals = async () => {
			try {
				const res = await fetch('/api/tbank/deals/list', {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (res.ok) {
					const data = await res.json()
					setDeals(data.deals || [])
				}
			} catch (error) {
				console.error('Ошибка загрузки сделок:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchDeals()
	}, [token])

	if (loading) {
		return (
			<div className='bg-black/40 p-6 rounded-2xl border border-emerald-500/30'>
				<div className='flex items-center justify-center py-8'>
					<FaSpinner className='animate-spin text-emerald-400 text-3xl' />
				</div>
			</div>
		)
	}

	if (deals.length === 0) {
		return (
			<div className='bg-black/40 p-6 rounded-2xl border border-emerald-500/30'>
				<h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
					<FaChartLine className='text-emerald-400' />
					История сделок Т-Банк
				</h3>
				<p className='text-gray-400 text-center py-4'>
					Пока нет сделок с Т-Банком
				</p>
			</div>
		)
	}

	return (
		<div className='bg-black/40 p-6 rounded-2xl border border-emerald-500/30'>
			<h3 className='text-lg font-bold text-white mb-4 flex items-center gap-2'>
				<FaChartLine className='text-emerald-400' />
				История сделок Т-Банк
			</h3>

			<div className='space-y-3'>
				{deals.map(deal => (
					<div
						key={deal.id}
						className='bg-black/60 p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all'
					>
						<div className='flex items-start justify-between mb-2'>
							<div>
								<p className='text-sm font-semibold text-gray-200'>
									Сделка #{deal.spAccumulationId.slice(-8)}
								</p>
								<p className='text-xs text-gray-500'>
									{new Date(deal.createdAt).toLocaleDateString('ru-RU', {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
									})}
								</p>
							</div>
							<div className='flex items-center gap-2'>
								{deal.status === 'OPEN' && (
									<span className='px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1'>
										<FaCheckCircle />
										Открыта
									</span>
								)}
								{deal.status === 'CLOSED' && (
									<span className='px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded-lg'>
										Закрыта
									</span>
								)}
								{deal.status === 'PARTIAL_CANCELED' && (
									<span className='px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-lg flex items-center gap-1'>
										<FaTimesCircle />
										Частично отменена
									</span>
								)}
							</div>
						</div>

						<div className='grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-700/50'>
							<div>
								<p className='text-xs text-gray-500'>Поступило</p>
								<p className='text-sm font-bold text-emerald-400'>
									{deal.totalAmount.toFixed(2)} ₽
								</p>
								<p className='text-xs text-gray-600'>
									{deal.paymentsCount} платежей
								</p>
							</div>
							<div>
								<p className='text-xs text-gray-500'>Выплачено</p>
								<p className='text-sm font-bold text-red-400'>
									{deal.paidAmount.toFixed(2)} ₽
								</p>
								<p className='text-xs text-gray-600'>
									{deal.payoutsCount} выплат
								</p>
							</div>
							<div>
								<p className='text-xs text-gray-500'>Остаток</p>
								<p className='text-sm font-bold text-gray-300'>
									{deal.remainingBalance.toFixed(2)} ₽
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
