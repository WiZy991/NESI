'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { toast } from 'sonner'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'

interface ExecutorAnalytics {
	userId: string
	role: string
	createdAt: string
	completedTasksCount: number
	avgRating: number
	type: 'executor'
	period: string
	stats: {
		tasksExecuted: number
		tasksInProgress: number
		tasksCompleted: number
		totalEarned: number
		avgTaskPrice: number
		responseRate: number
		avgCompletionTime: number
		topCustomers: Array<{
			customer: {
				id: string
				fullName: string
				avgRating: number
			}
			tasksCount: number
		}>
		chartData: Array<{
			period: string
			total: number
			count: number
		}>
	}
}

export default function ExecutorAnalyticsPage() {
	const { token, user } = useUser()
	const [loading, setLoading] = useState(true)
	const [analytics, setAnalytics] = useState<ExecutorAnalytics | null>(null)
	const [selectedPeriod, setSelectedPeriod] = useState('month')

	useEffect(() => {
		if (!token || !user || user.role !== 'executor') return

		const fetchAnalytics = async () => {
			setLoading(true)
			try {
				const res = await fetch(`/api/users/me/analytics?period=${selectedPeriod}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (!res.ok) {
					const errorData = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }))
					toast.error(`Ошибка загрузки аналитики: ${errorData.error || 'Неизвестная ошибка'}`)
					return
				}

				const data = await res.json()
				if (data.type === 'executor') {
					setAnalytics(data)
				}
			} catch (err: any) {
				console.error('Ошибка загрузки аналитики:', err)
				toast.error('Ошибка загрузки аналитики')
			} finally {
				setLoading(false)
			}
		}

		fetchAnalytics()
	}, [token, user, selectedPeriod])

	if (!user || user.role !== 'executor') {
		return (
			<ProtectedPage>
				<div className="min-h-screen bg-black text-white p-8">
					<div className="max-w-4xl mx-auto text-center">
						<h1 className="text-2xl font-bold text-emerald-400 mb-4">
							Доступно только для исполнителей
						</h1>
					</div>
				</div>
			</ProtectedPage>
		)
	}

	if (loading) {
		return (
			<ProtectedPage>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-emerald-400 text-xl animate-pulse">Загрузка аналитики...</div>
				</div>
			</ProtectedPage>
		)
	}

	if (!analytics) {
		return (
			<ProtectedPage>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-red-400 text-xl">Не удалось загрузить данные</div>
				</div>
			</ProtectedPage>
		)
	}

	const { stats } = analytics
	const chartData = stats.chartData.map(item => ({
		date: item.period,
		earnings: item.total,
	}))

	const formatDate = (dateStr: string) => {
		if (selectedPeriod === 'day') return dateStr
		if (selectedPeriod === 'year') return dateStr
		try {
			const date = new Date(dateStr)
			return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
		} catch {
			return dateStr
		}
	}

	return (
		<ProtectedPage>
			<div className="min-h-screen bg-black text-white p-8">
				<div className="max-w-6xl mx-auto">
					{/* Заголовок */}
					<div className="mb-8">
						<h1 className="text-4xl font-bold text-emerald-400 mb-2">
							Персональная аналитика
						</h1>
						<p className="text-gray-400">Ваша статистика на платформе NESI</p>
					</div>

					{/* Период */}
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">Период</h2>
						<div className="flex gap-4">
							{['day', 'week', 'month', 'year'].map((period) => (
								<button
									key={period}
									onClick={() => setSelectedPeriod(period)}
									className={`px-6 py-2 rounded-lg border transition ${
										selectedPeriod === period
											? 'bg-emerald-500 border-emerald-500 text-white'
											: 'bg-black border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
									}`}
								>
									{period === 'day' ? 'День' : period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
								</button>
							))}
						</div>
					</div>

					{/* КПИ */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6">
							<div className="text-gray-400 text-sm mb-2">Выполнено задач</div>
							<div className="text-3xl font-bold text-emerald-400">{stats.tasksCompleted}</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6">
							<div className="text-gray-400 text-sm mb-2">Заработано</div>
							<div className="text-3xl font-bold text-emerald-400">
								{stats.totalEarned.toLocaleString('ru-RU')}₽
							</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6">
							<div className="text-gray-400 text-sm mb-2">Средний рейтинг</div>
							<div className="text-3xl font-bold text-emerald-400">
								{(analytics.avgRating || 0).toFixed(1)} ⭐
							</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6">
							<div className="text-gray-400 text-sm mb-2">Конверсия</div>
							<div className="text-3xl font-bold text-emerald-400">
								{stats.responseRate.toFixed(2)}%
							</div>
						</div>
					</div>

					{/* График динамики заработка */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 mb-8">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">Динамика заработка</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={350}>
								<LineChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
									<XAxis 
										dataKey="date" 
										stroke="#10b981" 
										tick={{ fill: '#10b981', fontSize: 12 }}
										tickFormatter={formatDate}
									/>
									<YAxis 
										stroke="#10b981" 
										tick={{ fill: '#10b981', fontSize: 12 }}
										tickFormatter={(value) => `${value}₽`}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: '#000000',
											border: '1px solid #10b981',
											borderRadius: '0.5rem',
											color: '#10b981',
										}}
										formatter={(value: number) => [`${value.toLocaleString('ru-RU')}₽`, 'Заработано']}
									/>
									<Legend wrapperStyle={{ color: '#10b981' }} />
									<Line
										type="monotone"
										dataKey="earnings"
										stroke="#10b981"
										strokeWidth={2}
										dot={{ fill: '#10b981', r: 4 }}
										name="Заработано"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[350px] text-gray-500">
								Нет данных за выбранный период
							</div>
						)}
					</div>

					{/* Общая информация */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">Общая информация</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<div className="text-gray-400 text-sm">Дата регистрации</div>
								<div className="text-emerald-400">
									{new Date(analytics.createdAt).toLocaleDateString('ru-RU')}
								</div>
							</div>
							<div>
								<div className="text-gray-400 text-sm">Роль</div>
								<div className="text-emerald-400">Исполнитель</div>
							</div>
							<div>
								<div className="text-gray-400 text-sm">Всего задач</div>
								<div className="text-emerald-400">{stats.tasksExecuted}</div>
							</div>
							<div>
								<div className="text-gray-400 text-sm">Средний рейтинг</div>
								<div className="text-emerald-400">
									{(analytics.avgRating || 0).toFixed(1)} ⭐
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ProtectedPage>
	)
}

