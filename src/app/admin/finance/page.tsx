'use client'

import { useEffect, useState } from 'react'

export default function FinancePage() {
	const [transactions, setTransactions] = useState([])
	const [filter, setFilter] = useState('all')
	const [platformEarnings, setPlatformEarnings] = useState(null)
	const [loadingEarnings, setLoadingEarnings] = useState(true)

	useEffect(() => {
		fetch(`/api/admin/finance${filter !== 'all' ? `?type=${filter}` : ''}`)
			.then(res => res.json())
			.then(setTransactions)
	}, [filter])

	useEffect(() => {
		// Загружаем статистику комиссий платформы
		fetch('/api/admin/platform-earnings')
			.then(res => res.json())
			.then(data => {
				if (!data.error) {
					setPlatformEarnings(data)
				}
				setLoadingEarnings(false)
			})
			.catch(() => setLoadingEarnings(false))
	}, [])

	async function changeStatus(id, status) {
		await fetch(`/api/admin/finance`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, status }),
		})
		setTransactions(prev => prev.map(t => (t.id === id ? { ...t, status } : t)))
	}

	return (
		<div className='p-6 text-white'>
			<h1 className='text-2xl font-bold mb-6'>Финансы</h1>

			{/* 💰 Статистика комиссий платформы */}
			{!loadingEarnings && platformEarnings && (
				<div className='mb-8 bg-gradient-to-br from-emerald-900/40 to-green-900/20 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]'>
					<h2 className='text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2'>
						<span className='text-2xl'>💰</span>
						Комиссии платформы (20%)
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
						<div className='bg-black/30 rounded-lg p-4 border border-emerald-500/20'>
							<p className='text-gray-400 text-sm mb-1'>За сегодня</p>
							<p className='text-2xl font-bold text-emerald-300'>
								{platformEarnings.statistics.today.amount.toFixed(2)} ₽
							</p>
							<p className='text-xs text-gray-500 mt-1'>
								{platformEarnings.statistics.today.count} транзакций
							</p>
						</div>

						<div className='bg-black/30 rounded-lg p-4 border border-emerald-500/20'>
							<p className='text-gray-400 text-sm mb-1'>За неделю</p>
							<p className='text-2xl font-bold text-emerald-300'>
								{platformEarnings.statistics.weekly.amount.toFixed(2)} ₽
							</p>
							<p className='text-xs text-gray-500 mt-1'>
								{platformEarnings.statistics.weekly.count} транзакций
							</p>
						</div>

						<div className='bg-black/30 rounded-lg p-4 border border-emerald-500/20'>
							<p className='text-gray-400 text-sm mb-1'>За месяц</p>
							<p className='text-2xl font-bold text-emerald-300'>
								{platformEarnings.statistics.monthly.amount.toFixed(2)} ₽
							</p>
							<p className='text-xs text-gray-500 mt-1'>
								{platformEarnings.statistics.monthly.count} транзакций
							</p>
						</div>

						<div className='bg-black/30 rounded-lg p-4 border border-emerald-500/20'>
							<p className='text-gray-400 text-sm mb-1'>Всего заработано</p>
							<p className='text-2xl font-bold text-emerald-400'>
								{platformEarnings.statistics.total.amount.toFixed(2)} ₽
							</p>
							<p className='text-xs text-gray-500 mt-1'>
								{platformEarnings.statistics.total.count} транзакций
							</p>
						</div>
					</div>

					{/* Последние комиссии */}
					{platformEarnings.recentTransactions.length > 0 && (
						<div>
							<h3 className='text-md font-semibold text-emerald-300 mb-3'>
								🕒 Последние комиссии
							</h3>
							<div className='bg-black/20 rounded-lg overflow-hidden border border-emerald-500/10'>
								<table className='w-full text-sm'>
									<thead className='bg-emerald-900/30'>
										<tr>
											<th className='p-2 text-left text-emerald-300'>Дата</th>
											<th className='p-2 text-left text-emerald-300'>Сумма</th>
											<th className='p-2 text-left text-emerald-300'>
												Причина
											</th>
										</tr>
									</thead>
									<tbody>
										{platformEarnings.recentTransactions
											.slice(0, 10)
											.map(tx => (
												<tr
													key={tx.id}
													className='border-b border-gray-800/50 hover:bg-emerald-500/5'
												>
													<td className='p-2 text-gray-400'>
														{new Date(tx.createdAt).toLocaleString('ru-RU')}
													</td>
													<td className='p-2 font-semibold text-emerald-400'>
														+{tx.amount.toFixed(2)} ₽
													</td>
													<td className='p-2 text-gray-300'>{tx.reason}</td>
												</tr>
											))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			)}

			{loadingEarnings && (
				<div className='mb-8 bg-gray-900/40 border border-gray-700 rounded-xl p-6 text-center'>
					<p className='text-gray-400'>Загрузка статистики комиссий...</p>
				</div>
			)}

			<h2 className='text-xl font-semibold mb-4 text-emerald-400'>
				Все транзакции
			</h2>

			<div className='mb-4 flex gap-2'>
				{['all', 'deposit', 'withdraw', 'escrow', 'payout'].map(type => (
					<button
						key={type}
						onClick={() => setFilter(type)}
						className={`px-3 py-1 rounded ${
							filter === type ? 'bg-green-600' : 'bg-gray-800'
						}`}
					>
						{type === 'all' ? 'Все' : type}
					</button>
				))}
			</div>

			<table className='w-full text-sm border-collapse'>
				<thead>
					<tr className='bg-green-900/30'>
						<th className='p-2 text-left'>ID</th>
						<th className='p-2 text-left'>Пользователь</th>
						<th className='p-2 text-left'>Сумма</th>
						<th className='p-2 text-left'>Тип</th>
						<th className='p-2 text-left'>Статус</th>
						<th className='p-2 text-left'>Дата</th>
						<th className='p-2 text-left'>Действия</th>
					</tr>
				</thead>
				<tbody>
					{transactions.map(t => (
						<tr key={t.id} className='border-b border-gray-700'>
							<td className='p-2'>{t.id.slice(0, 8)}...</td>
							<td className='p-2'>{t.user?.email || '—'}</td>
							<td className='p-2'>{t.amount} ₽</td>
							<td className='p-2 capitalize'>{t.type}</td>
							<td className='p-2'>{t.status}</td>
							<td className='p-2'>
								{new Date(t.createdAt).toLocaleDateString()}
							</td>
							<td className='p-2 flex gap-2'>
								{['approved', 'rejected'].map(s => (
									<button
										key={s}
										onClick={() => changeStatus(t.id, s)}
										className={`px-2 py-1 rounded ${
											s === 'approved' ? 'bg-green-700' : 'bg-red-700'
										}`}
									>
										{s === 'approved' ? 'Одобрить' : 'Отклонить'}
									</button>
								))}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
