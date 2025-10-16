'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts'

type StatsData = {
	usersCount: number
	tasksCount: number
	responsesCount: number
	reviewsCount?: number
	activeTasks?: number
	subcategoriesStats: {
		_avg: { minPrice: number }
		_min: { minPrice: number }
		_max: { minPrice: number }
	}
	topSubcategories: { name: string; minPrice: number }[]
}

export default function AdminStatsPage() {
	const [data, setData] = useState<StatsData | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const res = await fetch('/api/admin/stats')
				if (!res.ok) throw new Error('Ошибка загрузки статистики')
				const json = await res.json()
				setData(json)
			} catch (err) {
				console.error(err)
			} finally {
				setLoading(false)
			}
		}
		fetchStats()
	}, [])

	if (loading)
		return (
			<div className="p-8 text-gray-400 animate-pulse">
				Загрузка статистики...
			</div>
		)

	if (!data)
		return (
			<div className="p-8 text-red-400">
				Ошибка: не удалось загрузить данные статистики.
			</div>
		)

	return (
		<div className="p-8 text-gray-100 bg-gradient-to-b from-black via-[#00281e] to-black min-h-screen">
			<h1 className="text-3xl font-bold text-emerald-400 mb-8">
				📊 Статистика платформы NESI
			</h1>

			{/* Основные карточки */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
				<StatCard title="Пользователи" value={data.usersCount} />
				<StatCard title="Задачи" value={data.tasksCount} />
				<StatCard title="Отклики" value={data.responsesCount} />
				{data.reviewsCount !== undefined && (
					<StatCard title="Отзывы" value={data.reviewsCount} />
				)}
			</div>

			{/* Средние ставки */}
			<Card className="bg-black/50 border border-emerald-500/30 mb-10 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
				<CardContent className="p-6">
					<h2 className="text-lg font-semibold text-emerald-400 mb-3">
						💰 Минимальные ставки
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<MiniStat label="Средняя" value={`${data.subcategoriesStats._avg.minPrice.toFixed(0)} ₽`} />
						<MiniStat label="Минимальная" value={`${data.subcategoriesStats._min.minPrice} ₽`} />
						<MiniStat label="Максимальная" value={`${data.subcategoriesStats._max.minPrice} ₽`} />
					</div>
				</CardContent>
			</Card>

			{/* ТОП подкатегорий */}
			<Card className="bg-black/50 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
				<CardContent className="p-6">
					<h2 className="text-lg font-semibold text-emerald-400 mb-6">
						🔥 Топ подкатегорий по ставке
					</h2>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.topSubcategories}>
								<CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
								<XAxis dataKey="name" stroke="#9ca3af" />
								<YAxis stroke="#9ca3af" />
								<Tooltip
									contentStyle={{
										backgroundColor: '#0d0d0d',
										border: '1px solid #10b981',
										borderRadius: '0.5rem',
										color: '#fff',
									}}
								/>
								<Bar dataKey="minPrice" fill="#10b981" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function StatCard({ title, value }: { title: string; value: number | string }) {
	return (
		<Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition">
			<CardContent className="p-5 text-center">
				<p className="text-gray-400 text-sm mb-2">{title}</p>
				<p className="text-3xl font-bold text-emerald-400">{value}</p>
			</CardContent>
		</Card>
	)
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="text-center">
			<p className="text-gray-400 text-sm mb-1">{label}</p>
			<p className="text-xl text-emerald-400 font-semibold">{value}</p>
		</div>
	)
}
