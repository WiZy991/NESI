'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

interface PriceStats {
	market: {
		price: number
		min: number
		max: number
		source: string
		confidence: number
		sampleSize: number
		dataQuality: 'high' | 'medium' | 'low' | 'estimate'
		hasEnoughData: boolean
		isReliable: boolean
	}
	currentTaskResponses: {
		count: number
		min: number
		max: number
		average: number
		median: number
		byLevel: Record<number, { count: number; avgPrice: number }>
	} | null
	categoryResponses: {
		count: number
		average: number
		median: number
		p25: number
		p75: number
		min: number
		max: number
	} | null
	completedTasks: {
		count: number
		average: number
		min: number
		max: number
	} | null
	similarTasks: {
		count: number
		avgSimilarity: number
	} | null
	analysis: {
		complexity: string
		volume: string
		urgency: string
		technologies: string[]
		estimatedHours: number
	} | null
	taskType: {
		id: string
		name: string
		description: string
		typicalPrice: number
		priceRange: { min: number; max: number }
	} | null
}

interface PriceComparisonWidgetProps {
	subcategoryId: string | null
	responsePrice: number | null
	taskId?: string | null
	taskTitle?: string | null
	taskDescription?: string | null
}

export default function PriceComparisonWidget({
	subcategoryId,
	responsePrice,
	taskId,
	taskTitle,
	taskDescription,
}: PriceComparisonWidgetProps) {
	const { token } = useUser()
	const [priceData, setPriceData] = useState<PriceStats | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!token || !subcategoryId) {
			setLoading(false)
			return
		}

		const fetchPriceStats = async () => {
			try {
				const params = new URLSearchParams()
				if (subcategoryId) params.append('subcategoryId', subcategoryId)
				if (taskId) params.append('taskId', taskId)
				if (taskTitle) params.append('title', taskTitle)
				if (taskDescription) params.append('description', taskDescription)
				
				const res = await fetch(`/api/analytics/price-stats?${params.toString()}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (res.ok) {
					const data = await res.json()
					setPriceData(data)
				}
			} catch (err) {
				console.error('Ошибка загрузки статистики цен:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchPriceStats()
	}, [token, subcategoryId, taskId, taskTitle, taskDescription])

	if (loading || !priceData || !responsePrice) {
		return null
	}

	const { market, currentTaskResponses, categoryResponses } = priceData
	
	// Если нет достаточных данных - показываем честное сообщение
	if (!market.hasEnoughData && !currentTaskResponses) {
		return (
			<div className="mt-3 p-3 rounded-lg border border-gray-600/50 bg-gray-800/30">
				<div className="text-xs text-gray-400 text-center">
					<span className="text-gray-500">📊</span> Недостаточно данных для сравнения
				</div>
			</div>
		)
	}

	// Определяем, какую цену использовать для сравнения
	const comparePrice = currentTaskResponses && currentTaskResponses.count >= 2
		? currentTaskResponses.median
		: market.price

	// Вычисляем разницу
	const difference = responsePrice - comparePrice
	const differencePercent = comparePrice > 0 ? (difference / comparePrice) * 100 : 0

	// Определяем статус цены
	const getPriceStatus = () => {
		if (differencePercent <= -20) return { text: 'Очень выгодно', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', icon: '✨' }
		if (differencePercent <= -10) return { text: 'Выгодно', color: 'text-green-300', bg: 'bg-green-500/15', border: 'border-green-500/40', icon: '👍' }
		if (differencePercent <= 10) return { text: 'Рыночная цена', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/40', icon: '⚖️' }
		if (differencePercent <= 30) return { text: 'Выше рынка', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', icon: '📈' }
		return { text: 'Значительно выше', color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/40', icon: '⚠️' }
	}

	const status = getPriceStatus()

	// Определяем источник данных
	const getSourceInfo = () => {
		if (currentTaskResponses && currentTaskResponses.count >= 2) {
			return {
				name: 'Отклики на эту задачу',
				description: `На основе ${currentTaskResponses.count} откликов`,
				icon: '🎯',
				isReliable: true
			}
		}
		
		switch (market.source) {
			case 'current_task_responses':
				return { name: 'Отклики на задачу', description: `${market.sampleSize} откликов`, icon: '🎯', isReliable: true }
			case 'similar_completed_tasks':
				return { name: 'Похожие задачи', description: `${market.sampleSize} завершённых`, icon: '📋', isReliable: market.isReliable }
			case 'category_responses':
				return { name: 'Отклики в категории', description: `${market.sampleSize} откликов`, icon: '📊', isReliable: market.isReliable }
			case 'category_completed_tasks':
				return { name: 'Задачи в категории', description: `${market.sampleSize} завершённых`, icon: '📁', isReliable: market.isReliable }
			case 'knowledge_base':
				return { name: 'Оценка', description: 'На основе типа задачи', icon: '📚', isReliable: false }
			default:
				return { name: 'Нет данных', description: '', icon: '❓', isReliable: false }
		}
	}

	const sourceInfo = getSourceInfo()

	// Качество данных
	const getQualityBadge = () => {
		if (!market.isReliable && !currentTaskResponses) {
			return { text: 'Приблизительно', color: 'text-orange-400', bg: 'bg-orange-500/10' }
		}
		if (market.dataQuality === 'high' || (currentTaskResponses && currentTaskResponses.count >= 5)) {
			return { text: 'Точные данные', color: 'text-green-400', bg: 'bg-green-500/10' }
		}
		if (market.dataQuality === 'medium' || (currentTaskResponses && currentTaskResponses.count >= 2)) {
			return { text: 'Хорошие данные', color: 'text-blue-400', bg: 'bg-blue-500/10' }
		}
		return { text: 'Мало данных', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
	}

	const qualityBadge = getQualityBadge()

	return (
		<div className={`mt-3 p-3 rounded-lg border ${status.border} ${status.bg}`}>
			{/* Заголовок со статусом */}
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-gray-400 flex items-center gap-1">
					{sourceInfo.icon} {sourceInfo.name}
				</span>
				<span className={`text-xs font-semibold ${status.color} flex items-center gap-1`}>
					{status.icon} {status.text}
				</span>
			</div>

			{/* Бейдж качества данных */}
			<div className="mb-2 flex items-center justify-between">
				<div className={`text-[10px] px-1.5 py-0.5 rounded ${qualityBadge.bg} ${qualityBadge.color}`}>
					{qualityBadge.text}
				</div>
				<div className="text-[10px] text-gray-500">
					{sourceInfo.description}
				</div>
			</div>

			{/* Основные цифры */}
			<div className="space-y-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">Цена отклика:</span>
					<span className="text-white font-semibold">{responsePrice.toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">
						{currentTaskResponses && currentTaskResponses.count >= 2 ? 'Медиана откликов:' : 'Рыночная цена:'}
					</span>
					<span className="text-emerald-300">{Math.round(comparePrice).toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs pt-1 border-t border-gray-700/50">
					<span className="text-gray-400">Разница:</span>
					<span className={`font-semibold ${difference >= 0 ? 'text-red-300' : 'text-green-300'}`}>
						{difference >= 0 ? '+' : ''}{Math.round(difference).toLocaleString('ru-RU')} ₽ 
						<span className="text-gray-500 ml-1">({differencePercent >= 0 ? '+' : ''}{Math.round(differencePercent)}%)</span>
					</span>
				</div>
			</div>

			{/* Статистика по откликам на текущую задачу */}
			{currentTaskResponses && currentTaskResponses.count >= 2 && (
				<div className="mt-3 pt-2 border-t border-gray-700/30">
					<div className="text-[10px] text-gray-400 mb-1.5">Другие отклики на задачу:</div>
					<div className="flex justify-between text-[10px]">
						<span className="text-gray-500">Диапазон:</span>
						<span className="text-gray-300">
							{currentTaskResponses.min.toLocaleString('ru-RU')} — {currentTaskResponses.max.toLocaleString('ru-RU')} ₽
						</span>
					</div>
					{Object.keys(currentTaskResponses.byLevel).length > 1 && (
						<div className="mt-1.5 space-y-0.5">
							{Object.entries(currentTaskResponses.byLevel)
								.sort(([a], [b]) => Number(b) - Number(a))
								.slice(0, 3)
								.map(([level, data]) => (
									<div key={level} className="flex justify-between text-[10px]">
										<span className="text-gray-500">Уровень {level}:</span>
										<span className="text-gray-400">
											~{data.avgPrice.toLocaleString('ru-RU')} ₽ ({data.count} откл.)
										</span>
									</div>
								))}
						</div>
					)}
				</div>
			)}

			{/* Статистика по категории (если нет откликов на текущую задачу) */}
			{!currentTaskResponses && categoryResponses && categoryResponses.count >= 5 && (
				<div className="mt-3 pt-2 border-t border-gray-700/30">
					<div className="text-[10px] text-gray-400 mb-1.5">Отклики в категории ({categoryResponses.count}):</div>
					<div className="flex justify-between text-[10px]">
						<span className="text-gray-500">25-75 перцентиль:</span>
						<span className="text-gray-300">
							{categoryResponses.p25.toLocaleString('ru-RU')} — {categoryResponses.p75.toLocaleString('ru-RU')} ₽
						</span>
					</div>
				</div>
			)}

			{/* Предупреждение о низком качестве данных */}
			{!sourceInfo.isReliable && (
				<div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-[10px] text-orange-300">
					⚠️ Данные приблизительные. Больше откликов — точнее статистика.
				</div>
			)}

			{/* Информация о типе задачи (если определён) */}
			{priceData.taskType && market.source === 'knowledge_base' && (
				<div className="mt-2 pt-2 border-t border-gray-700/30">
					<div className="text-[10px] text-gray-500">
						📚 Тип: {priceData.taskType.name}
					</div>
					<div className="text-[10px] text-gray-500">
						Типичный диапазон: {priceData.taskType.priceRange.min.toLocaleString('ru-RU')} — {priceData.taskType.priceRange.max.toLocaleString('ru-RU')} ₽
					</div>
				</div>
			)}
		</div>
	)
}
