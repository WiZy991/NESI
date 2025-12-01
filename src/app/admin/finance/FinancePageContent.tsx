'use client'

import { useEffect, useState } from 'react'

export default function FinancePageContent() {
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
		// Implementation for changing transaction status
		const res = await fetch('/api/admin/finance', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, status }),
		})
		if (res.ok) {
			// Refresh transactions
			fetch(`/api/admin/finance${filter !== 'all' ? `?type=${filter}` : ''}`)
				.then(res => res.json())
				.then(setTransactions)
		}
	}

	return (
		<div>
			<h1 className="text-3xl font-bold text-emerald-400 mb-6">Финансы</h1>
			
			{/* Platform Earnings Section */}
			{platformEarnings && (
				<div className="mb-6 bg-black/40 border border-emerald-500/20 rounded-xl p-6">
					<h2 className="text-xl font-bold text-emerald-400 mb-4">Статистика платформы</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div className="text-sm text-gray-400">Всего комиссий</div>
							<div className="text-2xl font-bold text-emerald-400">
								{platformEarnings.statistics?.total?.amount?.toFixed(2) || 0} ₽
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-400">За месяц</div>
							<div className="text-2xl font-bold text-green-400">
								{platformEarnings.statistics?.monthly?.amount?.toFixed(2) || 0} ₽
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-400">За неделю</div>
							<div className="text-2xl font-bold text-yellow-400">
								{platformEarnings.statistics?.weekly?.amount?.toFixed(2) || 0} ₽
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-400">Сегодня</div>
							<div className="text-2xl font-bold text-cyan-400">
								{platformEarnings.statistics?.today?.amount?.toFixed(2) || 0} ₽
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="mb-4 flex gap-2">
				{['all', 'deposit', 'withdrawal', 'payment', 'commission', 'refund'].map(type => (
					<button
						key={type}
						onClick={() => setFilter(type)}
						className={`px-4 py-2 rounded-lg ${
							filter === type
								? 'bg-emerald-600 text-white'
								: 'bg-black/40 text-gray-400 hover:bg-black/60'
						}`}
					>
						{type === 'all' ? 'Все' : type}
					</button>
				))}
			</div>

			{/* Transactions List */}
			<div className="bg-black/40 border border-emerald-500/20 rounded-xl overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-emerald-900/20 border-b border-emerald-500/20">
							<th className="p-4 text-left text-emerald-400">ID</th>
							<th className="p-4 text-left text-emerald-400">Пользователь</th>
							<th className="p-4 text-left text-emerald-400">Тип</th>
							<th className="p-4 text-left text-emerald-400">Сумма</th>
							<th className="p-4 text-left text-emerald-400">Дата</th>
						</tr>
					</thead>
					<tbody>
						{transactions.map((tx: any) => (
							<tr key={tx.id} className="border-b border-gray-800">
								<td className="p-4 text-gray-400 font-mono text-xs">{tx.id.slice(0, 8)}...</td>
								<td className="p-4 text-gray-300">{tx.user?.email || '—'}</td>
								<td className="p-4 text-gray-300">{tx.type}</td>
								<td className="p-4 text-emerald-400">{Number(tx.amount).toFixed(2)} ₽</td>
								<td className="p-4 text-gray-400">
									{new Date(tx.createdAt).toLocaleString('ru-RU')}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

