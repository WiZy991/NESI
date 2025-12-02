'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

interface ExternalPriceData {
	source: string
	averagePrice: number
	minPrice: number
	maxPrice: number
	sampleSize: number
	isAdapted?: boolean // Флаг, что данные адаптированы под задачу
}

interface PriceComparisonWidgetProps {
	subcategoryId: string | null
	responsePrice: number | null
	taskTitle?: string | null
	taskDescription?: string | null
}

export default function PriceComparisonWidget({
	subcategoryId,
	responsePrice,
	taskTitle,
	taskDescription,
}: PriceComparisonWidgetProps) {
	const { token } = useUser()
	const [priceData, setPriceData] = useState<{
		internal: {
			overall?: {
				averagePrice: number
				minPrice: number
				maxPrice: number
				taskCount: number
			}
			bySubcategory?: any[]
		}
		external: ExternalPriceData[]
		comparison: {
			internalAverage: number
			externalAverage: number
		}
		analysis?: {
			complexity: string
			volume: string
			urgency: string
			technologies: string[]
			estimatedHours: number
			taskTypeId?: string
		} | null
		taskType?: {
			id: string
			name: string
			description: string
			typicalPrice: number
			priceRange: { min: number; max: number }
		} | null
		similarTasksCount?: number
		isAdaptive?: boolean
		priceMultiplier?: number
		source?: 'similar_tasks' | 'knowledge_base' | 'category_average' | 'category_average_adjusted' | 'completed_tasks_average'
		confidence?: number
		sampleSize?: number
	} | null>(null)
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
	}, [token, subcategoryId, taskTitle, taskDescription])

	if (loading || !priceData || !responsePrice) {
		return null
	}

	const externalAverage = priceData.comparison.externalAverage
	// Получаем внутреннюю среднюю из правильной структуры
	const internalAverage = priceData.internal?.overall?.averagePrice || priceData.comparison.internalAverage || 0
	
	// ПРАВИЛЬНЫЙ ПРИОРИТЕТ: Внутренняя средняя (реальные данные) > База знаний > Внешняя средняя
	const marketAverage = internalAverage > 0 
		? internalAverage 
		: priceData.taskType 
		? priceData.taskType.typicalPrice
		: externalAverage

	// Вычисляем разницу между ценой отклика и рыночной средней
	const difference = responsePrice - marketAverage
	const differencePercent = marketAverage > 0 ? (difference / marketAverage) * 100 : 0
	
	// Проверяем, соответствует ли цена диапазону из базы знаний
	let priceWarning: string | null = null
	if (priceData.taskType) {
		const { min, max } = priceData.taskType.priceRange
		if (responsePrice > max * 1.5) {
			priceWarning = `⚠️ Цена превышает типичный диапазон в ${((responsePrice / max) * 100).toFixed(0)}%`
		} else if (responsePrice < min * 0.5) {
			priceWarning = `ℹ️ Цена ниже типичного диапазона`
		}
	}

	// Определяем статус цены
	const getPriceStatus = () => {
		if (differencePercent <= -20) return { text: 'Очень выгодно', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' }
		if (differencePercent <= -10) return { text: 'Выгодно', color: 'text-green-300', bg: 'bg-green-500/15', border: 'border-green-500/40' }
		if (differencePercent <= 10) return { text: 'Справедливо', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/40' }
		if (differencePercent <= 30) return { text: 'Дорого', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' }
		return { text: 'Очень дорого', color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/40' }
	}

	const status = getPriceStatus()
	
	// Получаем confidence и sampleSize из данных
	const confidence = priceData.confidence || 0.5
	const sampleSize = priceData.sampleSize || 0
	const source = priceData.source || 'unknown'
	
	// Определяем уровень уверенности для отображения
	const getConfidenceLevel = () => {
		if (confidence >= 0.8) return { text: 'Высокая', color: 'text-green-400', bg: 'bg-green-500/10' }
		if (confidence >= 0.6) return { text: 'Средняя', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
		return { text: 'Низкая', color: 'text-orange-400', bg: 'bg-orange-500/10' }
	}
	
	const confidenceLevel = getConfidenceLevel()
	
	// Определяем название источника
	const getSourceName = () => {
		switch (source) {
			case 'similar_tasks': return 'Похожие задачи'
			case 'completed_tasks_average': return 'Завершенные задачи'
			case 'knowledge_base': return 'База знаний'
			case 'category_average_adjusted': return 'Средняя по категории (скорректировано)'
			case 'category_average': return 'Средняя по категории'
			default: return 'Общая статистика'
		}
	}

	return (
		<div className={`mt-3 p-3 rounded-lg border ${status.border} ${status.bg}`}>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-gray-400">Сравнение с рынком</span>
				<span className={`text-xs font-semibold ${status.color}`}>{status.text}</span>
			</div>
			
			{/* Индикатор уверенности и источника */}
			<div className="mb-2 flex items-center justify-between">
				<div className={`text-[10px] px-1.5 py-0.5 rounded ${confidenceLevel.bg} ${confidenceLevel.color}`}>
					Уверенность: {confidenceLevel.text} ({Math.round(confidence * 100)}%)
				</div>
				{sampleSize > 0 && (
					<div className="text-[10px] text-gray-500">
						На основе {sampleSize} {sampleSize === 1 ? 'задачи' : sampleSize < 5 ? 'задач' : 'задач'}
					</div>
				)}
			</div>
			
			{/* Источник данных */}
			<div className="mb-2 text-[10px] text-gray-500">
				Источник: {getSourceName()}
			</div>
			
			<div className="space-y-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">Цена отклика:</span>
					<span className="text-white font-semibold">{responsePrice.toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">Рыночная средняя:</span>
					<span className="text-emerald-300">{Math.round(marketAverage).toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs pt-1 border-t border-gray-700/50">
					<span className="text-gray-400">Разница:</span>
					<span className={`font-semibold ${difference >= 0 ? 'text-red-300' : 'text-green-300'}`}>
						{difference >= 0 ? '+' : ''}{Math.round(difference).toLocaleString('ru-RU')} ₽ 
						({differencePercent >= 0 ? '+' : ''}{Math.round(differencePercent)}%)
					</span>
				</div>
			</div>
			
			{/* Предупреждение о цене */}
			{priceWarning && (
				<div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] text-yellow-300">
					{priceWarning}
				</div>
			)}

			{/* Дополнительная информация об адаптации */}
			{priceData.isAdaptive && priceData.source !== 'category_average' && (
				<div className="mt-2 pt-1.5 border-t border-emerald-700/20">
					<div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
						<span>✨</span>
						<span>
							{priceData.source === 'similar_tasks' && priceData.similarTasksCount
								? `Найдено ${priceData.similarTasksCount} похожих задач`
								: priceData.source === 'knowledge_base' && priceData.taskType
								? `База знаний: ${priceData.taskType.name}`
								: priceData.priceMultiplier && priceData.priceMultiplier < 1
								? `Учтена простота (${(priceData.priceMultiplier * 100).toFixed(0)}%)`
								: priceData.priceMultiplier && priceData.priceMultiplier > 1
								? `Учтена сложность (×${priceData.priceMultiplier.toFixed(1)})`
								: 'Адаптировано под задачу'}
						</span>
					</div>
				</div>
			)}
			
			{/* Информация о типе задачи из базы знаний */}
			{priceData.taskType && (
				<div className="mt-2 pt-2 border-t border-emerald-700/30">
					<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
						<div className="text-xs font-medium text-emerald-300 mb-1.5 flex items-center gap-1.5">
							<span>📚</span>
							<span>{priceData.taskType.name}</span>
						</div>
						<div className="text-[10px] text-gray-400 mb-2">
							{priceData.taskType.description}
						</div>
						<div className="space-y-1 text-[10px]">
							<div className="flex justify-between items-center">
								<span className="text-gray-500">Типичная цена:</span>
								<span className="text-emerald-300 font-medium">
									{priceData.taskType.typicalPrice.toLocaleString('ru-RU')} ₽
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-gray-500">Диапазон:</span>
								<span className="text-gray-300">
									{priceData.taskType.priceRange.min.toLocaleString('ru-RU')} - {priceData.taskType.priceRange.max.toLocaleString('ru-RU')} ₽
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
			
			{/* Анализ задачи */}
			{priceData.analysis && (
				<div className="mt-3 pt-3 border-t border-emerald-700/30">
					<div className="text-xs font-medium text-emerald-300 mb-3 flex items-center gap-1.5">
						<span>📊</span>
						<span>Анализ задачи</span>
					</div>
					<div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2.5">
						<div className="flex justify-between items-center">
							<span className="text-xs text-gray-400">Сложность:</span>
							<span className="text-xs font-medium text-emerald-300">
								{priceData.analysis.complexity === 'simple' ? 'Простая' :
								 priceData.analysis.complexity === 'medium' ? 'Средняя' :
								 priceData.analysis.complexity === 'complex' ? 'Сложная' :
								 'Очень сложная'}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-xs text-gray-400">Объем:</span>
							<span className="text-xs font-medium text-emerald-300">
								{priceData.analysis.volume === 'small' ? 'Маленький' :
								 priceData.analysis.volume === 'medium' ? 'Средний' :
								 priceData.analysis.volume === 'large' ? 'Большой' :
								 'Очень большой'}
							</span>
						</div>
						{priceData.analysis.technologies.length > 0 && (
							<div className="flex justify-between items-start">
								<span className="text-xs text-gray-400">Технологии:</span>
								<span className="text-xs text-gray-300 text-right max-w-[60%]">
									{priceData.analysis.technologies.slice(0, 3).join(', ')}
									{priceData.analysis.technologies.length > 3 && '...'}
								</span>
							</div>
						)}
						<div className="flex justify-between items-center">
							<span className="text-xs text-gray-400">Оценка времени:</span>
							<span className="text-xs font-medium text-emerald-300">
								~{priceData.analysis.estimatedHours} ч.
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Данные из внешних источников */}
			{priceData.external.length > 0 && (
				<div className="mt-3 pt-2 border-t border-gray-700/50">
					<div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
						<span>Данные с других площадок:</span>
						{priceData.external.some(s => s.isAdapted) && (
							<span className="text-emerald-400 text-[10px]">✨ Адаптировано</span>
						)}
					</div>
					<div className="space-y-1">
						{priceData.external.slice(0, 3).map((source, idx) => (
							<div key={idx} className="flex justify-between items-center text-xs">
								<span className="text-gray-500 flex items-center gap-1">
									{source.source}
									{source.isAdapted && (
										<span className="text-emerald-400 text-[10px]" title="Цена адаптирована под вашу задачу">
											✨
										</span>
									)}
								</span>
								<span className="text-gray-300">
									{Math.round(source.averagePrice).toLocaleString('ru-RU')} ₽
									<span className="text-gray-500 ml-1">({source.sampleSize} задач)</span>
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

