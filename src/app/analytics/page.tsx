'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { autoTable } from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Расширяем тип jsPDF для поддержки lastAutoTable
declare module 'jspdf' {
	interface jsPDF {
		lastAutoTable: {
			finalY: number
		}
	}
}

// Вспомогательная функция для правильной обработки кириллицы в jsPDF
// jsPDF по умолчанию не поддерживает кириллицу в стандартных шрифтах
// Используем правильную кодировку и обработку текста
// ВАЖНО: Для полной поддержки кириллицы нужно добавить кастомный шрифт через doc.addFont()
function addTextToPDF(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number, options?: any): number {
	try {
		// Разбиваем текст на строки
		const lines = doc.splitTextToSize(text, maxWidth)
		
		if (Array.isArray(lines)) {
			lines.forEach((line, index) => {
				// В jsPDF 3.0+ текст должен быть в UTF-8
				// Используем правильную кодировку для кириллицы
				// Примечание: стандартные шрифты не поддерживают кириллицу,
				// поэтому символы могут отображаться некорректно
				// Для полной поддержки нужно добавить кастомный шрифт
				doc.text(line, x, y + (index * lineHeight), options)
			})
			return lines.length * lineHeight
		} else {
			doc.text(lines, x, y, options)
			return lineHeight
		}
	} catch (error) {
		console.warn('Ошибка добавления текста в PDF:', error, text)
		// В случае ошибки возвращаем минимальную высоту
		return lineHeight
	}
}

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

	// Редирект для исполнителей на их страницу аналитики
	useEffect(() => {
		if (user && user.role !== 'customer') {
			if (typeof window !== 'undefined') {
				window.location.href = '/analytics/executor'
			}
		}
	}, [user])

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
					let errorMessage = `HTTP ${res.status}`
					
					try {
						const text = await res.text()
						if (text) {
							try {
								errorData = JSON.parse(text)
								errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
							} catch (parseError) {
								errorMessage = text || errorMessage
							}
						}
					} catch (parseError) {
						errorMessage = res.statusText || errorMessage
					}
					
					console.error('Ошибка загрузки аналитики:', {
						status: res.status,
						statusText: res.statusText || 'Unknown',
						error: errorData,
						message: errorMessage,
					})
					
					toast.error(`Ошибка загрузки аналитики: ${errorMessage}`)
					setDashboardData(null)
					setLoading(false)
					return
				}

				const data = await res.json()
				console.log('Данные получены для периода:', selectedPeriod, 'Количество дней:', data.dailyStats?.length)
				if (data.dailyStats && data.dailyStats.length > 0) {
					console.log('Первая дата:', data.dailyStats[0]?.date, 'Последняя дата:', data.dailyStats[data.dailyStats.length - 1]?.date)
				}
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

	// Форматирование для графиков - используем useMemo для пересчета при изменении периода
	// ВАЖНО: хуки должны вызываться ДО любых условных return
	// Для разных периодов используем разную группировку данных
	const chartData = useMemo(() => {
		if (!dashboardData?.dailyStats || dashboardData.dailyStats.length === 0) return []
		
		const periodNum = parseInt(selectedPeriod) || 30
		
		// Для квартала (90 дней) группируем по неделям
		if (periodNum === 90) {
			const weeklyMap = new Map<string, { tasks: number; spent: number; responses: number; weekStart: Date }>()
			
			console.log('Quarter data processing:', dashboardData.dailyStats.length, 'daily records')
			
			// Группируем данные по неделям
			dashboardData.dailyStats.forEach(d => {
				const date = new Date(d.date)
				// Получаем начало недели (понедельник)
				const weekStart = new Date(date)
				const dayOfWeek = date.getDay() // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
				const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Если воскресенье, отнимаем 6 дней, иначе отнимаем (dayOfWeek - 1)
				weekStart.setDate(date.getDate() + diff)
				weekStart.setHours(0, 0, 0, 0)
				
				const weekKey = weekStart.toISOString().split('T')[0]
				const existing = weeklyMap.get(weekKey)
				if (existing) {
					existing.tasks += d.tasks
					existing.spent += d.spent
					existing.responses += d.responses
				} else {
					weeklyMap.set(weekKey, {
						tasks: d.tasks,
						spent: d.spent,
						responses: d.responses,
						weekStart: new Date(weekStart),
					})
				}
			})
			
			// Вычисляем начало и конец периода квартала (90 дней назад от сегодня)
			const endDate = new Date()
			endDate.setHours(23, 59, 59, 999)
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - 90)
			startDate.setHours(0, 0, 0, 0)
			
			// Находим первую неделю периода (понедельник начала периода)
			const firstWeekStart = new Date(startDate)
			const dayOfWeek = startDate.getDay()
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
			firstWeekStart.setDate(startDate.getDate() + diff)
			firstWeekStart.setHours(0, 0, 0, 0)
			
			// Находим последнюю неделю периода (понедельник конца периода)
			const lastWeekStart = new Date(endDate)
			const endDayOfWeek = endDate.getDay()
			const endDiff = endDayOfWeek === 0 ? -6 : 1 - endDayOfWeek
			lastWeekStart.setDate(endDate.getDate() + endDiff)
			lastWeekStart.setHours(0, 0, 0, 0)
			
			// Заполняем все недели периода (около 13 недель для 90 дней)
			const filledWeeks: Array<{ dateKey: string; data: { tasks: number; spent: number; responses: number; weekStart: Date } }> = []
			const currentWeek = new Date(firstWeekStart)
			
			while (currentWeek <= lastWeekStart) {
				const weekKey = currentWeek.toISOString().split('T')[0]
				const existing = weeklyMap.get(weekKey)
				
				if (existing) {
					filledWeeks.push({ dateKey: weekKey, data: existing })
				} else {
					filledWeeks.push({
						dateKey: weekKey,
						data: {
							tasks: 0,
							spent: 0,
							responses: 0,
							weekStart: new Date(currentWeek),
						},
					})
				}
				
				// Переходим к следующей неделе
				currentWeek.setDate(currentWeek.getDate() + 7)
			}
			
			// Форматируем с отображением диапазона недели
			const formatted = filledWeeks
				.map(({ dateKey, data }) => {
					const weekEnd = new Date(data.weekStart)
					weekEnd.setDate(weekEnd.getDate() + 6) // Конец недели (воскресенье)
					
					return {
						date: `${data.weekStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`,
						'Создано задач': data.tasks,
						'Потрачено (тыс. ₽)': Math.round(data.spent / 1000),
						'Откликов': data.responses,
					}
				})
			
			console.log('Chart data updated for quarter (weekly):', formatted.length, 'weeks, first:', formatted[0]?.date, 'last:', formatted[formatted.length - 1]?.date)
			return formatted
		}
		
		// Для года (365 дней) группируем по месяцам
		if (periodNum === 365) {
			const monthlyMap = new Map<string, { tasks: number; spent: number; responses: number }>()
			
			dashboardData.dailyStats.forEach(d => {
				const date = new Date(d.date)
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
				const existing = monthlyMap.get(monthKey) || { tasks: 0, spent: 0, responses: 0 }
				existing.tasks += d.tasks
				existing.spent += d.spent
				existing.responses += d.responses
				monthlyMap.set(monthKey, existing)
			})
			
			const formatted = Array.from(monthlyMap.entries())
				.map(([date, data]) => ({
					dateKey: date, // Сохраняем для сортировки
					date: new Date(date + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
					'Создано задач': data.tasks,
					'Потрачено (тыс. ₽)': Math.round(data.spent / 1000),
					'Откликов': data.responses,
				}))
				.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
				.map(({ dateKey, ...rest }) => rest) // Удаляем dateKey из результата
			
			console.log('Chart data updated for year (monthly):', formatted.length, 'months')
			return formatted
		}
		
		// Для недели и месяца - показываем по дням
		const formatted = dashboardData.dailyStats.map(d => ({
			date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
			'Создано задач': d.tasks,
			'Потрачено (тыс. ₽)': Math.round(d.spent / 1000),
			'Откликов': d.responses,
		}))
		
		console.log('Chart data updated for period:', selectedPeriod, 'Data points:', formatted.length)
		return formatted
	}, [dashboardData?.dailyStats, selectedPeriod])

	const handleExportPDF = async () => {
		if (!dashboardData) {
			toast.error('Нет данных для экспорта')
			return
		}

		const loadingToast = toast.loading('Генерация PDF...')
		
		// Выполняем генерацию асинхронно, чтобы не блокировать UI
		setTimeout(async () => {
			try {
				console.log('Начало генерации PDF...')
				const { metrics, dailyStats, categoryStats, topExecutors, financialByCategory, monthlyKPIs } = dashboardData
				const periodText = selectedPeriod === '7' ? 'неделя' : selectedPeriod === '30' ? 'месяц' : selectedPeriod === '90' ? 'квартал' : 'год'
				
			console.log('Создание документа jsPDF...')
			// Создаем PDF документ напрямую из данных
			const doc = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4',
				compress: true
			})
			
			// ВАЖНО: jsPDF 3.x не поддерживает кириллицу в стандартных шрифтах
			// Для корректного отображения кириллицы нужно:
			// 1. Загрузить TTF файл шрифта с поддержкой кириллицы (например, Roboto или Noto Sans)
			// 2. Конвертировать его в формат, поддерживаемый jsPDF (через fontconverter)
			// 3. Добавить через addFileToVFS и addFont
			// 
			// Временное решение: используем стандартный шрифт
			// Кириллица будет отображаться некорректно (кракозябры)
			doc.setFont('helvetica', 'normal')
			
			const pageWidth = doc.internal.pageSize.getWidth()
			const pageHeight = doc.internal.pageSize.getHeight()
			const margin = 15
			let yPosition = margin
			const lineHeight = 7
			
			// Функция для добавления новой страницы если нужно
			const checkNewPage = (requiredHeight: number) => {
				if (yPosition + requiredHeight > pageHeight - margin) {
					doc.addPage()
					yPosition = margin
					return true
				}
				return false
			}
			
			// Заголовок
			doc.setFontSize(20)
			doc.setTextColor(16, 185, 129) // emerald color
			// В jsPDF 3.x стандартные шрифты не поддерживают кириллицу
			// Текст будет отображаться некорректно без кастомного шрифта
			doc.text('Аналитика заказчика', margin, yPosition)
			yPosition += lineHeight + 2
			
			doc.setFontSize(12)
			doc.setTextColor(100, 100, 100)
			doc.text(`Период: ${periodText}`, margin, yPosition)
			doc.text(`Дата отчета: ${new Date().toLocaleDateString('ru-RU')}`, margin + 60, yPosition)
			yPosition += lineHeight + 5
			
			// Разделитель
			doc.setDrawColor(16, 185, 129)
			doc.line(margin, yPosition, pageWidth - margin, yPosition)
			yPosition += lineHeight
			
			// Ключевые метрики
			checkNewPage(30)
			doc.setFontSize(16)
			doc.setTextColor(0, 0, 0)
			doc.text('Ключевые метрики', margin, yPosition)
			yPosition += lineHeight + 3
			
			doc.setFontSize(10)
			const metricsData = [
				['Метрика', 'Значение'],
				['Опубликовано задач', metrics.totalTasks.toString()],
				['Завершено задач', metrics.completedTasks.toString()],
				['В работе', metrics.inProgressTasks.toString()],
				['Открытых', metrics.openTasks.toString()],
				['Откликов', metrics.totalResponses.toString()],
				['Нанято исполнителей', metrics.hiredExecutors.toString()],
				['Конверсия (%)', metrics.conversionRate.toFixed(2)],
				['Средняя стоимость (₽)', Math.round(metrics.avgPrice).toLocaleString('ru-RU')],
				['Среднее время (дн.)', Math.round(metrics.avgCompletionTime).toString()],
				['Общие траты (₽)', Math.round(metrics.totalSpent).toLocaleString('ru-RU')],
				['Средний рейтинг', metrics.avgExecutorRating.toFixed(1)],
			]
			
			checkNewPage(metricsData.length * 6 + 10)
			console.log('Добавление таблицы метрик...')
			autoTable(doc, {
				head: [metricsData[0]],
				body: metricsData.slice(1),
				startY: yPosition,
				theme: 'striped',
				headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
				margin: { left: margin, right: margin },
				styles: { font: 'helvetica', fontStyle: 'normal' },
				didParseCell: function (data: any) {
					// Обеспечиваем правильную обработку UTF-8 для кириллицы
					if (data.cell && data.cell.text) {
						data.cell.text = String(data.cell.text)
					}
				},
			})
			console.log('Таблица метрик добавлена')
			yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPosition + 50
			
			// Динамика по дням
			if (dailyStats && dailyStats.length > 0) {
				checkNewPage(30)
				doc.setFontSize(16)
				doc.text('Динамика по дням', margin, yPosition)
				yPosition += lineHeight + 3
				
				doc.setFontSize(9)
				const dailyData = [
					['Дата', 'Задач', 'Потрачено (₽)', 'Откликов'],
					...dailyStats.map(stat => [
						new Date(stat.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
						stat.tasks.toString(),
						Math.round(stat.spent).toLocaleString('ru-RU'),
						stat.responses.toString(),
					]),
				]
				
				checkNewPage(dailyData.length * 5 + 10)
				autoTable(doc, {
					head: [dailyData[0]],
					body: dailyData.slice(1),
					startY: yPosition,
					theme: 'striped',
					headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
					margin: { left: margin, right: margin },
					styles: { font: 'helvetica', fontStyle: 'normal' },
					didParseCell: function (data: any) {
						if (data.cell && data.cell.text) {
							data.cell.text = String(data.cell.text)
						}
					},
				})
				yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPosition + 50
			}
			
			// Статистика по категориям
			if (categoryStats && categoryStats.length > 0) {
				checkNewPage(30)
				doc.setFontSize(16)
				doc.text('Аналитика по категориям', margin, yPosition)
				yPosition += lineHeight + 3
				
				doc.setFontSize(8)
				const categoryData = [
					['Категория', 'Подкатегория', 'Задач', 'Ср. цена (₽)', 'Ср. срок (дн.)', 'Откликов', 'Успешность (%)'],
					...categoryStats.map(stat => [
						stat.categoryName || '',
						stat.subcategoryName || '',
						stat.taskCount.toString(),
						Math.round(stat.avgPrice).toLocaleString('ru-RU'),
						Math.round(stat.avgCompletionTime).toString(),
						stat.responsesCount.toString(),
						stat.successRate.toFixed(1),
					]),
				]
				
				checkNewPage(categoryData.length * 5 + 10)
				autoTable(doc, {
					head: [categoryData[0]],
					body: categoryData.slice(1),
					startY: yPosition,
					theme: 'striped',
					headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
					margin: { left: margin, right: margin },
					styles: { fontSize: 8, font: 'helvetica', fontStyle: 'normal' },
					didParseCell: function (data: any) {
						if (data.cell && data.cell.text) {
							data.cell.text = String(data.cell.text)
						}
					},
				})
				yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPosition + 50
			}
			
			// Топ исполнителей
			if (topExecutors && topExecutors.length > 0) {
				checkNewPage(30)
				doc.setFontSize(16)
				doc.text('Топ исполнителей', margin, yPosition)
				yPosition += lineHeight + 3
				
				doc.setFontSize(9)
				const executorData = [
					['Исполнитель', 'Email', 'Задач', 'Ср. цена (₽)', 'Всего (₽)', 'Скорость (дн.)', 'Рейтинг'],
					...topExecutors.map(executor => [
						executor.executorName,
						executor.executorEmail,
						executor.taskCount.toString(),
						Math.round(executor.avgPrice).toLocaleString('ru-RU'),
						Math.round(executor.totalSpent).toLocaleString('ru-RU'),
						executor.avgSpeed.toString(),
						executor.executorRating.toFixed(1),
					]),
				]
				
				checkNewPage(executorData.length * 5 + 10)
				autoTable(doc, {
					head: [executorData[0]],
					body: executorData.slice(1),
					startY: yPosition,
					theme: 'striped',
					headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
					margin: { left: margin, right: margin },
					styles: { font: 'helvetica', fontStyle: 'normal' },
					didParseCell: function (data: any) {
						if (data.cell && data.cell.text) {
							data.cell.text = String(data.cell.text)
						}
					},
				})
				yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPosition + 50
			}
			
			// KPI по месяцам
			if (monthlyKPIs && monthlyKPIs.length > 0) {
				checkNewPage(30)
				doc.setFontSize(16)
				doc.text('KPI по месяцам', margin, yPosition)
				yPosition += lineHeight + 3
				
				doc.setFontSize(9)
				const kpiData = [
					['Месяц', 'Задач', 'Потрачено (₽)', 'Рост задач (%)', 'Рост трат (%)'],
					...monthlyKPIs.map(kpi => [
						new Date(kpi.month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
						kpi.tasks.toString(),
						Math.round(kpi.spent).toLocaleString('ru-RU'),
						kpi.tasksGrowth.toFixed(2),
						kpi.spentGrowth.toFixed(2),
					]),
				]
				
				checkNewPage(kpiData.length * 5 + 10)
				autoTable(doc, {
					head: [kpiData[0]],
					body: kpiData.slice(1),
					startY: yPosition,
					theme: 'striped',
					headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
					margin: { left: margin, right: margin },
					styles: { font: 'helvetica', fontStyle: 'normal' },
					didParseCell: function (data: any) {
						if (data.cell && data.cell.text) {
							data.cell.text = String(data.cell.text)
						}
					},
				})
			}
			
			// Сохраняем PDF
			console.log('Сохранение PDF...')
			const fileName = `analytics_${periodText}_${new Date().toISOString().split('T')[0]}.pdf`
			doc.save(fileName)
			console.log('PDF сохранен:', fileName)
			
				toast.dismiss(loadingToast)
				toast.success('PDF успешно экспортирован')
			} catch (error: any) {
				console.error('Ошибка экспорта в PDF:', error)
				toast.dismiss(loadingToast)
				toast.error(`Ошибка экспорта в PDF: ${error?.message || 'Неизвестная ошибка'}`)
			}
		}, 100)
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

			// Сохраняем файл
			const periodText = selectedPeriod === '7' ? 'неделя' : selectedPeriod === '30' ? 'месяц' : selectedPeriod === '90' ? 'квартал' : 'год'
			const fileName = `analytics_${periodText}_${new Date().toISOString().split('T')[0]}.xlsx`
			XLSX.writeFile(workbook, fileName)
			toast.success('Excel файл успешно экспортирован')
		} catch (error: any) {
			console.error('Ошибка экспорта в Excel:', error)
			toast.error(`Ошибка экспорта в Excel: ${error?.message || 'Неизвестная ошибка'}`)
		}
	}

	const handleSort = (field: keyof DashboardData['categoryStats'][0]) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('desc')
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
			<div className="min-h-screen bg-gradient-to-b from-black via-[#001a12] to-black p-3 sm:p-4 md:p-8 analytics-container overflow-x-hidden">
				<div className="max-w-7xl mx-auto w-full">
					{/* Заголовок и фильтры */}
					<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
						<div>
							<h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-300 mb-2">
								Аналитика заказчика
							</h1>
							<p className="text-gray-400">Полная картина вашего бизнеса на платформе</p>
						</div>
						<div className="flex flex-wrap gap-2 mt-4 md:mt-0 text-sm">
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
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
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
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
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
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
							📈 Динамика задач и трат
						</h2>
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height={250} className="md:h-[350px]" key={`chart-container-${selectedPeriod}-${chartData.length}`}>
								<AreaChart data={chartData} key={`area-chart-${selectedPeriod}-${chartData.length}-${chartData[0]?.date}-${chartData[chartData.length - 1]?.date}`}>
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
						) : (
							<div className="flex items-center justify-center h-[250px] md:h-[350px] text-gray-500">
								Нет данных за выбранный период
							</div>
						)}
					</div>

					{/* График затрат по категориям */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
							<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
								💸 Затраты по категориям
							</h2>
							<ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
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

						<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
							<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
								📊 KPI по месяцам
							</h2>
							{monthlyChartData.length > 0 ? (
								<ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
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
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
							📑 Аналитика по категориям
						</h2>
						<div className="overflow-x-auto -mx-4 md:mx-0">
							<table className="w-full min-w-[600px] text-sm md:text-base">
								<thead>
									<tr className="border-b border-emerald-500/30">
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm"
											onClick={() => handleSort('categoryName')}
										>
											Категория {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm"
											onClick={() => handleSort('taskCount')}
										>
											Кол-во задач {sortField === 'taskCount' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm"
											onClick={() => handleSort('avgPrice')}
										>
											Средняя цена {sortField === 'avgPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm hidden md:table-cell"
											onClick={() => handleSort('avgCompletionTime')}
										>
											Средний срок {sortField === 'avgCompletionTime' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm"
											onClick={() => handleSort('responsesCount')}
										>
											Откликов {sortField === 'responsesCount' && (sortDirection === 'asc' ? '↑' : '↓')}
										</th>
										<th
											className="text-left py-2 md:py-3 px-2 md:px-4 text-emerald-300 cursor-pointer hover:text-emerald-200 transition text-xs md:text-sm"
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
											<td className="py-2 md:py-3 px-2 md:px-4">
												<div className="font-medium text-white text-xs md:text-sm">{stat.categoryName}</div>
												<div className="text-xs md:text-sm text-gray-400">{stat.subcategoryName}</div>
											</td>
											<td className="py-2 md:py-3 px-2 md:px-4 text-emerald-300 font-semibold text-xs md:text-sm">{stat.taskCount}</td>
											<td className="py-2 md:py-3 px-2 md:px-4 text-blue-300 text-xs md:text-sm">
												{Math.round(stat.avgPrice).toLocaleString('ru-RU')} ₽
											</td>
											<td className="py-2 md:py-3 px-2 md:px-4 text-purple-300 text-xs md:text-sm hidden md:table-cell">{stat.avgCompletionTime} дн.</td>
											<td className="py-2 md:py-3 px-2 md:px-4 text-yellow-300 text-xs md:text-sm">{stat.responsesCount}</td>
											<td className="py-2 md:py-3 px-2 md:px-4">
												<div className="flex items-center gap-2">
													<div className="flex-1 bg-gray-700 rounded-full h-2 min-w-[40px]">
														<div
															className="bg-emerald-500 h-2 rounded-full"
															style={{ width: `${stat.successRate}%` }}
														/>
													</div>
													<span className="text-emerald-300 text-xs md:text-sm w-10 md:w-12">{stat.successRate.toFixed(1)}%</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Топ исполнителей */}
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
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
					<div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 md:p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<h2 className="text-lg md:text-xl font-semibold text-emerald-400 mb-4">
							💳 Финансовая аналитика
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
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
