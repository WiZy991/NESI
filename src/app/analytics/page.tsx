'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { toast } from 'sonner'
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	AreaChart,
	Area,
	PieChart,
	Pie,
	Cell,
} from 'recharts'
import Link from 'next/link'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

interface DashboardData {
	period: number
	metrics: {
		totalTasks: number
		completedTasks: number
		inProgressTasks: number
		openTasks: number
		totalSpent: number
		totalResponses: number
		hiredExecutors: number
		conversionRate: number
		avgPrice: number
		avgCompletionTime: number
		avgExecutorRating: number
	}
	dailyStats: Array<{
		date: string
		tasks: number
		spent: number
		responses: number
	}>
	categoryStats: Array<{
		categoryName: string
		subcategoryName: string
		subcategoryId: string
		taskCount: number
		avgPrice: number
		avgCompletionTime: number
		responsesCount: number
		successRate: number
	}>
	topExecutors: Array<{
		executorId: string
		executorName: string
		executorEmail: string
		executorRating: number
		taskCount: number
		avgPrice: number
		totalSpent: number
		avgSpeed: number
	}>
	financialByCategory: Array<{
		categoryName: string
		subcategoryName: string
		totalSpent: number
		avgPrice: number
	}>
	monthlyKPIs: Array<{
		month: string
		tasks: number
		spent: number
		tasksGrowth: number
		spentGrowth: number
	}>
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#a855f7']

export default function AnalyticsPage() {
	const { token, user } = useUser()
	const [loading, setLoading] = useState(true)
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
	const [selectedPeriod, setSelectedPeriod] = useState('30')
	const [sortField, setSortField] = useState<keyof DashboardData['categoryStats'][0]>('taskCount')
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

	// Проверяем роль - аналитика только для заказчиков
	if (user && user.role !== 'customer') {
		// Редирект для исполнителей на их страницу аналитики
		if (typeof window !== 'undefined') {
			window.location.href = '/analytics/executor'
		}
		return null
	}

	useEffect(() => {
		if (!token || !user || user.role !== 'customer') return

		const fetchDashboard = async () => {
			setLoading(true)
			try {
				const res = await fetch(`/api/analytics/dashboard?period=${selectedPeriod}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (!res.ok) {
					let errorData: any = {}
					try {
						const text = await res.text()
						if (text) {
							errorData = JSON.parse(text)
						}
					} catch (parseError) {
						errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
					}
					
					console.error('Ошибка загрузки аналитики:', {
						status: res.status,
						statusText: res.statusText,
						error: errorData,
					})
					
					const errorMessage = errorData.error || errorData.details || `HTTP ${res.status}: ${res.statusText}`
					toast.error(`Ошибка загрузки аналитики: ${errorMessage}`)
					setDashboardData(null)
					return
				}

				const data = await res.json()
				setDashboardData(data)
			} catch (err: any) {
				console.error('Ошибка загрузки аналитики:', err)
				toast.error(`Ошибка загрузки аналитики: ${err?.message || 'Неизвестная ошибка'}`)
			} finally {
				setLoading(false)
			}
		}

		fetchDashboard()
	}, [token, selectedPeriod, user])

	const handleSort = (field: keyof DashboardData['categoryStats'][0]) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('desc')
		}
	}

	const handleExportPDF = () => {
		if (!dashboardData) {
			toast.error('Нет данных для экспорта')
			return
		}

		try {
			const metrics = dashboardData.metrics
			const doc = new jsPDF()
			const pageWidth = doc.internal.pageSize.getWidth()
			const pageHeight = doc.internal.pageSize.getHeight()
			let yPos = 20
			const margin = 20
			const lineHeight = 7

			// Заголовок
			doc.setFontSize(18)
			doc.setTextColor(16, 185, 129) // emerald-500
			doc.text('Аналитика заказчика', margin, yPos)
			yPos += 10

			// Период
			doc.setFontSize(12)
			doc.setTextColor(0, 0, 0)
			const periodText = selectedPeriod === '7' ? 'Неделя' : selectedPeriod === '30' ? 'Месяц' : selectedPeriod === '90' ? 'Квартал' : 'Год'
			doc.text(`Период: ${periodText}`, margin, yPos)
			yPos += 10

			// Дата генерации
			doc.setFontSize(10)
			doc.setTextColor(100, 100, 100)
			doc.text(`Сгенерировано: ${new Date().toLocaleString('ru-RU')}`, margin, yPos)
			yPos += 15

			// Ключевые метрики
			doc.setFontSize(14)
			doc.setTextColor(0, 0, 0)
			doc.text('Ключевые метрики', margin, yPos)
			yPos += 8

			doc.setFontSize(10)
			const metricsList = [
				`Опубликовано задач: ${metrics.totalTasks}`,
				`Завершено задач: ${metrics.completedTasks}`,
				`В работе: ${metrics.inProgressTasks}`,
				`Открытых: ${metrics.openTasks}`,
				`Откликов: ${metrics.totalResponses}`,
				`Нанято исполнителей: ${metrics.hiredExecutors}`,
				`Конверсия: ${metrics.conversionRate.toFixed(2)}%`,
				`Средняя стоимость: ${metrics.avgPrice > 0 ? Math.round(metrics.avgPrice).toLocaleString('ru-RU') : 0} ₽`,
				`Среднее время: ${metrics.avgCompletionTime > 0 ? Math.round(metrics.avgCompletionTime) : 0} дн.`,
				`Общие траты: ${metrics.totalSpent > 0 ? Math.round(metrics.totalSpent).toLocaleString('ru-RU') : 0} ₽`,
				`Средний рейтинг: ${metrics.avgExecutorRating > 0 ? metrics.avgExecutorRating.toFixed(1) : 0} ⭐`,
			]

			metricsList.forEach(metric => {
				if (yPos > pageHeight - 20) {
					doc.addPage()
					yPos = 20
				}
				doc.text(metric, margin + 5, yPos)
				yPos += lineHeight
			})

			yPos += 5

			// Аналитика по категориям
			if (dashboardData.categoryStats && dashboardData.categoryStats.length > 0) {
				if (yPos > pageHeight - 40) {
					doc.addPage()
					yPos = 20
				}

				doc.setFontSize(14)
				doc.text('Аналитика по категориям', margin, yPos)
				yPos += 8

				doc.setFontSize(9)
				// Заголовки таблицы
				doc.text('Категория', margin, yPos)
				doc.text('Задач', margin + 50, yPos)
				doc.text('Средняя цена', margin + 70, yPos)
				doc.text('Средний срок', margin + 100, yPos)
				doc.text('Откликов', margin + 125, yPos)
				doc.text('Успешность', margin + 145, yPos)
				yPos += 5

				dashboardData.categoryStats.slice(0, 10).forEach(stat => {
					if (yPos > pageHeight - 20) {
						doc.addPage()
						yPos = 20
					}
					doc.text(stat.subcategoryName || stat.categoryName || 'Неизвестно', margin, yPos)
					doc.text(stat.taskCount.toString(), margin + 50, yPos)
					doc.text(`${Math.round(stat.avgPrice).toLocaleString('ru-RU')} ₽`, margin + 70, yPos)
					doc.text(`${Math.round(stat.avgCompletionTime)} дн.`, margin + 100, yPos)
					doc.text(stat.responsesCount.toString(), margin + 125, yPos)
					doc.text(`${stat.successRate.toFixed(1)}%`, margin + 145, yPos)
					yPos += lineHeight
				})
			}

			// Топ исполнителей
			if (dashboardData.topExecutors && dashboardData.topExecutors.length > 0) {
				if (yPos > pageHeight - 40) {
					doc.addPage()
					yPos = 20
				}

				yPos += 5
				doc.setFontSize(14)
				doc.text('Топ-5 исполнителей', margin, yPos)
				yPos += 8

				doc.setFontSize(9)
				// Заголовки таблицы
				doc.text('Исполнитель', margin, yPos)
				doc.text('Задач', margin + 60, yPos)
				doc.text('Средняя цена', margin + 75, yPos)
				doc.text('Всего потрачено', margin + 100, yPos)
				doc.text('Скорость', margin + 135, yPos)
				doc.text('Рейтинг', margin + 150, yPos)
				yPos += 5

				dashboardData.topExecutors.forEach(executor => {
					if (yPos > pageHeight - 20) {
						doc.addPage()
						yPos = 20
					}
					doc.text(executor.executorName, margin, yPos)
					doc.text(executor.taskCount.toString(), margin + 60, yPos)
					doc.text(`${Math.round(executor.avgPrice).toLocaleString('ru-RU')} ₽`, margin + 75, yPos)
					doc.text(`${Math.round(executor.totalSpent).toLocaleString('ru-RU')} ₽`, margin + 100, yPos)
					doc.text(`${executor.avgSpeed} дн.`, margin + 135, yPos)
					doc.text(executor.executorRating.toFixed(1), margin + 150, yPos)
					yPos += lineHeight
				})
			}

			// Сохраняем PDF
			const fileName = `analytics_${periodText.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
			doc.save(fileName)
			toast.success('PDF успешно экспортирован')
		} catch (error: any) {
			console.error('Ошибка экспорта в PDF:', error)
			toast.error(`Ошибка экспорта в PDF: ${error?.message || 'Неизвестная ошибка'}`)
		}
	}

	const handleExportExcel = () => {
		if (!dashboardData) {
			toast.error('Нет данных для экспорта')
			return
		}

		try {
			const metrics = dashboardData.metrics
			const workbook = XLSX.utils.book_new()

			// Лист 1: Ключевые метрики
			const metricsData = [
				['Метрика', 'Значение'],
				['Опубликовано задач', metrics.totalTasks],
				['Завершено задач', metrics.completedTasks],
				['В работе', metrics.inProgressTasks],
				['Открытых', metrics.openTasks],
				['Откликов', metrics.totalResponses],
				['Нанято исполнителей', metrics.hiredExecutors],
				['Конверсия (%)', metrics.conversionRate.toFixed(2)],
				['Средняя стоимость (₽)', metrics.avgPrice > 0 ? Math.round(metrics.avgPrice) : 0],
				['Среднее время (дн.)', metrics.avgCompletionTime > 0 ? Math.round(metrics.avgCompletionTime) : 0],
				['Общие траты (₽)', metrics.totalSpent > 0 ? Math.round(metrics.totalSpent) : 0],
				['Средний рейтинг', metrics.avgExecutorRating > 0 ? metrics.avgExecutorRating.toFixed(1) : 0],
			]
			const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData)
			XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Ключевые метрики')

			// Лист 2: Аналитика по категориям
			if (dashboardData.categoryStats && dashboardData.categoryStats.length > 0) {
				const categoryHeaders = ['Категория', 'Подкатегория', 'Кол-во задач', 'Средняя цена (₽)', 'Средний срок (дн.)', 'Откликов', 'Успешность (%)']
				const categoryData = [
					categoryHeaders,
					...dashboardData.categoryStats.map(stat => [
						stat.categoryName || '',
						stat.subcategoryName || '',
						stat.taskCount,
						Math.round(stat.avgPrice),
						Math.round(stat.avgCompletionTime),
						stat.responsesCount,
						stat.successRate.toFixed(2),
					]),
				]
				const categorySheet = XLSX.utils.aoa_to_sheet(categoryData)
				XLSX.utils.book_append_sheet(workbook, categorySheet, 'По категориям')
			}

			// Лист 3: Топ исполнителей
			if (dashboardData.topExecutors && dashboardData.topExecutors.length > 0) {
				const executorHeaders = ['Исполнитель', 'Email', 'Задач', 'Средняя цена (₽)', 'Всего потрачено (₽)', 'Скорость (дн.)', 'Рейтинг']
				const executorData = [
					executorHeaders,
					...dashboardData.topExecutors.map(executor => [
						executor.executorName,
						executor.executorEmail,
						executor.taskCount,
						Math.round(executor.avgPrice),
						Math.round(executor.totalSpent),
						executor.avgSpeed,
						executor.executorRating.toFixed(1),
					]),
				]
				const executorSheet = XLSX.utils.aoa_to_sheet(executorData)
				XLSX.utils.book_append_sheet(workbook, executorSheet, 'Топ исполнителей')
			}

			// Лист 4: Динамика по дням
			if (dashboardData.dailyStats && dashboardData.dailyStats.length > 0) {
				const dailyHeaders = ['Дата', 'Задач', 'Потрачено (₽)', 'Откликов']
				const dailyData = [
					dailyHeaders,
					...dashboardData.dailyStats.map(stat => [
						stat.date,
						stat.tasks,
						Math.round(stat.spent),
						stat.responses,
					]),
				]
				const dailySheet = XLSX.utils.aoa_to_sheet(dailyData)
				XLSX.utils.book_append_sheet(workbook, dailySheet, 'Динамика')
			}

			// Лист 5: KPI по месяцам
			if (dashboardData.monthlyKPIs && dashboardData.monthlyKPIs.length > 0) {
				const kpiHeaders = ['Месяц', 'Задач', 'Потрачено (₽)', 'Рост задач (%)', 'Рост трат (%)']
				const kpiData = [
					kpiHeaders,
					...dashboardData.monthlyKPIs.map(kpi => [
						kpi.month,
						kpi.tasks,
						Math.round(kpi.spent),
						kpi.tasksGrowth.toFixed(2),
						kpi.spentGrowth.toFixed(2),
					]),
				]
				const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData)
				XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI по месяцам')
			}

			// Сохраняем Excel
			const periodText = selectedPeriod === '7' ? 'неделя' : selectedPeriod === '30' ? 'месяц' : selectedPeriod === '90' ? 'квартал' : 'год'
			const fileName = `analytics_${periodText}_${new Date().toISOString().split('T')[0]}.xlsx`
			XLSX.writeFile(workbook, fileName)
			toast.success('Excel успешно экспортирован')
		} catch (error: any) {
			console.error('Ошибка экспорта в Excel:', error)
			toast.error(`Ошибка экспорта в Excel: ${error?.message || 'Неизвестная ошибка'}`)
		}
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

	if (!dashboardData) {
		return (
			<ProtectedPage>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-red-400 text-xl">Не удалось загрузить данные</div>
				</div>
			</ProtectedPage>
		)
	}

	const { metrics, dailyStats, categoryStats, topExecutors, financialByCategory, monthlyKPIs } = dashboardData

	// Проверяем и нормализуем метрики
	const normalizedMetrics = {
		totalTasks: metrics.totalTasks || 0,
		completedTasks: metrics.completedTasks || 0,
		inProgressTasks: metrics.inProgressTasks || 0,
		openTasks: metrics.openTasks || 0,
		totalSpent: metrics.totalSpent || 0,
		totalResponses: metrics.totalResponses || 0,
		hiredExecutors: metrics.hiredExecutors || 0,
		conversionRate: metrics.conversionRate || 0,
		avgPrice: metrics.avgPrice || 0,
		avgCompletionTime: metrics.avgCompletionTime || 0,
		avgExecutorRating: metrics.avgExecutorRating || 0,
	}

	// Сортировка категорий
	const sortedCategoryStats = [...categoryStats].sort((a, b) => {
		const aVal = a[sortField]
		const bVal = b[sortField]
		if (typeof aVal === 'number' && typeof bVal === 'number') {
			return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
		}
		return 0
	})

	// Форматирование для графиков
	const chartData = dailyStats.map(d => ({
		date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
		'Создано задач': d.tasks,
		'Потрачено (тыс. ₽)': Math.round(d.spent / 1000),
		'Откликов': d.responses,
	}))

	const categoryChartData = financialByCategory
		.sort((a, b) => b.totalSpent - a.totalSpent)
		.slice(0, 8)
		.map(item => ({
			name: item.subcategoryName.length > 15 
				? item.subcategoryName.substring(0, 15) + '...' 
				: item.subcategoryName,
			value: item.totalSpent,
		}))

	const monthlyChartData = monthlyKPIs.map(kpi => ({
		month: new Date(kpi.month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
		'Задач': kpi.tasks,
		'Потрачено (тыс. ₽)': kpi.spent > 0 ? Math.round(kpi.spent / 1000) : 0,
	}))

	return (
		<ProtectedPage>
			<div className="min-h-screen bg-gradient-to-b from-black via-[#001a12] to-black p-4 md:p-8">
				<div className="max-w-7xl mx-auto">
					{/* Заголовок и фильтры */}
					<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
						<div>
							<h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-300 mb-2">
								Аналитика заказчика
							</h1>
							<p className="text-gray-400">Полная картина вашего бизнеса на платформе</p>
						</div>
						<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
							{['7', '30', '90', '365'].map(period => (
								<button
									key={period}
									onClick={() => setSelectedPeriod(period)}
									className={`px-4 py-2 rounded-lg border transition-all ${
										selectedPeriod === period
											? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
											: 'bg-black/60 text-gray-300 border-emerald-700/50 hover:border-emerald-500/50'
									}`}
								>
									{period === '7' ? 'Неделя' : period === '30' ? 'Месяц' : period === '90' ? 'Квартал' : 'Год'}
								</button>
							))}
							<button
								onClick={handleExportPDF}
								className="px-4 py-2 rounded-lg border border-emerald-700/50 bg-black/60 text-gray-300 hover:border-emerald-500/50 transition"
							>
								📄 PDF
							</button>
							<button
								onClick={handleExportExcel}
								className="px-4 py-2 rounded-lg border border-emerald-700/50 bg-black/60 text-gray-300 hover:border-emerald-500/50 transition"
							>
								📊 Excel
							</button>
						</div>
					</div>

					{/* Ключевые метрики - Dashboard */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
						<MetricCard
							title="Опубликовано задач"
							value={normalizedMetrics.totalTasks}
							icon="📋"
							color="emerald"
							trend={monthlyKPIs.length > 1 ? monthlyKPIs[monthlyKPIs.length - 1].tasksGrowth : undefined}
						/>
						<MetricCard
							title="Откликов"
							value={normalizedMetrics.totalResponses}
							icon="💬"
							color="blue"
						/>
						<MetricCard
							title="Средняя стоимость"
							value={normalizedMetrics.avgPrice > 0 ? `${Math.round(normalizedMetrics.avgPrice).toLocaleString('ru-RU')} ₽` : '0 ₽'}
							icon="₽"
							color="yellow"
						/>
						<MetricCard
							title="Среднее время"
							value={normalizedMetrics.avgCompletionTime > 0 ? `${Math.round(normalizedMetrics.avgCompletionTime)} дн.` : '0 дн.'}
							icon="⏱️"
							color="purple"
						/>
						<MetricCard
							title="Общие траты"
							value={normalizedMetrics.totalSpent > 0 ? `${Math.round(normalizedMetrics.totalSpent).toLocaleString('ru-RU')} ₽` : '0 ₽'}
							icon="💳"
							color="green"
							trend={monthlyKPIs.length > 1 ? monthlyKPIs[monthlyKPIs.length - 1].spentGrowth : undefined}
						/>
						<MetricCard
							title="Средний рейтинг"
							value={normalizedMetrics.avgExecutorRating > 0 ? `${normalizedMetrics.avgExecutorRating.toFixed(1)} ⭐` : '0 ⭐'}
							icon="⭐"
							color="pink"
						/>
					</div>

					{/* Дополнительные метрики */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition">
							<div className="text-gray-400 text-sm mb-2">Завершено задач</div>
							<div className="text-2xl font-bold text-emerald-400">
								{normalizedMetrics.completedTasks}
							</div>
							<div className="text-xs text-gray-500 mt-1">
								Успешность: {normalizedMetrics.totalTasks > 0 ? Math.round((normalizedMetrics.completedTasks / normalizedMetrics.totalTasks) * 100) : 0}%
							</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition">
							<div className="text-gray-400 text-sm mb-2">В работе</div>
							<div className="text-2xl font-bold text-blue-400">
								{normalizedMetrics.inProgressTasks}
							</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition">
							<div className="text-gray-400 text-sm mb-2">Конверсия</div>
							<div className="text-2xl font-bold text-purple-400">
								{normalizedMetrics.conversionRate.toFixed(1)}%
							</div>
							<div className="text-xs text-gray-500 mt-1">
								Откликов → Найм
							</div>
						</div>
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 transition">
							<div className="text-gray-400 text-sm mb-2">Нанято исполнителей</div>
							<div className="text-2xl font-bold text-yellow-400">
								{normalizedMetrics.hiredExecutors}
							</div>
						</div>
					</div>

					{/* График динамики */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">
							📈 Динамика задач и трат
						</h2>
						<ResponsiveContainer width="100%" height={350}>
							<AreaChart data={chartData}>
								<defs>
									<linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
										<stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
									</linearGradient>
									<linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
									</linearGradient>
									<linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
										<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
								<XAxis 
									dataKey="date" 
									stroke="#9ca3af" 
									tick={{ fill: '#9ca3af' }}
								/>
								<YAxis 
									stroke="#9ca3af" 
									tick={{ fill: '#9ca3af' }}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: '#000000',
										border: '1px solid #10b981',
										borderRadius: '0.5rem',
										color: '#10b981',
										boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
									}}
									itemStyle={{ color: '#10b981' }}
									labelStyle={{ color: '#10b981' }}
								/>
								<Area
									type="monotone"
									dataKey="Создано задач"
									stroke="#10b981"
									fillOpacity={1}
									fill="url(#colorTasks)"
								/>
								<Area
									type="monotone"
									dataKey="Потрачено (тыс. ₽)"
									stroke="#3b82f6"
									fillOpacity={1}
									fill="url(#colorSpent)"
								/>
								<Area
									type="monotone"
									dataKey="Откликов"
									stroke="#8b5cf6"
									fillOpacity={1}
									fill="url(#colorResponses)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>

					{/* График затрат по категориям */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
							<h2 className="text-xl font-semibold text-emerald-400 mb-4">
								💸 Затраты по категориям
							</h2>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={categoryChartData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={false}
										outerRadius={100}
										fill="#8884d8"
										dataKey="value"
									>
										{categoryChartData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											backgroundColor: '#000000',
											border: '1px solid #10b981',
											borderRadius: '0.5rem',
											color: '#10b981',
											boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
										}}
										itemStyle={{ color: '#10b981' }}
										labelStyle={{ color: '#10b981' }}
										formatter={(value: number, name: string) => {
											const total = categoryChartData.reduce((sum, item) => sum + item.value, 0)
											const percent = total > 0 ? ((value / total) * 100).toFixed(0) : '0'
											return [`${name}: ${Math.round(value).toLocaleString('ru-RU')} ₽ (${percent}%)`, '']
										}}
									/>
									<Legend 
										wrapperStyle={{ color: '#9ca3af' }}
										formatter={(value: string) => {
											const item = categoryChartData.find(d => d.name === value)
											if (!item) return value
											const total = categoryChartData.reduce((sum, d) => sum + d.value, 0)
											const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0'
											return `${value}: ${percent}%`
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>

						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
							<h2 className="text-xl font-semibold text-emerald-400 mb-4">
								📊 KPI по месяцам
							</h2>
							{monthlyChartData.length > 0 ? (
								<ResponsiveContainer width="100%" height={400}>
									<BarChart 
										data={monthlyChartData} 
										margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#14532d" opacity={0.3} />
										<XAxis 
											dataKey="month" 
											stroke="#10b981" 
											tick={{ fill: '#10b981', fontSize: 11 }}
											angle={-30}
											textAnchor="end"
											height={70}
											interval={0}
										/>
										<YAxis 
											stroke="#10b981" 
											tick={{ fill: '#10b981', fontSize: 12 }}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: '#000000',
												border: '1px solid #10b981',
												borderRadius: '0.5rem',
												color: '#10b981',
												fontSize: '14px',
												boxShadow: '0 0 15px rgba(16, 185, 129, 0.7)',
											}}
											itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
											labelStyle={{ color: '#10b981', fontWeight: 'bold' }}
											cursor={{ fill: 'transparent', stroke: 'none' }}
											wrapperStyle={{ outline: 'none' }}
											formatter={(value: number, name: string) => {
												if (name === 'Потрачено (тыс. ₽)') {
													return [`${value} тыс. ₽`, name]
												}
												if (name === 'Задач') {
													return [`${value} задач`, name]
												}
												return [value, name]
											}}
										/>
										<Legend 
											wrapperStyle={{ 
												paddingTop: '20px', 
												color: '#10b981', 
												fontSize: '14px',
												fontWeight: '500'
											}}
										/>
										<Bar 
											dataKey="Задач" 
											fill="#10b981" 
											radius={[8, 8, 0, 0]}
											label={false}
										>
											{monthlyChartData.map((entry, index) => (
												<Cell 
													key={`cell-tasks-${index}`} 
													fill="#10b981"
													style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}
												/>
											))}
										</Bar>
										<Bar 
											dataKey="Потрачено (тыс. ₽)" 
											fill="#3b82f6" 
											radius={[8, 8, 0, 0]}
											label={false}
										>
											{monthlyChartData.map((entry, index) => (
												<Cell 
													key={`cell-spent-${index}`} 
													fill="#3b82f6"
													style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' }}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="flex items-center justify-center h-[400px] text-gray-500">
									Нет данных за выбранный период
								</div>
							)}
						</div>
					</div>

					{/* Аналитика по категориям - Таблица */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">
							📑 Аналитика по категориям
						</h2>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-emerald-500/30">
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('categoryName')}
										>
											Категория {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('taskCount')}
										>
											Кол-во задач {sortField === 'taskCount' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('avgPrice')}
										>
											Средняя цена {sortField === 'avgPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('avgCompletionTime')}
										>
											Средний срок {sortField === 'avgCompletionTime' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('responsesCount')}
										>
											Откликов {sortField === 'responsesCount' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-3 px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition"
											onClick={() => handleSort('successRate')}
										>
											Успешность {sortField === 'successRate' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedCategoryStats.map((stat, idx) => (
										<tr
											key={stat.subcategoryId}
											className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition"
										>
											<td className="py-3 px-4">
												<div className="font-medium text-white">{stat.categoryName}</div>
												<div className="text-sm text-gray-400">{stat.subcategoryName}</div>
											</td>
											<td className="py-3 px-4 text-emerald-300 font-semibold">{stat.taskCount}</td>
											<td className="py-3 px-4 text-blue-300">
												{Math.round(stat.avgPrice).toLocaleString('ru-RU')} ₽
											</td>
											<td className="py-3 px-4 text-purple-300">{stat.avgCompletionTime} дн.</td>
											<td className="py-3 px-4 text-yellow-300">{stat.responsesCount}</td>
											<td className="py-3 px-4">
												<div className="flex items-center gap-2">
													<div className="flex-1 bg-gray-700 rounded-full h-2">
														<div
															className="bg-emerald-500 h-2 rounded-full"
															style={{ width: `${stat.successRate}%` }}
														/>
													</div>
													<span className="text-emerald-300 text-sm w-12">{stat.successRate.toFixed(1)}%</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Топ исполнителей */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">
							👥 Топ-5 исполнителей
						</h2>
						<div className="space-y-3">
							{topExecutors.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									Нет данных об исполнителях
								</div>
							) : (
								topExecutors.map((executor, idx) => (
									<div
										key={executor.executorId}
										className="bg-black/40 border border-emerald-700/30 rounded-lg p-4 hover:border-emerald-500/50 transition flex items-center justify-between"
									>
										<div className="flex items-center gap-4 flex-1">
											<div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-emerald-100 font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
												{idx + 1}
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<Link
														href={`/users/${executor.executorId}`}
														className="font-semibold text-white hover:text-emerald-300 transition"
													>
														{executor.executorName}
													</Link>
													<span className="text-yellow-400">⭐ {executor.executorRating.toFixed(1)}</span>
												</div>
												<div className="text-sm text-gray-400">
													{executor.taskCount} задач | Средняя: {Math.round(executor.avgPrice).toLocaleString('ru-RU')} ₽ | 
													{' '}Скорость: {executor.avgSpeed} дн.
												</div>
											</div>
										</div>
										<div className="text-right ml-4">
											<div className="text-emerald-400 font-semibold text-lg">
												{Math.round(executor.totalSpent).toLocaleString('ru-RU')} ₽
											</div>
											<div className="text-xs text-gray-500">Всего потрачено</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>

					{/* Финансовая аналитика */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-xl font-semibold text-emerald-400 mb-4">
							💳 Финансовая аналитика
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div className="bg-black/40 border border-emerald-700/30 rounded-lg p-4">
								<div className="text-gray-400 text-sm mb-1">Общее потраченное</div>
								<div className="text-2xl font-bold text-emerald-400">
									{normalizedMetrics.totalSpent > 0 ? `${Math.round(normalizedMetrics.totalSpent).toLocaleString('ru-RU')} ₽` : '0 ₽'}
								</div>
							</div>
							<div className="bg-black/40 border border-emerald-700/30 rounded-lg p-4">
								<div className="text-gray-400 text-sm mb-1">Средний чек</div>
								<div className="text-2xl font-bold text-blue-400">
									{normalizedMetrics.avgPrice > 0 ? `${Math.round(normalizedMetrics.avgPrice).toLocaleString('ru-RU')} ₽` : '0 ₽'}
								</div>
							</div>
							<div className="bg-black/40 border border-emerald-700/30 rounded-lg p-4">
								<div className="text-gray-400 text-sm mb-1">Завершено задач</div>
								<div className="text-2xl font-bold text-purple-400">
									{normalizedMetrics.completedTasks}
								</div>
							</div>
						</div>
						<div className="text-sm text-gray-400">
							* Данные за выбранный период ({selectedPeriod === '7' ? 'неделю' : selectedPeriod === '30' ? 'месяц' : selectedPeriod === '90' ? 'квартал' : 'год'})
						</div>
					</div>
				</div>
			</div>
		</ProtectedPage>
	)
}

function MetricCard({
	title,
	value,
	icon,
	color,
	trend,
}: {
	title: string
	value: string | number
	icon: string
	color: 'emerald' | 'green' | 'blue' | 'yellow' | 'purple' | 'pink'
	trend?: number
}) {
	const colorClasses = {
		emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
		green: 'border-green-500/50 bg-green-500/10 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)]',
		blue: 'border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
		yellow: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.2)]',
		purple: 'border-purple-500/50 bg-purple-500/10 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
		pink: 'border-pink-500/50 bg-pink-500/10 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.2)]',
	}

	// Форматируем значение
	const formatValue = (val: string | number): string => {
		if (typeof val === 'string') return val
		if (val === null || val === undefined || isNaN(val)) return '0'
		return val.toLocaleString('ru-RU', { 
			minimumFractionDigits: 0,
			maximumFractionDigits: 2 
		})
	}

	return (
		<div className={`bg-black/60 border rounded-xl p-4 hover:scale-105 transition-transform ${colorClasses[color]}`}>
			<div className="flex items-center justify-between mb-2">
				<span className="text-2xl">{icon}</span>
				{trend !== undefined && trend !== 0 && !isNaN(trend) && (
					<span className={`text-xs font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
						{trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
					</span>
				)}
			</div>
			<div className="text-xs text-gray-400 mb-1">{title}</div>
			<div className="text-xl font-bold break-words">
				{formatValue(value)}
			</div>
		</div>
	)
}
